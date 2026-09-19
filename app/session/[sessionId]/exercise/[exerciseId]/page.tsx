import { notFound } from 'next/navigation'
import { createSupabaseServerClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'

export default async function ExercisePage({
  params,
}: {
  params: Promise<{ sessionId: string; exerciseId: string }>
}) {
  const { sessionId, exerciseId } = await params
  const supabase = createSupabaseServerClient()

  const { data: exercise, error } = await supabase
    .from('exercises')
    .select('*')
    .eq('id', exerciseId)
    .single()

  if (error || !exercise) {
    notFound()
  }

  async function submitAnswer(formData: FormData) {
    'use server'

    const userAnswer = formData.get('answer') as string
    const supabase = createSupabaseServerClient()

    const isCorrect = userAnswer.trim().toLowerCase() === exercise!.expected_answer.trim().toLowerCase()

    const { data: attempt, error: attemptError } = await supabase
  .from('attempts')
  .insert({
    exercise_id: exerciseId,
    session_id: sessionId,
    user_answer: userAnswer,
    input_type: 'text',
    is_correct: isCorrect,
    ai_feedback: {
      is_correct: isCorrect,
      user_answer: userAnswer,
      corrected_answer: exercise!.expected_answer,
      mistakes: [],
      alternative_answers: [],
      explanation: isCorrect
        ? 'Jawaban benar!'
        : `Jawaban yang benar adalah "${exercise!.expected_answer}"`,
    },
  })
      .select('id')
      .single()

    if (attemptError || !attempt) {
      throw new Error('Gagal menyimpan jawaban')
    }

    redirect(`/session/${sessionId}/exercise/${exerciseId}/feedback?attemptId=${attempt.id}`)
  }

  return (
    <div>
      <p>Session: {sessionId}</p>
      <h1>{exercise.question}</h1>

      <form action={submitAnswer}>
        <input type="text" name="answer" required placeholder="Ketik jawabanmu..." />
        <button type="button" disabled>
          🎤 (Segera Hadir)
        </button>
        <button type="submit">Submit Jawaban</button>
      </form>
    </div>
  )
}