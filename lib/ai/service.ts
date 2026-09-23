import { z } from 'zod'
import { callOpenAICompatible } from './providers/openai-compatible'
import { generatedLessonSchema, aiFeedbackSchema } from './schemas'
import { buildLessonPrompt, buildEvaluatePrompt } from './prompts'
import type { AIService, GeneratedLesson, AIFeedback } from './types'

// Nyalakan kalau kosakata hasil generate terasa kurang natural.
// Butuh waktu lebih lama, jadi timeout dan maxDuration harus dinaikkan juga.
const LESSON_THINKING = false

const PROVIDERS = {
  zai: {
    baseURL: 'https://api.z.ai/api/paas/v4',
    key: () => process.env.ZAI_API_KEY,
    model: 'glm-4.5-flash',
  },
  claude: {
    baseURL: 'https://openrouter.ai/api/v1',
    key: () => process.env.OPENROUTER_API_KEY,
    model: 'anthropic/claude-haiku-4.5',
  },
  groq: {
    baseURL: 'https://api.groq.com/openai/v1',
    key: () => process.env.GROQ_API_KEY,
    model: 'qwen/qwen3.8-27b',
  },
  cloudflare: {
    baseURL:
      'https://api.cloudflare.com/client/v4/accounts/0b3df7f348932b9e9b8d84fd33f8a45e/ai/v1',
    key: () => process.env.CLOUDFLARE_AI_KEY,
    model: '@cf/google/gemma-3-12b-it', // cek nama model persis di dashboard Cloudflare
  },
}
type ProviderName = keyof typeof PROVIDERS

function parseAndValidate<T>(raw: string, schema: z.ZodType<T>, context: string): T {
  let parsed: unknown

  try {
    parsed = JSON.parse(raw)
  } catch {
    throw new Error(`[${context}] AI mengembalikan JSON yang tidak valid: ${raw.slice(0, 200)}`)
  }

  const result = schema.safeParse(parsed)

  if (!result.success) {
    throw new Error(
      `[${context}] Struktur JSON dari AI tidak sesuai schema: ${result.error.message}. Raw: ${raw.slice(0, 200)}`
    )
  }

  return result.data
}

// Panggil AI + validasi, ulangi kalau gagal (JSON rusak, schema tidak cocok, atau error jaringan)
async function callAndValidate<T>(opts: {
  provider: ProviderName
  prompt: string
  schema: z.ZodType<T>
  context: string
  attempts: number
  maxTokens: number
  timeoutMs: number
  disableReasoning: boolean
}): Promise<T> {
  const p = PROVIDERS[opts.provider]
  const apiKey = p.key()
  if (!apiKey) throw new Error(`API key untuk provider "${opts.provider}" belum di-set`)

  let lastError: unknown

  for (let i = 1; i <= opts.attempts; i++) {
    try {
      const raw = await callOpenAICompatible({
        baseURL: p.baseURL,
        apiKey,
        model: p.model,
        prompt: opts.prompt,
        maxTokens: opts.maxTokens,
        timeoutMs: opts.timeoutMs,
        disableReasoning: opts.disableReasoning,
      })
      return parseAndValidate(raw, opts.schema, opts.context)
    } catch (err) {
      lastError = err
      console.error(
        `[${opts.context}] percobaan ${i}/${opts.attempts} gagal:`,
        err instanceof Error ? err.message : err
      )
    }
  }

  throw lastError
}

async function generateLesson(topic: string, difficulty: string): Promise<GeneratedLesson> {
  return callAndValidate({
    provider: 'zai',
    prompt: buildLessonPrompt(topic, difficulty),
    schema: generatedLessonSchema,
    context: 'generateLesson via z.ai',
    attempts: 2,
    maxTokens: LESSON_THINKING ? 8000 : 4000,
    timeoutMs: LESSON_THINKING ? 90_000 : 25_000,
    disableReasoning: !LESSON_THINKING,
  })
}

async function evaluateAnswer(
  question: string,
  expectedAnswer: string,
  userAnswer: string,
  inputType: 'text' | 'voice' = 'text'
): Promise<AIFeedback> {
  return callAndValidate({
    provider: 'groq', // ganti ke 'claude' atau 'cloudflare' untuk dibandingkan
    prompt: buildEvaluatePrompt(question, expectedAnswer, userAnswer, inputType),
    schema: aiFeedbackSchema,
    context: 'evaluateAnswer via groq',
    attempts: 2,
    maxTokens: 800,
    timeoutMs: 15_000,
    disableReasoning: false,
  })
}

export const aiService: AIService = {
  generateLesson,
  evaluateAnswer,
}