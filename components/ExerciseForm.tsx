'use client'

import { useActionState, useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { useFormStatus } from 'react-dom'
import CharacterBubble from './CharacterBubble'
import AnswerField from './AnswerField'
import type { AIFeedback } from '@/lib/ai/types'

export type SubmitResult =
    | { kind: 'error'; message: string; draft: string }
    | { kind: 'duplicate'; nextUrl: string }
    | { kind: 'exact'; nextUrl: string }
    | { kind: 'ai'; feedback: AIFeedback; nextUrl: string }

const AUTO_NEXT_DELAY = 1500

function SubmitButton() {
    const { pending } = useFormStatus()
    return (
        <button
            type="submit"
            disabled={pending}
            className="w-full rounded-xl bg-accent text-accent-text font-medium py-3 disabled:opacity-50"
        >
            {pending ? 'Menilai…' : 'Submit Jawaban'}
        </button>
    )
}

export default function ExerciseForm({
    action,
    question,
    keyterm,
    maxLength,
    initialError,
    initialDraft,
}: {
    action: (prev: SubmitResult | null, formData: FormData) => Promise<SubmitResult>
    question: string
    keyterm?: string
    maxLength: number
    initialError: string | null
    initialDraft: string
}) {
    const [state, formAction] = useActionState(action, null)
    const router = useRouter()
    const [draft, setDraft] = useState(initialDraft)

    useEffect(() => {
        if (state?.kind === 'duplicate') {
            router.replace(state.nextUrl)
            return
        }
        if (state?.kind === 'exact') {
            const t = setTimeout(() => router.push(state.nextUrl), AUTO_NEXT_DELAY)
            return () => clearTimeout(t)
        }
    }, [state, router])

    // --- Kasus: jawaban benar lewat exact-match, auto-next ---
    if (state?.kind === 'exact') {
        return (
            <CharacterBubble expression="happy">
                <span className="font-semibold text-success">BENAR!!</span>
            </CharacterBubble>
        )
    }

    // --- Kasus: hasil dari AI (benar atau salah), tunggu klik manual ---
    if (state?.kind === 'ai') {
        const { feedback, nextUrl } = state
        return (
            <div className="flex flex-col items-center gap-6 w-full max-w-sm">
                <CharacterBubble expression={feedback.is_correct ? 'happy' : 'sad'}>
                    <p className="flex items-center justify-center gap-2 font-medium text-center">
                        <span
                            className={`inline-block w-2.5 h-2.5 rounded-full ${feedback.is_correct ? 'bg-success' : 'bg-error'
                                }`}
                            aria-hidden
                        />
                        {feedback.is_correct ? 'Benar!' : 'Belum Tepat'}
                    </p>
                    <p className="mt-2 text-sm text-text-muted">
                        Jawaban yang benar: <span className="text-text">{feedback.corrected_answer}</span>
                        {feedback.corrected_answer_pinyin && (
                            <span className="text-text-muted"> ({feedback.corrected_answer_pinyin})</span>
                        )}
                    </p>
                    <p className="mt-2 text-sm">{feedback.explanation}</p>

                    {feedback.mistakes.length > 0 && (
                        <ul className="mt-3 text-sm text-text-muted space-y-1">
                            {feedback.mistakes.map((m, i) => (
                                <li key={i}>
                                    <span className="text-text">{m.part}</span>: {m.problem}
                                </li>
                            ))}
                        </ul>
                    )}

                    {feedback.alternative_answers.length > 0 && (
                        <p className="mt-3 text-sm text-text-muted">
                            Alternatif: {feedback.alternative_answers.join(', ')}
                        </p>
                    )}
                </CharacterBubble>

                <button
                    onClick={() => router.push(nextUrl)}
                    className="w-full rounded-xl bg-accent text-accent-text font-medium py-3"
                >
                    Lanjut
                </button>
            </div>
        )
    }

    // --- Default: form soal (idle) ---
    const errorMessage = state?.kind === 'error' ? state.message : initialError

    return (
        <FormBody
            action={formAction}
            question={question}
            keyterm={keyterm}
            maxLength={maxLength}
            errorMessage={errorMessage}
            draft={state?.kind === 'error' ? state.draft : draft}
            onDraftChange={setDraft}
        />
    )
}

function FormBody({
    action,
    question,
    keyterm,
    maxLength,
    errorMessage,
    draft,
    onDraftChange,
}: {
    action: (formData: FormData) => void
    question: string
    keyterm?: string
    maxLength: number
    errorMessage: string | null
    draft: string
    onDraftChange: (v: string) => void
}) {
    const { pending } = useFormStatus()

    return (
        <form action={action} className="flex flex-col items-center gap-10 w-full max-w-sm">
            <CharacterBubble expression={pending ? 'thinking' : 'idle'}>
                <p className="text-lg leading-snug">{question}</p>
            </CharacterBubble>

            {errorMessage && (
                <p role="alert" className="text-sm text-error">
                    {errorMessage}
                </p>
            )}

            <div className="w-full">
                <AnswerField
                    defaultValue={draft}
                    maxLength={maxLength}
                    onChange={onDraftChange}
                    keyterm={keyterm}
                />
            </div>

            <SubmitButton />
        </form>
    )
}