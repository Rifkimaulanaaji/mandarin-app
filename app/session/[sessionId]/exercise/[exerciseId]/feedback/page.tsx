import Link from 'next/link'
import { notFound } from 'next/navigation'
import { createSupabaseServerClient } from '@/lib/supabase/server'
import type { Attempt } from '@/lib/types/db-helpers'
import AudioButton from '@/components/AudioButton'
import CharacterBubble from '@/components/CharacterBubble'

export default async function FeedbackPage({
  params,
  searchParams,
}: {
  params: Promise<{ sessionId: string; exerciseId: string }>
  searchParams: Promise<{ attemptId?: string }>
}) {
  const { sessionId, exerciseId } = await params
  const { attemptId } = await searchParams

  if (!attemptId) {
    notFound()
  }

  const supabase = createSupabaseServerClient()

  const { data: attempt, error } = await supabase
    .from('attempts')
    .select('*')
    .eq('id', attemptId)
    .eq('session_id', sessionId)
    .eq('exercise_id', exerciseId)
    .single()

  if (error || !attempt) {
    notFound()
  }

  const feedback = (attempt as Attempt).ai_feedback

  const { data: currentExercise } = await supabase
    .from('exercises')
    .select('topic_id, created_at')
    .eq('id', attempt.exercise_id)
    .single()

  let nextExerciseId: string | null = null

  if (currentExercise) {
    const { data: allExercises } = await supabase
      .from('exercises')
      .select('id')
      .eq('topic_id', currentExercise.topic_id)
      .order('created_at', { ascending: true })
      .order('id', { ascending: true })

    if (allExercises) {
      const currentIndex = allExercises.findIndex((e) => e.id === attempt.exercise_id)
      if (currentIndex !== -1 && currentIndex < allExercises.length - 1) {
        nextExerciseId = allExercises[currentIndex + 1].id
      }
    }
  }

  return (
    <div className="flex-1 flex flex-col items-center justify-center bg-bg px-4 py-8 gap-6">
      <div className="flex flex-col items-center gap-6 w-full max-w-sm">
        <CharacterBubble expression={attempt.is_correct ? 'happy' : 'sad'}>
          <p className="flex items-center justify-center gap-2 font-medium text-center">
            <span
              className={`inline-block w-2.5 h-2.5 rounded-full ${attempt.is_correct ? 'bg-success' : 'bg-error'
                }`}
              aria-hidden
            />
            {attempt.is_correct ? 'Benar!' : 'Belum Tepat'}
          </p>

          <p className="mt-2 text-sm text-text-muted">
            Jawabanmu: <span className="text-text">{attempt.user_answer}</span>
          </p>
          <p className="mt-1 text-sm text-text-muted flex items-center gap-1.5">
            Jawaban yang benar:{' '}
            <span className="text-text">
              {feedback?.corrected_answer}
              {feedback?.corrected_answer_pinyin && ` (${feedback.corrected_answer_pinyin})`}
            </span>
            {feedback?.corrected_answer && <AudioButton text={feedback.corrected_answer} />}
          </p>
          <p className="mt-2 text-sm">{feedback?.explanation}</p>

          {feedback?.mistakes && feedback.mistakes.length > 0 && (
            <ul className="mt-3 text-sm text-text-muted space-y-1 text-left">
              {feedback.mistakes.map((m, i) => (
                <li key={i}>
                  <span className="text-text">{m.part}</span>: {m.problem}
                </li>
              ))}
            </ul>
          )}

          {feedback?.alternative_answers && feedback.alternative_answers.length > 0 && (
            <p className="mt-3 text-sm text-text-muted">
              Alternatif: {feedback.alternative_answers.join(', ')}
            </p>
          )}
        </CharacterBubble>

        <Link
          href={
            nextExerciseId
              ? `/session/${sessionId}/exercise/${nextExerciseId}`
              : `/session/${sessionId}/result`
          }
          className="w-full rounded-xl bg-accent text-accent-text font-medium py-3 text-center"
        >
          {nextExerciseId ? 'Soal Berikutnya' : 'Selesai — Lihat Hasil'}
        </Link>
      </div>
    </div>
  )
}