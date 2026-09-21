import { NextResponse } from 'next/server'
import { transcribeAudio } from '@/lib/speech/transcribe'

export const maxDuration = 30

const MAX_BYTES = 2 * 1024 * 1024 // 2 MB, cukup untuk klip 15 detik
const MIN_BYTES = 1000 // di bawah ini hampir pasti kosong/terpotong

export async function POST(req: Request) {
  const form = await req.formData().catch(() => null)
  const file = form?.get('audio')

  if (!(file instanceof File) || !file.type.startsWith('audio/')) {
    return NextResponse.json({ error: 'File audio tidak valid.' }, { status: 400 })
  }
  if (file.size < MIN_BYTES) {
    return NextResponse.json({ error: 'Rekaman terlalu pendek atau kosong.' }, { status: 400 })
  }
  if (file.size > MAX_BYTES) {
    return NextResponse.json({ error: 'Rekaman terlalu panjang.' }, { status: 413 })
  }

  try {
    const text = await transcribeAudio(file)

    if (!text) {
      return NextResponse.json({ error: 'Tidak ada suara yang terdeteksi.' }, { status: 422 })
    }

    return NextResponse.json({ text })
  } catch (err) {
    console.error('Transkripsi gagal:', err instanceof Error ? err.message : err)
    return NextResponse.json(
      { error: 'Gagal mengenali suara. Coba rekam lagi atau ketik jawabanmu.' },
      { status: 502 }
    )
  }
}