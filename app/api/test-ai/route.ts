import { NextResponse } from 'next/server'
import { aiService } from '@/lib/ai/service'

export async function GET() {
  const results: {
    generateLesson: { ok: boolean; data?: unknown; error?: string }
    evaluateAnswer: { ok: boolean; data?: unknown; error?: string }
  } = {
    generateLesson: { ok: false },
    evaluateAnswer: { ok: false },
  }

  try {
    const lesson = await aiService.generateLesson('belanja', 'intermediate')
    results.generateLesson = { ok: true, data: lesson }
  } catch (err) {
    results.generateLesson = {
      ok: false,
      error: err instanceof Error ? err.message : String(err),
    }
  }

  try {
    const feedback = await aiService.evaluateAnswer(
      'Terjemahkan: "Ayo makan"',
      '吃飯吧。',
      '去吃飯'
    )
    results.evaluateAnswer = { ok: true, data: feedback }
  } catch (err) {
    results.evaluateAnswer = {
      ok: false,
      error: err instanceof Error ? err.message : String(err),
    }
  }

  return NextResponse.json(results)
}