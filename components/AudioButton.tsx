'use client'

import { useEffect, useState } from 'react'

const HAS_HANZI = /[\u4e00-\u9fff]/

// Prioritas: zh-TW → varian zh lain (bukan zh-HK, itu Kanton) → tidak ada
function pickVoice(): SpeechSynthesisVoice | null {
  const norm = (v: SpeechSynthesisVoice) => v.lang.replace('_', '-')
  const voices = window.speechSynthesis.getVoices()
  return (
    voices.find((v) => norm(v) === 'zh-TW') ??
    voices.find((v) => norm(v).startsWith('zh') && norm(v) !== 'zh-HK') ??
    null
  )
}

export default function AudioButton({ text, label = '🔊' }: { text: string; label?: string }) {
  const [supported, setSupported] = useState(false)

  useEffect(() => {
    if (!('speechSynthesis' in window)) return
    // Daftar suara dimuat async di banyak browser, jadi dengarkan event-nya
    const check = () => setSupported(pickVoice() !== null)
    check()
    window.speechSynthesis.addEventListener('voiceschanged', check)
    return () => window.speechSynthesis.removeEventListener('voiceschanged', check)
  }, [])

  if (!supported || !HAS_HANZI.test(text)) return null

  function play() {
    const synth = window.speechSynthesis
    synth.cancel()
    const utterance = new SpeechSynthesisUtterance(text)
    const voice = pickVoice()
    if (voice) utterance.voice = voice
    utterance.lang = voice?.lang ?? 'zh-TW'
    utterance.rate = 0.8 // sedikit lebih lambat untuk pemula
    synth.speak(utterance)
  }

  return (
    <button type="button" onClick={play} aria-label="Dengarkan pengucapan">
      {label}
    </button>
  )
}