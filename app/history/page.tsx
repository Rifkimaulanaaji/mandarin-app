export const dynamic = 'force-dynamic'
import Link from 'next/link'
import { createSupabaseServerClient } from '@/lib/supabase/server'
import BackButton from '@/components/BackButton'


function toDateKey(iso: string): string {
  const date = new Date(iso)
  // Konversi ke WIB (UTC+7) sebelum ambil tanggal
  const wib = new Date(date.getTime() + 7 * 60 * 60 * 1000)
  return wib.toISOString().slice(0, 10)
}

const WEEKDAY_LABELS = ['M', 'S', 'S', 'R', 'K', 'J', 'S']

export default async function HistoryPage() {
  const supabase = createSupabaseServerClient()

  const sevenDaysAgo = new Date()
  sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7)

  const { data: sessions } = await supabase
    .from('sessions')
    .select('id, started_at, completed_at, score, topic_name_snapshot')
    .not('completed_at', 'is', null)
    .gte('started_at', sevenDaysAgo.toISOString())
    .order('started_at', { ascending: false })

  const { data: attempts } = await supabase.from('attempts').select('created_at')
  const activeDates = new Set((attempts ?? []).map((a) => toDateKey(a.created_at)))

  const { data: topicRows } = await supabase.from('sessions').select('topic_id')
  const topicsLearned = new Set((topicRows ?? []).map((t) => t.topic_id)).size

  const now = new Date()
  const year = now.getFullYear()
  const month = now.getMonth()
  const todayKey = toDateKey(now.toISOString())
  const daysInMonth = new Date(year, month + 1, 0).getDate()
  const firstWeekday = new Date(year, month, 1).getDay()

  const cells: (number | null)[] = Array(firstWeekday).fill(null)
  for (let d = 1; d <= daysInMonth; d++) cells.push(d)

  // Group sessions per tanggal
  const grouped = new Map<string, typeof sessions>()
  for (const s of sessions ?? []) {
    const key = toDateKey(s.started_at)
    if (!grouped.has(key)) grouped.set(key, [])
    grouped.get(key)!.push(s)
  }

  return (
    <div className="flex flex-col h-screen bg-bg">
      <BackButton href="/" />
      <div className="flex-1 overflow-y-auto px-4 pt-8 pb-28">
        <h1 className="text-xl font-semibold text-text text-center mb-6">Riwayat Belajar</h1>

        <div className="w-full max-w-sm mx-auto flex flex-col gap-8">
          <div className="flex gap-3">
            <div className="flex-1 rounded-xl border border-border bg-surface px-4 py-3 text-center">
              <p className="text-2xl font-bold text-accent">{topicsLearned}</p>
              <p className="text-xs text-text-muted mt-1">Topik dipelajari</p>
            </div>
            <div className="flex-1 rounded-xl border border-border bg-surface px-4 py-3 text-center">
              <p className="text-2xl font-bold text-accent">{activeDates.size}</p>
              <p className="text-xs text-text-muted mt-1">Hari aktif</p>
            </div>
          </div>

          <div className="rounded-2xl border border-border bg-surface p-4">
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

          <div className="flex flex-col gap-4">
            <h2 className="text-sm font-medium text-text-muted">
              Sesi 7 Hari Terakhir
            </h2>

            {grouped.size > 0 ? (
              [...grouped.entries()].map(([dateKey, daySessions]) => (
                <div key={dateKey} className="flex flex-col gap-2">
                  <p className="text-xs text-text-muted">
                    {new Date(dateKey).toLocaleDateString('id-ID', {
                      weekday: 'long',
                      day: 'numeric',
                      month: 'long',
                    })}
                  </p>
                  {daySessions!.map((s) => (
                    <div
                      key={s.id}
                      className="rounded-xl border border-border bg-surface px-4 py-3 flex items-center justify-between"
                    >
                      <p className="text-text">{s.topic_name_snapshot ?? 'Topik (dihapus)'}</p>
                      <p className="text-accent font-semibold">{s.score ?? '-'}%</p>
                    </div>
                  ))}
                </div>
              ))
            ) : (
              <p className="text-sm text-text-muted text-center py-4">
                Belum ada sesi dalam 7 hari terakhir.
              </p>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}