import { notFound, redirect } from 'next/navigation'
import { createSupabaseServerClient } from '@/lib/supabase/server'
import { aiService } from '@/lib/ai/service'
import { isExactMatch } from '@/lib/answer-match'
import { checkAndIncrement, limitMessage } from '@/lib/rate-limit'
import type { AIFeedback } from '@/lib/ai/types'
import ExerciseForm, { type SubmitResult } from '@/components/ExerciseForm'

export const maxDuration = 30

const MAX_ANSWER_LENGTH = 300

async function findExistingAttemptId(
  sessionId: string,
  exerciseId: string
): Promise<string | null> {
  const supabase = createSupabaseServerClient()
  const { data } = await supabase
    .from('attempts')
    .select('id')
    .eq('session_id', sessionId)
    .eq('exercise_id', exerciseId)
    .order('created_at', { ascending: true })
    .limit(1)

  return data?.[0]?.id ?? null
}

async function findNextExerciseUrl(sessionId: string, topicId: string, currentExerciseId: string): Promise<string> {
  const supabase = createSupabaseServerClient()
  const { data: all } = await supabase
    .from('exercises')
    .select('id')
    .eq('topic_id', topicId)
    .order('created_at', { ascending: true })
    .order('id', { ascending: true })

  const idx = all?.findIndex((e) => e.id === currentExerciseId) ?? -1
  const next = idx !== -1 && all && idx < all.length - 1 ? all[idx + 1].id : null

  return next
    ? `/session/${sessionId}/exercise/${next}`
    : `/session/${sessionId}/result`
}

export default async function ExercisePage({
  params,
  searchParams,
}: {
  params: Promise<{ sessionId: string; exerciseId: string }>
  searchParams: Promise<{ error?: string; draft?: string }>
}) {
  const { sessionId, exerciseId } = await params
  const { error: errorParam, draft } = await searchParams
  const supabase = createSupabaseServerClient()

  const { data: exercise, error } = await supabase
    .from('exercises')
    .select('*')
    .eq('id', exerciseId)
    .single()

  if (error || !exercise) {
    notFound()
  }

  const existingId = await findExistingAttemptId(sessionId, exerciseId)
  if (existingId) {
    redirect(`/session/${sessionId}/exercise/${exerciseId}/feedback?attemptId=${existingId}`)
  }

  const question = exercise.question
  const expectedAnswer = exercise.expected_answer
  const topicId = exercise.topic_id
  const metadata = exercise.metadata as { hanzi?: string; pinyin?: string | null } | null

  async function submitAnswer(
    _prevState: SubmitResult | null,
    formData: FormData
  ): Promise<SubmitResult> {
    'use server'

    const raw = formData.get('answer')
    const userAnswer = typeof raw === 'string' ? raw.trim().slice(0, MAX_ANSWER_LENGTH) : ''
    const inputType = formData.get('input_type') === 'voice' ? 'voice' : 'text'

    if (!userAnswer) {
      return { kind: 'error', message: 'Jawaban tidak boleh kosong.', draft: '' }
    }

    const already = await findExistingAttemptId(sessionId, exerciseId)
    if (already) {
      return {
        kind: 'duplicate',
        nextUrl: `/session/${sessionId}/exercise/${exerciseId}/feedback?attemptId=${already}`,
      }
    }

    let feedback: AIFeedback
    let isExact = false

    if (isExactMatch(userAnswer, expectedAnswer)) {
      isExact = true
      feedback = {
        is_correct: true,
        user_answer: userAnswer,
        corrected_answer: expectedAnswer,
        corrected_answer_pinyin: metadata?.pinyin ?? null,
        mistakes: [],
        alternative_answers: [],
        explanation: 'Jawabanmu tepat!',
      }
    } else {
      const allowed = await checkAndIncrement('evaluate')
      if (!allowed) {
        return { kind: 'error', message: limitMessage('evaluate'), draft: userAnswer }
      }

      try {
        const result = await aiService.evaluateAnswer(question, expectedAnswer, userAnswer, inputType)
        feedback = { ...result, user_answer: userAnswer }
      } catch (err) {
        console.error('evaluateAnswer gagal:', err)
        return {
          kind: 'error',
          message: 'Sistem koreksi sedang bermasalah. Jawabanmu belum tersimpan, coba submit lagi.',
          draft: userAnswer,
        }
      }
    }

    const supabase = createSupabaseServerClient()
    const { data: attempt, error: attemptError } = await supabase
      .from('attempts')
      .insert({
        exercise_id: exerciseId,
        session_id: sessionId,
        user_answer: userAnswer,
        input_type: inputType,
        is_correct: feedback.is_correct,
        ai_feedback: feedback,
        question_snapshot: question,
      })
      .select('id')
      .single()

    if (attemptError || !attempt) {
      if (attemptError?.code === '23505') {
        const winner = await findExistingAttemptId(sessionId, exerciseId)
        if (winner) {
          return {
            kind: 'duplicate',
            nextUrl: `/session/${sessionId}/exercise/${exerciseId}/feedback?attemptId=${winner}`,
          }
        }
      }
      return { kind: 'error', message: 'Gagal menyimpan jawaban. Coba lagi.', draft: userAnswer }
    }

    const nextUrl = await findNextExerciseUrl(sessionId, topicId, exerciseId)

    return isExact
      ? { kind: 'exact', nextUrl }
      : { kind: 'ai', feedback, nextUrl }
  }

  return (
    <div className="flex-1 flex flex-col items-center justify-center bg-bg px-4 py-8 gap-6">
      <ExerciseForm
        action={submitAnswer}
        question={question}
        keyterm={metadata?.hanzi}
        maxLength={MAX_ANSWER_LENGTH}
        initialError={errorParam === 'ai' ? 'Sistem koreksi sedang bermasalah. Coba submit lagi.' : errorParam === 'empty' ? 'Jawaban tidak boleh kosong.' : null}
        initialDraft={draft ?? ''}
      />
    </div>
  )
}