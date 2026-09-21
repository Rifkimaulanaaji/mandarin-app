import OpenAI from 'openai'

interface CallOptions {
  baseURL: string
  apiKey: string
  model: string
  prompt: string
  maxTokens?: number
  timeoutMs?: number
  // Matikan mode "thinking" untuk model reasoning (GLM). Untuk tugas sederhana
  // seperti menyusun kosakata, ini membuat respons lebih cepat dan murah.
  disableReasoning?: boolean
}

export async function callOpenAICompatible({
  baseURL,
  apiKey,
  model,
  prompt,
  maxTokens = 1500,
  timeoutMs = 20_000,
  disableReasoning = false,
}: CallOptions): Promise<string> {
  // maxRetries: 0 → retry ditangani service.ts, bukan SDK (default SDK: 2x retry)
  const client = new OpenAI({ apiKey, baseURL, timeout: timeoutMs, maxRetries: 0 })

  // Parameter khusus provider, bukan bagian tipe resmi SDK
  const extraBody: Record<string, unknown> = {}
  if (disableReasoning) {
    if (baseURL.includes('openrouter.ai')) {
      extraBody.reasoning = { enabled: false }
    } else if (baseURL.includes('z.ai')) {
      extraBody.thinking = { type: 'disabled' }
    }
  }

  const response = await client.chat.completions.create({
    model,
    messages: [{ role: 'user', content: prompt }],
    max_tokens: maxTokens,
    ...extraBody,
  } as OpenAI.Chat.Completions.ChatCompletionCreateParamsNonStreaming)

  const choice = response.choices[0]
  const content = choice?.message?.content

  if (!content) {
    // Ringkas saja, jangan dump seluruh response ke log
    throw new Error(
      `AI provider returned empty content (finish_reason: ${choice?.finish_reason ?? 'unknown'}, model: ${model})`
    )
  }

  return content.replace(/^```json\s*/i, '').replace(/```\s*$/i, '').trim()
}