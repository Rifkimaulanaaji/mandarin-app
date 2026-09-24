import { redirect, notFound } from 'next/navigation'
import { createSupabaseServerClient } from '@/lib/supabase/server'

export default async function StartSessionPage({
  params,
}: {
  params: Promise<{ topicId: string }>
}) {
  const { topicId } = await params
  const supabase = createSupabaseServerClient()

  // 1. Cek topic-nya ada, sekalian ambil nama buat snapshot
  const { data: topic, error: topicError } = await supabase
    .from('topics')
    .select('id, name')
    .eq('id', topicId)
    .single()

  if (topicError || !topic) {
    notFound()
  }

  const { data: firstExercise, error: exerciseError } = await supabase
    .from('exercises')
    .select('id')
    .eq('topic_id', topicId)
    .order('created_at', { ascending: true })
    .order('id', { ascending: true })
    .limit(1)
    .single()

  if (exerciseError || !firstExercise) {
    return <div>Topik ini belum punya soal latihan.</div>
  }

  // 3. Bikin session baru, simpan snapshot nama topik
  const { data: session, error: sessionError } = await supabase
    .from('sessions')
    .insert({ topic_id: topicId, topic_name_snapshot: topic.name })
    .select('id')
    .single()

  if (sessionError || !session) {
    return <div>Gagal memulai sesi: {sessionError?.message}</div>
  }

  // 4. Redirect ke exercise pertama
  redirect(`/session/${session.id}/exercise/${firstExercise.id}`)
}