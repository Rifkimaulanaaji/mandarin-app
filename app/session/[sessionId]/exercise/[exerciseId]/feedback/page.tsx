import Link from 'next/link'
import { notFound } from 'next/navigation'
import { createSupabaseServerClient } from '@/lib/supabase/server'
import type { Attempt } from '@/lib/types/db-helpers'
import AudioButton from '@/components/AudioButton'

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

  // Filter session_id & exercise_id: attemptId di URL harus cocok dengan halaman ini
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

  // Cari exercise berikutnya di topic yang sama
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
    <div>
      <h1>{attempt.is_correct ? '✅ Benar!' : '❌ Belum Tepat'}</h1>

      <p>Jawabanmu: {attempt.user_answer}</p>
      <p>
        Jawaban yang benar: {feedback?.corrected_answer}{' '}
        {feedback?.corrected_answer && <AudioButton text={feedback.corrected_answer} />}
      </p>
      <p>{feedback?.explanation}</p>

      {feedback?.mistakes && feedback.mistakes.length > 0 && (
        <section>
          <h2>Yang perlu diperbaiki</h2>
          <ul>
            {feedback.mistakes.map((m, i) => (
              <li key={i}>
                <strong>{m.part}</strong>: {m.problem}
                <br />
                <small>{m.explanation}</small>
              </li>
            ))}
          </ul>
        </section>
      )}

      {feedback?.alternative_answers && feedback.alternative_answers.length > 0 && (
        <section>
          <h2>Jawaban lain yang juga bisa</h2>
          <ul>
            {feedback.alternative_answers.map((alt, i) => (
              <li key={i}>{alt}</li>
            ))}
          </ul>
        </section>
      )}

      {nextExerciseId ? (
        <Link href={`/session/${sessionId}/exercise/${nextExerciseId}`}>
          Soal Berikutnya
        </Link>
      ) : (
        <Link href={`/session/${sessionId}/result`}>Selesai — Lihat Hasil</Link>
      )}
    </div>
  )
}