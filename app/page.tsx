import Link from "next/link";

export default function HomePage() {
  return (
    <div className="flex-1 flex flex-col items-center justify-center bg-bg px-4 py-8 gap-8">
      <div className="text-center">
        <h1 className="text-2xl font-semibold text-text">學中文</h1>
        <p className="text-sm text-text-muted mt-1">Belajar Mandarin, sedikit demi sedikit</p>
      </div>

      <div className="w-full max-w-sm flex flex-col gap-3">
        <Link
          href="/topics"
          className="rounded-xl bg-accent text-accent-text font-medium py-4 text-center"
        >
          Pilih Topik
        </Link>
        <Link
          href="/history"
          className="rounded-xl border border-border text-text py-4 text-center"
        >
          Riwayat Belajar
        </Link>
      </div>
    </div>
  );
}