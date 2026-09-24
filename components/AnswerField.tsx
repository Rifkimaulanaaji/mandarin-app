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
  onChange,
  keyterm,
}: {
  defaultValue?: string
  maxLength: number
  onChange?: (value: string) => void
  keyterm?: string
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
      if (keyterm) body.append('keyterm', keyterm)

      const res = await fetch('/api/speech/transcribe', { method: 'POST', body })
      const data = await res.json().catch(() => ({}))

      if (!res.ok || !data.text) {
        setError(data.error ?? 'Gagal mengenali suara. Coba lagi atau ketik jawabanmu.')
        return
      }

      const text = String(data.text).slice(0, maxLength)
      setValue(text)
      setInputType('voice')
      onChange?.(text)
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
  <div className="w-full flex flex-col gap-2">
    <div className="flex items-center gap-2">
      <input
        type="text"
        name="answer"
        required
        maxLength={maxLength}
        value={value}
        onChange={(e) => {
          setValue(e.target.value)
          setInputType('text')
          onChange?.(e.target.value)
        }}
        placeholder="Ketik atau rekam jawabanmu..."
        className="flex-1 rounded-xl border border-border bg-surface text-text px-4 py-3 placeholder:text-text-muted focus:outline-none focus:border-accent"
      />
      <input type="hidden" name="input_type" value={inputType} />

      {canRecord && (
        <>
          {status === 'idle' && (
            <button
              type="button"
              onClick={start}
              aria-label="Rekam jawaban suara"
              className="shrink-0 w-11 h-11 rounded-full bg-accent text-accent-text flex items-center justify-center text-lg"
            >
              🎤
            </button>
          )}
          {status === 'recording' && (
            <button
              type="button"
              onClick={stop}
              aria-label="Selesai rekam"
              className="shrink-0 w-11 h-11 rounded-full bg-error text-accent-text flex items-center justify-center text-lg animate-pulse"
            >
              ⏹
            </button>
          )}
          {status === 'uploading' && (
            <button
              type="button"
              disabled
              aria-label="Mengenali suara"
              className="shrink-0 w-11 h-11 rounded-full border border-border text-text-muted flex items-center justify-center text-sm"
            >
              ⏳
            </button>
          )}
        </>
      )}
    </div>

    {status === 'recording' && (
      <p className="text-sm text-text-muted text-center">Merekam… (maks {MAX_SECONDS} detik)</p>
    )}
    {inputType === 'voice' && status === 'idle' && (
      <p className="text-sm text-text-muted text-center">
        Terdeteksi dari suaramu. Cek dulu, edit kalau ada yang salah dengar.
      </p>
    )}
    {error && (
      <p role="alert" className="text-sm text-error text-center">
        {error}
      </p>
    )}
  </div>
)
} 