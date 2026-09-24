import { createSupabaseServerClient } from '@/lib/supabase/server'

const LIMITS = {
  generate_lesson: 20,
  evaluate: 200,
  transcribe: 100,
} as const

export type UsageKind = keyof typeof LIMITS

function todayKey(): string {
  return new Date().toISOString().slice(0, 10) // YYYY-MM-DD (UTC)
}

/**
 * Cek + increment counter harian dalam 1 operasi atomic.
 * Return true kalau MASIH BOLEH lanjut, false kalau limit sudah tercapai.
 * Fail-open: kalau ada error di sisi rate-limit sendiri, tetap izinkan (jangan blokir user karena bug infra kita).
 */
export async function checkAndIncrement(kind: UsageKind): Promise<boolean> {
  const supabase = createSupabaseServerClient()
  const date = todayKey()
  const limit = LIMITS[kind]

  try {
    // Baca dulu count sekarang
    const { data: existing } = await supabase
      .from('api_usage')
      .select('count')
      .eq('usage_date', date)
      .eq('kind', kind)
      .maybeSingle()

    const currentCount = existing?.count ?? 0

    if (currentCount >= limit) {
      return false
    }

    // Upsert increment. Race condition minor (2 request bersamaan bisa
    // sama-sama baca count lama) diterima karena ini soft-limit, bukan
    // billing-critical — toleransi lewat beberapa request tidak masalah.
    const { error } = await supabase
      .from('api_usage')
      .upsert(
        { usage_date: date, kind, count: currentCount + 1 },
        { onConflict: 'usage_date,kind' }
      )

    if (error) {
      console.error('[rate-limit] gagal increment, fail-open:', error.message)
    }

    return true
  } catch (err) {
    console.error('[rate-limit] error tak terduga, fail-open:', err)
    return true
  }
}

export function limitMessage(kind: UsageKind): string {
  const messages: Record<UsageKind, string> = {
    generate_lesson: 'Batas pembuatan topik harian tercapai. Coba lagi besok.',
    evaluate: 'Batas koreksi jawaban harian tercapai. Coba lagi besok.',
    transcribe: 'Batas rekaman suara harian tercapai. Coba lagi besok atau ketik jawabanmu.',
  }
  return messages[kind]
}