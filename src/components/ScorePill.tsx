import { formatToPar } from "@/lib/golf/scoring";

const TONE: Record<string, string> = {
  under: "bg-[var(--color-under)] text-white",
  level: "bg-masters-500 text-white",
  over: "bg-cream-200 text-masters-800",
  none: "bg-transparent text-[color:var(--muted)] border border-[color:var(--line)]",
};

/** The leaderboard number: red under par, green level, plain over — like the boards. */
export function ScorePill({
  toPar,
  size = "md",
  title,
}: {
  toPar: number | null;
  size?: "sm" | "md" | "lg";
  title?: string;
}) {
  const tone = toPar === null ? "none" : toPar < 0 ? "under" : toPar === 0 ? "level" : "over";
  const sizing =
    size === "lg"
      ? "text-3xl px-4 py-1.5 min-w-[4rem]"
      : size === "sm"
        ? "text-xs px-1.5 py-0.5 min-w-[2rem]"
        : "text-base px-2.5 py-1 min-w-[2.75rem]";
  return (
    <span
      title={title}
      className={`inline-flex items-center justify-center rounded-md font-bold tabular-nums ${TONE[tone]} ${sizing}`}
    >
      {formatToPar(toPar)}
    </span>
  );
}

/** A single gross score in a scorecard box, ringed for birdies and bogeys. */
export function StrokeBox({
  strokes,
  toPar,
  noReturn,
}: {
  strokes: number | null;
  toPar: number | null;
  /** A day that went unlogged — shown greyed out, the way a card is annotated. */
  noReturn?: boolean;
}) {
  if (strokes === null) {
    return <span className="inline-flex h-8 w-8 items-center justify-center text-sm muted">–</span>;
  }

  if (noReturn) {
    return (
      <span
        title="No return — nothing logged that day"
        className="inline-flex h-8 w-8 items-center justify-center rounded-full border border-dashed border-[color:var(--line)] text-sm font-semibold tabular-nums muted"
      >
        {strokes}
      </span>
    );
  }

  const ring =
    toPar === null
      ? ""
      : toPar <= -2
        ? "ring-2 ring-[var(--color-under)] rounded-full"
        : toPar === -1
          ? "ring-1 ring-[var(--color-under)] rounded-full"
          : toPar === 1
            ? "ring-1 ring-masters-700 dark:ring-masters-200"
            : toPar >= 2
              ? "ring-2 ring-masters-700 dark:ring-masters-200"
              : "";
  const colour = toPar !== null && toPar < 0 ? "text-[var(--color-under)]" : "";
  return (
    <span
      className={`inline-flex h-8 w-8 items-center justify-center text-sm font-bold tabular-nums ${ring} ${colour}`}
    >
      {strokes}
    </span>
  );
}
