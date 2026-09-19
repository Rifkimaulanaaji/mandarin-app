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

  return (
    <div>
      <h1>Sesi Selesai!</h1>
      <p>Topik: {(session as any).topics?.name}</p>
      <p>
        Benar: {correct} dari {total} soal
      </p>
      <p>Skor: {score}%</p>

      <Link href="/topics">Pilih Topik Lain</Link>
      <br />
      <Link href="/">Kembali ke Home</Link>
    </div>
  )
}