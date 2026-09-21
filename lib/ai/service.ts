import { z } from 'zod'
import { callOpenAICompatible } from './providers/openai-compatible'
import { generatedLessonSchema, aiFeedbackSchema } from './schemas'
import { buildLessonPrompt, buildEvaluatePrompt } from './prompts'
import type { AIService, GeneratedLesson, AIFeedback } from './types'

const OPENROUTER_URL = 'https://openrouter.ai/api/v1'
const ZAI_URL = 'https://api.z.ai/api/paas/v4'

const OPENROUTER_KEY = process.env.OPENROUTER_API_KEY!
const ZAI_KEY = process.env.ZAI_API_KEY

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
  baseURL: string
  apiKey: string
  model: string
  prompt: string
  schema: z.ZodType<T>
  context: string
  attempts: number
  maxTokens?: number
  timeoutMs?: number
  disableReasoning?: boolean
}): Promise<T> {
  let lastError: unknown

  for (let i = 1; i <= opts.attempts; i++) {
    try {
      const raw = await callOpenAICompatible({
        baseURL: opts.baseURL,
        apiKey: opts.apiKey,
        model: opts.model,
        prompt: opts.prompt,
        maxTokens: opts.maxTokens,
        timeoutMs: opts.timeoutMs,
        disableReasoning: opts.disableReasoning,
      })
      return parseAndValidate(raw, opts.schema, opts.context)
    } catch (err) {
      lastError = err
      console.error(`[${opts.context}] percobaan ${i}/${opts.attempts} gagal:`, err)
    }
  }

  throw lastError
}

async function generateLessonWithFallback(
  topic: string,
  difficulty: string
): Promise<GeneratedLesson> {
  const prompt = buildLessonPrompt(topic, difficulty)

  if (!ZAI_KEY) {
    throw new Error('z.ai gagal: ZAI_API_KEY belum di-set')
  }

  try {
    return await callAndValidate({
      baseURL: ZAI_URL,
      apiKey: ZAI_KEY,
      model: 'glm-4.5-flash',
      prompt,
      schema: generatedLessonSchema,
      context: 'generateLesson via z.ai fallback',
      attempts: 1,
      maxTokens: 4000,
      timeoutMs: 20_000,
      disableReasoning: true,
      
    })
  } catch {
    console.error('OpenRouter GLM gagal, fallback ke z.ai langsung')

    return await callAndValidate({
      baseURL: ZAI_URL,
      apiKey: ZAI_KEY,
      model: 'glm-4.5-flash',
      prompt,
      schema: generatedLessonSchema,
      context: 'generateLesson via z.ai fallback',
      attempts: 1,
maxTokens: 8000,
timeoutMs: 90_000,
disableReasoning: false,
    })
  }
}

async function evaluateAnswerWithClaude(
  question: string,
  expectedAnswer: string,
  userAnswer: string,
  inputType: 'text' | 'voice' = 'text'
): Promise<AIFeedback> {
  return callAndValidate({
    baseURL: OPENROUTER_URL,
    apiKey: OPENROUTER_KEY,
    model: 'anthropic/claude-haiku-4.5',
    prompt: buildEvaluatePrompt(question, expectedAnswer, userAnswer, inputType),
    schema: aiFeedbackSchema,
    context: 'evaluateAnswer via Claude',
    attempts: 2,
    timeoutMs: 12_000,
  })
}

export const aiService: AIService = {
  generateLesson: generateLessonWithFallback,
  evaluateAnswer: evaluateAnswerWithClaude,
}