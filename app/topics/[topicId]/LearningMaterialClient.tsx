'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import VocabFlashcards from '@/components/VocabFlashcards'

type Vocab = {
  id: string
  hanzi: string
  pinyin: string
  meaning: string
  example_sentence: string | null
  example_pinyin: string | null
  example_translation: string | null
}

export default function LearningMaterialClient({
  topicName,
  topicId,
  vocabulary,
}: {
  topicName: string
  topicId: string
  vocabulary: Vocab[]
}) {
  const [finished, setFinished] = useState(false)
  const router = useRouter()

  return (
    <div className="flex-1 flex flex-col items-center justify-center bg-bg px-4 py-8 gap-6">
      {!finished ? (
        <>
          <div className="text-center">
            <p className="text-sm text-text-muted">Topik</p>
            <h1 className="text-xl font-semibold text-text">{topicName}</h1>
          </div>
          <VocabFlashcards vocabulary={vocabulary} onFinish={() => setFinished(true)} />
        </>
      ) : (
        <div className="w-full max-w-sm flex flex-col items-center gap-6 text-center">
          <div className="w-full rounded-2xl border border-border bg-surface p-6">
            <p className="text-2xl">🎉</p>
            <h2 className="text-lg font-semibold text-text mt-2">Kosakata Selesai!</h2>
            <p className="text-sm text-text-muted mt-2">
              Kamu sudah lihat {vocabulary.length} kata baru dari topik{' '}
              <span className="text-text">{topicName}</span>. Sekarang saatnya latihan.
            </p>
          </div>

          <button
            onClick={() => router.push(`/topics/${topicId}/session`)}
            className="w-full rounded-xl bg-accent text-accent-text font-medium px-8 py-4 text-lg"
          >
            Mulai Latihan
          </button>
        </div>
      )}
    </div>
  )
}