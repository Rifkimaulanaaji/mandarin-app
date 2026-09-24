import Link from 'next/link'

export default function BackButton({ href }: { href: string }) {
  return (
    <Link
      href={href}
      className="fixed top-4 left-4 z-10 w-9 h-9 rounded-full border border-border bg-surface text-text flex items-center justify-center"
      aria-label="Kembali"
    >
      ←
    </Link>
  )
}