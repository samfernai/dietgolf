import Link from "next/link";
import { formatToPar } from "@/lib/golf/scoring";
import type { SeasonRow } from "@/lib/game";

export default function SeasonTable({ rows, meId }: { rows: SeasonRow[]; meId: string }) {
  if (rows.length === 0) {
    return (
      <p className="surface rounded-xl px-4 py-8 text-center text-sm muted">
        The season starts as soon as someone fills in a card.
      </p>
    );
  }

  return (
    <ol className="overflow-hidden rounded-2xl border border-[color:var(--line)]">
      {rows.map((row, i) => {
        const me = row.player.id === meId;
        return (
          <li
            key={row.player.id}
            className={`flex items-center gap-3 px-3 py-2.5 ${
              i % 2 === 0 ? "bg-[var(--surface)]" : "bg-cream-50 dark:bg-masters-800"
            } ${me ? "ring-2 ring-inset ring-gold-400" : ""}`}
          >
            <span className="w-6 shrink-0 text-center text-sm font-bold tabular-nums muted">
              {i + 1}
            </span>
            <span
              aria-hidden
              className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-sm"
              style={{ background: row.player.accent, color: "#fff" }}
            >
              {row.player.emoji}
            </span>
            <Link href={`/players/${row.player.handle}`} className="min-w-0 flex-1">
              <span className="block truncate text-sm font-bold">{row.player.name}</span>
              <span className="block text-[11px] muted">
                {row.roundsPlayed} round{row.roundsPlayed === 1 ? "" : "s"} · {row.birdies} birdie
                {row.birdies === 1 ? "" : "s"} · best {formatToPar(row.bestToPar)}
              </span>
            </Link>
            <span className="text-right">
              <span className="block font-display text-2xl font-bold leading-none tabular-nums">
                {row.stableford}
              </span>
              <span className="block text-[10px] uppercase tracking-wider muted">pts</span>
            </span>
          </li>
        );
      })}
    </ol>
  );
}
