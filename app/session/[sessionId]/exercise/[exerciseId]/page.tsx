import { notFound, redirect } from 'next/navigation'
import { createSupabaseServerClient } from '@/lib/supabase/server'
import { aiService } from '@/lib/ai/service'
import { isExactMatch } from '@/lib/answer-match'
import type { AIFeedback } from '@/lib/ai/types'
import AnswerField from '@/components/AnswerField'
import SubmitButton from './SubmitButton'

// Server action ikut batas durasi route ini; panggilan AI bisa lambat
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

  // Soal ini sudah pernah dijawab di sesi ini (mis. user tekan back)
  // → arahkan ke feedback-nya, jangan biarkan jawab dua kali
  const existingId = await findExistingAttemptId(sessionId, exerciseId)
  if (existingId) {
    redirect(`/session/${sessionId}/exercise/${exerciseId}/feedback?attemptId=${existingId}`)
  }

  const question = exercise.question
  const expectedAnswer = exercise.expected_answer

  async function submitAnswer(formData: FormData) {
    'use server'

    const raw = formData.get('answer')
    const userAnswer = typeof raw === 'string' ? raw.trim().slice(0, MAX_ANSWER_LENGTH) : ''
    const inputType = formData.get('input_type') === 'voice' ? 'voice' : 'text'

    const backUrl = (extra: Record<string, string>) =>
      `/session/${sessionId}/exercise/${exerciseId}?${new URLSearchParams(extra).toString()}`

    if (!userAnswer) {
      redirect(backUrl({ error: 'empty' }))
    }

    // Guard double-submit: kalau sudah ada attempt, pakai yang itu
    const already = await findExistingAttemptId(sessionId, exerciseId)
    if (already) {
      redirect(`/session/${sessionId}/exercise/${exerciseId}/feedback?attemptId=${already}`)
    }

    let feedback: AIFeedback

    if (isExactMatch(userAnswer, expectedAnswer)) {
      // Persis sama dengan referensi → pasti benar, tidak perlu panggil AI
      feedback = {
        is_correct: true,
        user_answer: userAnswer,
        corrected_answer: expectedAnswer,
        mistakes: [],
        alternative_answers: [],
        explanation: 'Jawabanmu tepat!',
      }
    } else {
      try {
        const result = await aiService.evaluateAnswer(
          question,
          expectedAnswer,
          userAnswer,
          inputType
        )
        // Override: teks jawaban user harus persis input asli, bukan versi AI
        feedback = { ...result, user_answer: userAnswer }
      } catch (err) {
        // AI gagal ≠ jawaban salah. Jangan simpan attempt;
        // kembalikan ke form dengan jawaban tetap terisi
        console.error('evaluateAnswer gagal:', err)
        redirect(backUrl({ error: 'ai', draft: userAnswer }))
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
      })
      .select('id')
      .single()

    if (attemptError || !attempt) {
      // 23505 = unique violation: request lain menang race, pakai attempt itu
      if (attemptError?.code === '23505') {
        const winner = await findExistingAttemptId(sessionId, exerciseId)
        if (winner) {
          redirect(`/session/${sessionId}/exercise/${exerciseId}/feedback?attemptId=${winner}`)
        }
      }
      throw new Error('Gagal menyimpan jawaban')
    }

    redirect(`/session/${sessionId}/exercise/${exerciseId}/feedback?attemptId=${attempt.id}`)
  }

  return (
    <div>
      <h1>{exercise.question}</h1>

      {errorParam === 'ai' && (
        <p role="alert">
          Sistem koreksi sedang bermasalah. Jawabanmu belum tersimpan, coba submit lagi.
        </p>
      )}
      {errorParam === 'empty' && <p role="alert">Jawaban tidak boleh kosong.</p>}

      <form action={submitAnswer}>
        <AnswerField defaultValue={draft ?? ''} maxLength={MAX_ANSWER_LENGTH} />
        <SubmitButton />
      </form>
    </div>
  )
}