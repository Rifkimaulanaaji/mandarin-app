const DEEPGRAM_MODEL = 'nova-2' // ganti ke 'nova-3' kalau hasil tesnya lebih baik

// Bersihkan spasi di antara dua karakter Hanzi (transkrip Mandarin kadang dipisah per kata)
function tidyTranscript(text: string): string {
  return text
    .trim()
    .replace(/(?<=[\u4e00-\u9fff])\s+(?=[\u4e00-\u9fff])/g, '')
}

export async function transcribeAudio(file: File): Promise<string> {
  const apiKey = process.env.DEEPGRAM_API_KEY
  if (!apiKey) throw new Error('DEEPGRAM_API_KEY belum di-set')

  const res = await fetch(
    `https://api.deepgram.com/v1/listen?model=${DEEPGRAM_MODEL}&language=zh-TW&smart_format=true`,
    {
      method: 'POST',
      headers: {
        Authorization: `Token ${apiKey}`,
        'Content-Type': file.type.split(';')[0] || 'application/octet-stream',
      },
      body: Buffer.from(await file.arrayBuffer()),
      signal: AbortSignal.timeout(20_000),
    }
  )

  if (!res.ok) {
    // Jangan sertakan body/header ke pesan error (hindari kebocoran detail)
    throw new Error(`Deepgram error ${res.status}`)
  }

  const data = await res.json()
  const transcript: string = data.results?.channels?.[0]?.alternatives?.[0]?.transcript ?? ''
  return tidyTranscript(transcript)
}