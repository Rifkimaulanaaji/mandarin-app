import Link from 'next/link'
import { createSupabaseServerClient } from '@/lib/supabase/server'

export default async function TopicSelectionPage() {
  const supabase = createSupabaseServerClient()

  const { data: topics, error } = await supabase
    .from('topics')
    .select('*')
    .order('created_at', { ascending: true })

  if (error) {
    return <div>Gagal memuat topik: {error.message}</div>
  }

  return (
    <div>
      <h1>Pilih Topik</h1>
      <ul>
        {topics?.map((topic) => (
          <li key={topic.id}>
            <Link href={`/topics/${topic.id}`}>
              {topic.name} — {topic.description}
            </Link>
          </li>
        ))}
      </ul>
    </div>
  )
}