'use client'

export default function DeleteTopicButton() {
  return (
    <button
      type="submit"
      onClick={(e) => {
        if (!confirm('Yakin mau hapus topik ini? Semua progres di topik ini juga ikut terhapus.')) {
          e.preventDefault()
        }
      }}
      className="text-text-muted hover:text-error shrink-0 px-1"
      aria-label="Hapus topik"
    >
      🗑
    </button>
  )
}