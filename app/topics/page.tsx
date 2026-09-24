import Link from 'next/link'
import { redirect } from 'next/navigation'
import { createSupabaseServerClient } from '@/lib/supabase/server'
import { aiService } from '@/lib/ai/service'
import { buildExercises } from '@/lib/exercises/build'
import { checkAndIncrement, limitMessage } from '@/lib/rate-limit'
import type { GeneratedLesson } from '@/lib/ai/types'
import CreateTopicForm from '@/components/CreateTopicForm'
import BackButton from '@/components/BackButton'
import DeleteTopicButton from '@/components/DeleteTopicButton'

export const maxDuration = 120

const MAX_TOPIC_LENGTH = 60
const DIFFICULTY = 'beginner'

const ERROR_MESSAGES: Record<string, string> = {
  empty: 'Nama topik tidak boleh kosong.',
  ai: 'Gagal membuat materi dari AI. Belum ada yang tersimpan, coba lagi.',
  db: 'Gagal menyimpan topik ke database. Belum ada yang tersimpan, coba lagi.',
  limit: limitMessage('generate_lesson'),
}

async function cleanupTopic(topicId: string) {
  const supabase = createSupabaseServerClient()
  // sessions & attempts SENGAJA tidak dihapus — snapshot bikin mereka independen dari topic
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

    const allowed = await checkAndIncrement('generate_lesson')
    if (!allowed) {
      redirect('/topics?error=limit')
    }

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

    const supabase = createSupabaseServerClient()

    const { data: newTopic, error: topicError } = await supabase
      .from('topics')
      .insert({ name: lesson.title, description: lesson.description, difficulty: DIFFICULTY })
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

  async function deleteTopic(formData: FormData) {
    'use server'
    const topicId = formData.get('topicId')
    if (typeof topicId === 'string') {
      await cleanupTopic(topicId)
    }
    redirect('/topics')
  }

  return (
    <div className="flex flex-col h-screen bg-bg">
          <BackButton href="/" />
      <div className="flex-1 overflow-y-auto px-4 pt-8 pb-40">
        <h1 className="text-xl font-semibold text-text text-center mb-6">Pilih Topik</h1>

        {errorParam && ERROR_MESSAGES[errorParam] && (
          <p role="alert" className="text-sm text-error text-center mb-4">
            {ERROR_MESSAGES[errorParam]}
          </p>
        )}

        <div className="w-full max-w-sm mx-auto flex flex-col gap-2">
          {topics?.map((topic) => (
            <div
              key={topic.id}
              className="rounded-xl border border-border bg-surface px-4 py-3 flex items-center justify-between gap-2"
            >
              <Link href={`/topics/${topic.id}`} className="flex-1 min-w-0">
                <p className="text-text truncate">{topic.name}</p>
                {topic.description && (
                  <p className="text-sm text-text-muted mt-0.5 truncate">{topic.description}</p>
                )}
              </Link>
              <form action={deleteTopic}>
                <input type="hidden" name="topicId" value={topic.id} />
                <DeleteTopicButton  />
              </form>
            </div>
          ))}
        </div>
      </div>

      <div className="fixed bottom-0 left-0 right-0 bg-bg border-t border-border px-4 py-4">
        <div className="max-w-sm mx-auto">
          <CreateTopicForm action={createTopic} maxLength={MAX_TOPIC_LENGTH} />
        </div>
      </div>
    </div>
  )
}