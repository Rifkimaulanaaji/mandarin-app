'use client'

import { useFormStatus } from 'react-dom'

function SubmitButton() {
  const { pending } = useFormStatus()
  return (
    <button
      type="submit"
      disabled={pending}
      className="rounded-xl bg-accent text-accent-text font-medium px-5 py-3 disabled:opacity-50 whitespace-nowrap"
    >
      {pending ? 'Meracik materi…' : 'Buat Topik'}
    </button>
  )
}

function StatusHint() {
  const { pending } = useFormStatus()
  if (!pending) return null
  return (
    <p className="text-sm text-text-muted animate-pulse">
      AI sedang menyusun kosakata dan latihan… (bisa sampai 1 menit)
    </p>
  )
}

export default function CreateTopicForm({
  action,
  maxLength,
}: {
  action: (formData: FormData) => void
  maxLength: number
}) {
  return (
    <form action={action} className="flex flex-col gap-3">
      <input
        type="text"
        name="topicName"
        required
        maxLength={maxLength}
        placeholder="Topik baru, misal: naik MRT"
        className="rounded-xl border border-border bg-surface text-text px-4 py-3 placeholder:text-text-muted"
      />
      <SubmitButton />
      <StatusHint />
    </form>
  )
}