"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { ScorePill } from "@/components/ScorePill";
import type { Leaderboard, LeaderboardSort } from "@/lib/game";
import { prettyDate, shiftWeek } from "@/lib/time";

const SORTS: { key: LeaderboardSort; label: string }[] = [
  { key: "net", label: "Net" },
  { key: "gross", label: "Gross" },
  { key: "stableford", label: "Points" },
];

const REFRESH_MS = 20_000;

export default function LeaderboardView({
  initial,
  sort,
  meId,
  isCurrentWeek,
}: {
  initial: Leaderboard;
  sort: LeaderboardSort;
  meId: string;
  isCurrentWeek: boolean;
}) {
  const [board, setBoard] = useState(initial);

  useEffect(() => setBoard(initial), [initial]);

  // The board is live all week, so keep it moving without a manual refresh.
  useEffect(() => {
    if (!isCurrentWeek) return;
    let cancelled = false;
    const tick = async () => {
      try {
        const response = await fetch(
          `/api/leaderboard?week=${encodeURIComponent(board.course.weekKey)}&sort=${sort}`,
          { cache: "no-store" },
        );
        if (!response.ok) return;
        const data = (await response.json()) as Leaderboard;
        if (!cancelled) setBoard(data);
      } catch {
        // A dropped poll is not worth bothering the player about.
      }
    };
    const id = setInterval(tick, REFRESH_MS);
    return () => {
      cancelled = true;
      clearInterval(id);
    };
  }, [board.course.weekKey, sort, isCurrentWeek]);

  const weekKey = board.course.weekKey;

  return (
    <div>
      <div className="mb-3 flex items-center justify-between gap-2">
        <Link
          href={`/leaderboard?week=${shiftWeek(weekKey, -1)}&sort=${sort}`}
          className="rounded-lg border border-[color:var(--line)] px-2.5 py-1.5 text-xs font-bold"
        >
          ← Last week
        </Link>
        <span className="text-[11px] font-semibold muted">Par {board.course.par}</span>
        {isCurrentWeek ? (
          <span className="rounded-lg px-2.5 py-1.5 text-xs font-bold opacity-30">Next week →</span>
        ) : (
          <Link
            href={`/leaderboard?week=${shiftWeek(weekKey, 1)}&sort=${sort}`}
            className="rounded-lg border border-[color:var(--line)] px-2.5 py-1.5 text-xs font-bold"
          >
            Next week →
          </Link>
        )}
      </div>

      <div className="mb-3 grid grid-cols-3 gap-1 rounded-xl border border-[color:var(--line)] p-1">
        {SORTS.map((option) => (
          <Link
            key={option.key}
            href={`/leaderboard?week=${weekKey}&sort=${option.key}`}
            className={`rounded-lg py-1.5 text-center text-xs font-bold ${
              option.key === sort ? "bg-masters-500 text-white" : "muted"
            }`}
          >
            {option.label}
          </Link>
        ))}
      </div>

      {board.rows.length === 0 ? (
        <p className="surface rounded-xl px-4 py-8 text-center text-sm muted">
          No one has teed off yet this week. Be the first.
        </p>
      ) : (
        <ol className="overflow-hidden rounded-2xl border border-[color:var(--line)]">
          {board.rows.map((row, i) => {
            const me = row.player.id === meId;
            const value =
              sort === "stableford" ? null : sort === "net" ? row.summary.netToPar : row.summary.toPar;
            return (
              <li
                key={row.player.id}
                className={`flex items-center gap-3 px-3 py-2.5 ${
                  i % 2 === 0 ? "bg-[var(--surface)]" : "bg-cream-50 dark:bg-masters-800"
                } ${me ? "ring-2 ring-inset ring-gold-400" : ""}`}
              >
                <span className="w-7 shrink-0 text-center text-sm font-bold tabular-nums muted">
                  {row.summary.thru === 0 ? "–" : `${row.tied ? "T" : ""}${row.position}`}
                </span>
                <span
                  aria-hidden
                  className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-sm"
                  style={{ background: row.player.accent, color: "#fff" }}
                >
                  {row.player.emoji}
                </span>
                <Link href={`/players/${row.player.handle}?week=${weekKey}`} className="min-w-0 flex-1">
                  <span className="block truncate text-sm font-bold">
                    {row.player.name}
                    {me && <span className="ml-1 text-[10px] font-bold text-gold-600">YOU</span>}
                  </span>
                  <span className="block text-[11px] muted">
                    thru {row.summary.thru} · h&apos;cap {row.player.handicap} ·{" "}
                    {row.summary.stableford} pts
                  </span>
                </Link>
                {sort === "stableford" ? (
                  <span className="font-display text-2xl font-bold tabular-nums">
                    {row.summary.stableford}
                  </span>
                ) : (
                  <ScorePill toPar={row.summary.thru === 0 ? null : value} />
                )}
              </li>
            );
          })}
        </ol>
      )}

      <p className="mt-3 text-center text-[11px] muted">
        {isCurrentWeek
          ? `Board refreshes live. New course opens ${prettyDate(board.resetsOn)}.`
          : "Completed week — this card is closed."}
      </p>
    </div>
  );
}
