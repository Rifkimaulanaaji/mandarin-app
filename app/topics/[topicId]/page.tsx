import { createSupabaseServerClient } from '@/lib/supabase/server'
import { notFound } from 'next/navigation'
import LearningMaterialClient from './LearningMaterialClient'

export default async function LearningMaterialPage({
  params,
}: {
  params: Promise<{ topicId: string }>
}) {
  const { topicId } = await params
  const supabase = createSupabaseServerClient()

  const { data: topic, error: topicError } = await supabase
    .from('topics')
    .select('*')
    .eq('id', topicId)
    .single()

  if (topicError || !topic) {
    notFound()
  }

  const { data: vocabulary, error: vocabError } = await supabase
    .from('vocabulary')
    .select('*')
    .eq('topic_id', topicId)
    .order('created_at', { ascending: true })

  if (vocabError) {
    return <div className="p-4 text-error">Gagal memuat kosakata: {vocabError.message}</div>
  }

  return (
    <LearningMaterialClient
      topicName={topic.name}
      topicId={topicId}
      vocabulary={vocabulary ?? []}
    />
  )
}