'use client'

import { useState } from 'react'
import AudioButton from './AudioButton'

type Vocab = {
    id: string
    hanzi: string
    pinyin: string
    meaning: string
    example_sentence: string | null
    example_pinyin: string | null
    example_translation: string | null
}

export default function VocabFlashcards({
    vocabulary,
    onFinish,
}: {
    vocabulary: Vocab[]
    onFinish: () => void
}) {
    const [index, setIndex] = useState(0)
    const [direction, setDirection] = useState<'next' | 'prev'>('next')

    if (vocabulary.length === 0) return null

    const isLast = index === vocabulary.length - 1
    const v = vocabulary[index]

    function goNext() {
        if (isLast) {
            onFinish()
            return
        }
        setDirection('next')
        setIndex((i) => i + 1)
    }

    function goPrev() {
        if (index === 0) return
        setDirection('prev')
        setIndex((i) => i - 1)
    }

    return (
        <div className="w-full max-w-sm flex flex-col items-center gap-4">
            <div className="text-sm text-text-muted">
                {index + 1} / {vocabulary.length}
            </div>

            <div
                key={v.id}
                className={`
          relative w-full rounded-2xl border border-border bg-surface p-6 min-h-[280px]
          flex flex-col justify-center
          ${direction === 'next' ? 'animate-slide-in-right' : 'animate-slide-in-left'}
        `}
            >
                <div className="text-center">
                    <div className="flex items-center justify-center gap-2">
                        <p className="text-4xl font-semibold text-text">{v.hanzi}</p>
                        <AudioButton
                            text={v.hanzi}
                            className="w-8 h-8 rounded-full border border-border text-sm flex items-center justify-center shrink-0"
                        />
                    </div>
                    <p className="text-text-muted mt-1">{v.pinyin}</p>
                    <p className="text-text mt-3">{v.meaning}</p>
                </div>

                {v.example_sentence && (
                    <div className="mt-6 border-t border-border pt-4 text-center">
                        <div className="flex items-center justify-center gap-2">
                            <p className="text-xl">{v.example_sentence}</p>

                            <AudioButton
                                text={v.example_sentence}
                                className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full border border-border text-sm"
                            />
                        </div>

                        {v.example_pinyin && (
                            <p className="mt-1 text-sm text-text-muted">
                                {v.example_pinyin}
                            </p>
                        )}

                        {v.example_translation && (
                            <p className="mt-2 text-sm text-text-muted">
                                {v.example_translation}
                            </p>
                        )}
                    </div>
                )}
            </div>

            <div className="flex items-center gap-4 w-full">
                <button
                    onClick={goPrev}
                    disabled={index === 0}
                    className="flex-1 rounded-xl border border-border text-text py-3 disabled:opacity-30"
                >
                    ← Sebelumnya
                </button>
                <button
                    onClick={goNext}
                    className="flex-1 rounded-xl bg-accent text-accent-text py-3 font-medium"
                >
                    {isLast ? 'Selesai' : 'Berikutnya →'}
                </button>
            </div>
        </div>
    )
}