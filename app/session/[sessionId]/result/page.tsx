import Link from 'next/link'
import { notFound } from 'next/navigation'
import { createSupabaseServerClient } from '@/lib/supabase/server'

export default async function SessionResultPage({
  params,
}: {
  params: Promise<{ sessionId: string }>
}) {
  const { sessionId } = await params
  const supabase = createSupabaseServerClient()

  const { data: session, error: sessionError } = await supabase
    .from('sessions')
    .select('*, topics(name)')
    .eq('id', sessionId)
    .single()

  if (sessionError || !session) {
    notFound()
  }

  // Ambil attempt HANYA untuk session ini
  const { data: attempts } = await supabase
    .from('attempts')
    .select('is_correct')
    .eq('session_id', sessionId)

  const total = attempts?.length ?? 0
  const correct = attempts?.filter((a) => a.is_correct).length ?? 0
  const score = total > 0 ? Math.round((correct / total) * 100) : 0

  // Tandai session selesai (kalau belum)
  if (!session.completed_at) {
    await supabase
      .from('sessions')
      .update({ completed_at: new Date().toISOString(), score })
      .eq('id', sessionId)
  }

  const topicName = (session as { topics?: { name?: string } }).topics?.name ?? 'Topik'
  const emoji = score >= 80 ? '🎉' : score >= 50 ? '👍' : '💪'
  const message =
    score >= 80
      ? 'Mantap, kamu sudah cukup kuasai topik ini!'
      : score >= 50
        ? 'Lumayan, coba ulangi lagi nanti biar makin lancar.'
        : 'Belum lancar, gapapa — coba lagi ya!'

  return (
    <div className="flex-1 flex flex-col items-center justify-center bg-bg px-4 py-8 gap-6">
      <div className="w-full max-w-sm rounded-2xl border border-border bg-surface p-8 text-center">
        <p className="text-4xl">{emoji}</p>
        <h1 className="text-lg font-semibold text-text mt-2">Sesi Selesai!</h1>
        <p className="text-sm text-text-muted mt-1">{topicName}</p>

        <p className="text-5xl font-bold text-accent mt-6">{score}%</p>
        <p className="text-sm text-text-muted mt-2">
          Benar {correct} dari {total} soal
        </p>

        <p className="text-sm text-text mt-4">{message}</p>
      </div>

      <div className="w-full max-w-sm flex flex-col gap-3">
        <Link
          href="/topics"
          className="rounded-xl bg-accent text-accent-text font-medium py-3 text-center"
        >
          Pilih Topik Lain
        </Link>
        <Link
          href="/"
          className="rounded-xl border border-border text-text py-3 text-center"
        >
          Kembali ke Home
        </Link>
      </div>
    </div>
  )
}