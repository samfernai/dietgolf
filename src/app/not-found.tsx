import Link from "next/link";

export default function NotFound() {
  return (
    <div className="mx-auto flex min-h-dvh max-w-lg flex-col items-center justify-center gap-4 px-6 text-center">
      <p className="text-5xl" aria-hidden>
        ⛳
      </p>
      <h1 className="font-display text-2xl font-bold">Out of bounds</h1>
      <p className="text-sm muted">That hole isn&apos;t on this course.</p>
      <Link href="/play" className="rounded-xl bg-masters-500 px-5 py-3 text-sm font-bold text-white">
        Back to the tee
      </Link>
    </div>
  );
}
