'use client'

import { useEffect, useRef, useState } from 'react'

const MAX_SECONDS = 15
const MIN_MS = 700

type Status = 'idle' | 'recording' | 'uploading'

function pickMimeType(): string {
  const candidates = ['audio/webm;codecs=opus', 'audio/webm', 'audio/mp4']
  return candidates.find((t) => MediaRecorder.isTypeSupported(t)) ?? ''
}

export default function AnswerField({
  defaultValue = '',
  maxLength,
}: {
  defaultValue?: string
  maxLength: number
}) {
  const [value, setValue] = useState(defaultValue)
  const [inputType, setInputType] = useState<'text' | 'voice'>('text')
  const [status, setStatus] = useState<Status>('idle')
  const [error, setError] = useState<string | null>(null)
  const [canRecord, setCanRecord] = useState(false)

  const recorderRef = useRef<MediaRecorder | null>(null)
  const streamRef = useRef<MediaStream | null>(null)
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const startedAtRef = useRef(0)

  useEffect(() => {
    setCanRecord(
      typeof MediaRecorder !== 'undefined' && !!navigator.mediaDevices?.getUserMedia
    )
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current)
      streamRef.current?.getTracks().forEach((t) => t.stop())
    }
  }, [])

  async function upload(blob: Blob, mimeType: string) {
    setStatus('uploading')
    try {
      const ext = mimeType.includes('mp4') ? 'mp4' : 'webm'
      const body = new FormData()
      body.append('audio', blob, `rekaman.${ext}`)

      const res = await fetch('/api/speech/transcribe', { method: 'POST', body })
      const data = await res.json().catch(() => ({}))

      if (!res.ok || !data.text) {
        setError(data.error ?? 'Gagal mengenali suara. Coba lagi atau ketik jawabanmu.')
        return
      }

      setValue(String(data.text).slice(0, maxLength))
      setInputType('voice')
    } catch {
      setError('Koneksi bermasalah saat mengirim rekaman. Coba lagi atau ketik jawabanmu.')
    } finally {
      setStatus('idle')
    }
  }

  async function start() {
    setError(null)
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
      streamRef.current = stream

      const mimeType = pickMimeType()
      const recorder = new MediaRecorder(stream, mimeType ? { mimeType } : undefined)
      const chunks: Blob[] = []

      recorder.ondataavailable = (e) => {
        if (e.data.size > 0) chunks.push(e.data)
      }

      recorder.onstop = () => {
        if (timerRef.current) clearTimeout(timerRef.current)
        stream.getTracks().forEach((t) => t.stop())

        if (Date.now() - startedAtRef.current < MIN_MS) {
          setStatus('idle')
          setError('Rekaman terlalu pendek. Tahan sedikit lebih lama.')
          return
        }

        const type = recorder.mimeType || mimeType || 'audio/webm'
        void upload(new Blob(chunks, { type }), type)
      }

      recorderRef.current = recorder
      startedAtRef.current = Date.now()
      recorder.start()
      setStatus('recording')
      timerRef.current = setTimeout(() => recorder.state === 'recording' && recorder.stop(), MAX_SECONDS * 1000)
    } catch (err) {
      const denied = err instanceof DOMException && err.name === 'NotAllowedError'
      setError(
        denied
          ? 'Izin mikrofon ditolak. Aktifkan izin mikrofon di pengaturan browser, atau ketik jawabanmu.'
          : 'Mikrofon tidak bisa dipakai. Ketik jawabanmu saja.'
      )
    }
  }

  function stop() {
    if (recorderRef.current?.state === 'recording') recorderRef.current.stop()
  }

  return (
    <div>
      <input
        type="text"
        name="answer"
        required
        maxLength={maxLength}
        value={value}
        onChange={(e) => {
          setValue(e.target.value)
          setInputType('text') // diedit manual → dianggap ketikan
        }}
        placeholder="Ketik atau rekam jawabanmu..."
      />
      <input type="hidden" name="input_type" value={inputType} />

      {canRecord && (
        <>
          {status === 'idle' && (
            <button type="button" onClick={start}>
              🎤 Rekam
            </button>
          )}
          {status === 'recording' && (
            <button type="button" onClick={stop}>
              ⏹ Selesai
            </button>
          )}
          {status === 'uploading' && (
            <button type="button" disabled>
              Mengenali suara…
            </button>
          )}
        </>
      )}

      {status === 'recording' && <p>Merekam… (maks {MAX_SECONDS} detik)</p>}
      {inputType === 'voice' && status === 'idle' && (
        <p>
          <small>Terdeteksi dari suaramu. Cek dulu, edit kalau ada yang salah dengar.</small>
        </p>
      )}
      {error && <p role="alert">{error}</p>}
    </div>
  )
}