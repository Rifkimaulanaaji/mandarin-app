const DEEPGRAM_MODEL = 'nova-3'

function tidyTranscript(text: string): string {
  return text
    .trim()
    .replace(/(?<=[\u4e00-\u9fff])\s+(?=[\u4e00-\u9fff])/g, '')
}

export async function transcribeAudio(file: File, keyterms?: string[]): Promise<string> {
  const apiKey = process.env.DEEPGRAM_API_KEY
  if (!apiKey) throw new Error('DEEPGRAM_API_KEY belum di-set')

  const params = new URLSearchParams({
    model: DEEPGRAM_MODEL,
    language: 'zh-TW',
    smart_format: 'true',
  })
  for (const term of keyterms ?? []) {
    params.append('keyterm', term)
  }

  const res = await fetch(`https://api.deepgram.com/v1/listen?${params}`, {
    method: 'POST',
    headers: {
      Authorization: `Token ${apiKey}`,
      'Content-Type': file.type.split(';')[0] || 'application/octet-stream',
    },
    body: Buffer.from(await file.arrayBuffer()),
    signal: AbortSignal.timeout(20_000),
  })

  if (!res.ok) {
    throw new Error(`Deepgram error ${res.status}`)
  }

  const data = await res.json()
  const transcript: string = data.results?.channels?.[0]?.alternatives?.[0]?.transcript ?? ''
  return tidyTranscript(transcript)
}