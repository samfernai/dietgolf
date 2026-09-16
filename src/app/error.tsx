"use client";

export default function Error({ error, reset }: { error: Error; reset: () => void }) {
  return (
    <div className="mx-auto flex min-h-dvh max-w-lg flex-col items-center justify-center gap-4 px-6 text-center">
      <p className="text-5xl" aria-hidden>
        💦
      </p>
      <h1 className="font-display text-2xl font-bold">That one found the water</h1>
      <p className="text-sm muted">
        Something went wrong loading the course. Take a drop and try again.
      </p>
      <pre className="max-w-full overflow-x-auto rounded-lg bg-cream-200 px-3 py-2 text-left text-[11px] dark:bg-masters-800">
        {error.message}
      </pre>
      <button
        type="button"
        onClick={reset}
        className="rounded-xl bg-masters-500 px-5 py-3 text-sm font-bold text-white"
      >
        Play again
      </button>
    </div>
  );
}
