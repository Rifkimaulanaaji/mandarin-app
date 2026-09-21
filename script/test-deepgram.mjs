import fs from 'node:fs'
import path from 'node:path'

const dir = process.argv[2] ?? 'samples'
const model = process.argv[3] ?? 'nova-2'
const apiKey = process.env.DEEPGRAM_API_KEY

const mimeByExt = {
  '.webm': 'audio/webm',
  '.mp4': 'audio/mp4',
  '.m4a': 'audio/mp4',
  '.mp3': 'audio/mpeg',
  '.wav': 'audio/wav',
  '.ogg': 'audio/ogg',
  '.opus': 'audio/ogg',
}

for (const f of fs.readdirSync(dir).filter((f) => !f.startsWith('.'))) {
  const ext = path.extname(f).toLowerCase()
  const res = await fetch(
    `https://api.deepgram.com/v1/listen?model=${model}&language=zh-TW&smart_format=true`,
    {
      method: 'POST',
      headers: {
        Authorization: `Token ${apiKey}`,
        'Content-Type': mimeByExt[ext] ?? 'application/octet-stream',
      },
      body: fs.readFileSync(path.join(dir, f)),
    }
  )

  if (!res.ok) {
    console.log(`${f}\n  ✗ ${res.status} ${await res.text()}\n`)
    continue
  }

  const data = await res.json()
  const alt = data.results?.channels?.[0]?.alternatives?.[0]
  console.log(`${f}\n  → ${alt?.transcript || '(kosong)'}  [confidence: ${alt?.confidence?.toFixed(2)}]\n`)
}