import Link from 'next/link'
import { redirect } from 'next/navigation'
import { createSupabaseServerClient } from '@/lib/supabase/server'
import { aiService } from '@/lib/ai/service'
import { buildExercises } from '@/lib/exercises/build'
import type { GeneratedLesson } from '@/lib/ai/types'
import CreateTopicForm from '@/components/CreateTopicForm'

// GLM bisa lambat, dan kalau OpenRouter gagal masih ada fallback ke z.ai
export const maxDuration = 60

const MAX_TOPIC_LENGTH = 60
const DIFFICULTY = 'beginner'

const ERROR_MESSAGES: Record<string, string> = {
  empty: 'Nama topik tidak boleh kosong.',
  ai: 'Gagal membuat materi dari AI. Belum ada yang tersimpan, coba lagi.',
  db: 'Gagal menyimpan topik ke database. Belum ada yang tersimpan, coba lagi.',
}

// Tabel tanpa cascade: hapus anak dulu, baru topik
async function cleanupTopic(topicId: string) {
  const supabase = createSupabaseServerClient()
  await supabase.from('exercises').delete().eq('topic_id', topicId)
  await supabase.from('vocabulary').delete().eq('topic_id', topicId)
  await supabase.from('topics').delete().eq('id', topicId)
}

export default async function TopicSelectionPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>
}) {
  const { error: errorParam } = await searchParams
  const supabase = createSupabaseServerClient()

  const { data: topics, error } = await supabase
    .from('topics')
    .select('*')
    .order('created_at', { ascending: true })

  if (error) {
    return <div>Gagal memuat topik: {error.message}</div>
  }

  async function createTopic(formData: FormData) {
    'use server'

    const raw = formData.get('topicName')
    const topicName = typeof raw === 'string' ? raw.trim().slice(0, MAX_TOPIC_LENGTH) : ''

    if (!topicName) {
      redirect('/topics?error=empty')
    }

    // 1) Panggil AI DULU. Kalau gagal, belum ada yang ditulis ke DB.
    let lesson: GeneratedLesson
    try {
      lesson = await aiService.generateLesson(topicName, DIFFICULTY)
    } catch (err) {
      console.error('generateLesson gagal:', err)
      redirect('/topics?error=ai')
    }

    if (lesson.vocabulary.length === 0) {
      redirect('/topics?error=ai')
    }

    // 2) Baru tulis ke DB: topics → vocabulary → exercises
    const supabase = createSupabaseServerClient()

    const { data: newTopic, error: topicError } = await supabase
      .from('topics')
      .insert({ name: topicName, difficulty: DIFFICULTY })
      .select('id')
      .single()

    if (topicError || !newTopic) {
      console.error('Insert topic gagal:', topicError)
      redirect('/topics?error=db')
    }

    const { error: vocabError } = await supabase.from('vocabulary').insert(
      lesson.vocabulary.map((v) => ({
        topic_id: newTopic.id,
        hanzi: v.hanzi,
        pinyin: v.pinyin,
        meaning: v.meaning,
        example_sentence: v.example_sentence,
        example_pinyin: v.example_pinyin,
        example_translation: v.example_translation,
      }))
    )

    if (vocabError) {
      console.error('Insert vocabulary gagal:', vocabError)
      await cleanupTopic(newTopic.id)
      redirect('/topics?error=db')
    }

    const { error: exerciseError } = await supabase
      .from('exercises')
      .insert(buildExercises(newTopic.id, lesson.vocabulary))

    if (exerciseError) {
      console.error('Insert exercises gagal:', exerciseError)
      await cleanupTopic(newTopic.id)
      redirect('/topics?error=db')
    }

    redirect(`/topics/${newTopic.id}`)
  }

 return (
  <div className="flex-1 flex flex-col items-center bg-bg px-4 py-8 gap-8">
    <h1 className="text-xl font-semibold text-text">Pilih Topik</h1>

    {errorParam && ERROR_MESSAGES[errorParam] && (
      <p role="alert" className="text-sm text-error">{ERROR_MESSAGES[errorParam]}</p>
    )}

    <div className="w-full max-w-sm flex flex-col gap-2">
      {topics?.map((topic) => (
        <Link
          key={topic.id}
          href={`/topics/${topic.id}`}
          className="rounded-xl border border-border bg-surface px-4 py-3 text-text hover:border-accent transition-colors"
        >
          {topic.name}
          {topic.description && (
            <span className="block text-sm text-text-muted mt-0.5">{topic.description}</span>
          )}
        </Link>
      ))}
    </div>

    <div className="w-full max-w-sm border-t border-border pt-6">
      <CreateTopicForm action={createTopic} maxLength={MAX_TOPIC_LENGTH} />
    </div>
  </div>
)
}