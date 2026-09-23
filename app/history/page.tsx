import Link from 'next/link'
import { createSupabaseServerClient } from '@/lib/supabase/server'

function toDateKey(iso: string): string {
  return iso.slice(0, 10) // "YYYY-MM-DD"
}

const WEEKDAY_LABELS = ['M', 'S', 'S', 'R', 'K', 'J', 'S']

export default async function HistoryPage() {
  const supabase = createSupabaseServerClient()

  const { data: sessions } = await supabase
    .from('sessions')
    .select('id, started_at, completed_at, score, topics(name)')
    .not('completed_at', 'is', null)
    .order('started_at', { ascending: false })

  const { data: attempts } = await supabase.from('attempts').select('created_at')

  const activeDates = new Set((attempts ?? []).map((a) => toDateKey(a.created_at)))

  // topik yang sudah dipelajari (distinct)
  const { data: topicRows } = await supabase.from('sessions').select('topic_id')
  const topicsLearned = new Set((topicRows ?? []).map((t) => t.topic_id)).size

  // Kalender bulan berjalan
  const now = new Date()
  const year = now.getFullYear()
  const month = now.getMonth()
  const todayKey = toDateKey(now.toISOString())
  const daysInMonth = new Date(year, month + 1, 0).getDate()
  const firstWeekday = new Date(year, month, 1).getDay() // 0=Minggu

  const cells: (number | null)[] = Array(firstWeekday).fill(null)
  for (let d = 1; d <= daysInMonth; d++) cells.push(d)

  return (
    <div className="flex-1 flex flex-col items-center bg-bg px-4 py-8 gap-8">
      <h1 className="text-xl font-semibold text-text">Riwayat Belajar</h1>

      <div className="w-full max-w-sm flex gap-3">
        <div className="flex-1 rounded-xl border border-border bg-surface px-4 py-3 text-center">
          <p className="text-2xl font-bold text-accent">{topicsLearned}</p>
          <p className="text-xs text-text-muted mt-1">Topik dipelajari</p>
        </div>
        <div className="flex-1 rounded-xl border border-border bg-surface px-4 py-3 text-center">
          <p className="text-2xl font-bold text-accent">{activeDates.size}</p>
          <p className="text-xs text-text-muted mt-1">Hari aktif</p>
        </div>
      </div>

      <div className="w-full max-w-sm rounded-2xl border border-border bg-surface p-4">
        <p className="text-sm text-text-muted mb-3 text-center">
          {now.toLocaleDateString('id-ID', { month: 'long', year: 'numeric' })}
        </p>

        <div className="grid grid-cols-7 gap-1.5 mb-1.5">
          {WEEKDAY_LABELS.map((label, i) => (
            <div key={i} className="text-center text-xs text-text-muted">
              {label}
            </div>
          ))}
        </div>

        <div className="grid grid-cols-7 gap-1.5">
          {cells.map((d, i) => {
            if (d === null) return <div key={i} />
            const key = `${year}-${String(month + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`
            const active = activeDates.has(key)
            const isToday = key === todayKey
            return (
              <div
                key={i}
                className={`
                  aspect-square rounded-lg flex items-center justify-center text-sm
                  ${active ? 'bg-accent text-accent-text font-medium' : 'bg-bg text-text-muted'}
                  ${isToday && !active ? 'border border-accent' : ''}
                `}
              >
                {d}
              </div>
            )
          })}
        </div>
      </div>

      <div className="w-full max-w-sm flex flex-col gap-3">
        <h2 className="text-sm font-medium text-text-muted">Sesi Sebelumnya</h2>

        {sessions && sessions.length > 0 ? (
          <div className="flex flex-col gap-2">
            {sessions.map((s) => {
              const topicName =
                (s as { topics?: { name?: string } }).topics?.name ?? 'Topik'
              return (
                <div
                  key={s.id}
                  className="rounded-xl border border-border bg-surface px-4 py-3 flex items-center justify-between"
                >
                  <div>
                    <p className="text-text">{topicName}</p>
                    <p className="text-xs text-text-muted mt-0.5">
                      {new Date(s.started_at).toLocaleDateString('id-ID', {
                        day: 'numeric',
                        month: 'short',
                      })}
                    </p>
                  </div>
                  <p className="text-accent font-semibold">{s.score ?? '-'}%</p>
                </div>
              )
            })}
          </div>
        ) : (
          <p className="text-sm text-text-muted text-center py-4">
            Belum ada sesi yang selesai.
          </p>
        )}
      </div>

      <Link href="/topics" className="text-sm text-accent underline">
        Kembali ke Topik
      </Link>
    </div>
  )
}