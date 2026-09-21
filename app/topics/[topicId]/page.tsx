import Link from 'next/link'
import { createSupabaseServerClient } from '@/lib/supabase/server'
import { notFound } from 'next/navigation'
import AudioButton from '@/components/AudioButton'

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
    return <div>Gagal memuat kosakata: {vocabError.message}</div>
  }

  return (
    <div>
      <h1>{topic.name}</h1>
      <p>{topic.description}</p>

      <h2>Kosakata</h2>
      <ul>
        {vocabulary?.map((v) => (
          <li key={v.id}>
            <strong>{v.hanzi}</strong> ({v.pinyin}) <AudioButton text={v.hanzi} /> — {v.meaning}
            {v.example_sentence && (
              <p>
                {v.example_sentence} <AudioButton text={v.example_sentence} />
                {v.example_pinyin && ` (${v.example_pinyin})`}
                {v.example_translation && (
                  <>
                    <br />
                    <small>{v.example_translation}</small>
                  </>
                )}
              </p>
            )}
          </li>
        ))}
      </ul>

      <Link href={`/topics/${topicId}/session`}>Mulai Latihan</Link>
    </div>
  )
}