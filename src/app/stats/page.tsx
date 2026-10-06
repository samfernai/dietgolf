import { redirect } from "next/navigation";
import AppShell from "@/components/AppShell";
import { currentPlayer } from "@/lib/auth";
import { loadStats } from "@/lib/game";
import { HOLES } from "@/lib/golf/course";
import { STAT_DEFINITIONS, formatStat } from "@/lib/golf/stats";

export const dynamic = "force-dynamic";

export default async function StatsPage() {
  const player = await currentPlayer();
  if (!player) redirect("/join");

  const { stats, field } = await loadStats(player.id);
  const rank = field.findIndex((row) => row.player.id === player.id) + 1;

  if (stats.holes === 0) {
    return (
      <AppShell title="Statistics" subtitle="Nothing to measure yet">
        <p className="surface rounded-xl px-4 py-8 text-center text-sm muted">
          Close out a day or two and the numbers start here. Strokes gained needs someone else on the
          course as well — they are measured against whoever else played the same hole.
        </p>
      </AppShell>
    );
  }

  return (
    <AppShell
      title="Statistics"
      subtitle={`${stats.holes} hole${stats.holes === 1 ? "" : "s"} over ${stats.rounds} round${stats.rounds === 1 ? "" : "s"}`}
      action={
        rank > 0 ? (
          <div className="shrink-0 text-right">
            <div className="text-[10px] font-bold uppercase tracking-wider text-white/60">Scoring</div>
            <div className="font-display text-2xl font-bold leading-none text-gold-400">
              {rank}
              <span className="text-sm">{["st", "nd", "rd"][rank - 1] ?? "th"}</span>
            </div>
            <div className="text-[10px] text-white/60">of {field.length}</div>
          </div>
        ) : null
      }
    >
      <section>
        <ul className="overflow-hidden rounded-2xl border border-[color:var(--line)]">
          {STAT_DEFINITIONS.map((definition, i) => (
            <li
              key={definition.key}
              className={`px-3 py-3 ${i % 2 === 0 ? "bg-[var(--surface)]" : "bg-cream-50 dark:bg-masters-800"}`}
            >
              <div className="flex items-baseline justify-between gap-3">
                <span className="text-sm font-bold">{definition.label}</span>
                <span className="shrink-0 font-display text-lg font-bold tabular-nums">
                  {formatStat(stats[definition.key] as number | null, definition.format)}
                </span>
              </div>
              <p className="mt-0.5 text-[11px] leading-snug muted">{definition.detail}</p>
            </li>
          ))}
        </ul>
      </section>

      <section className="mt-6">
        <h2 className="mb-2 text-[11px] font-bold uppercase tracking-wider muted">
          Scoring average by day
        </h2>
        <ul className="grid grid-cols-7 gap-1 text-center">
          {HOLES.map((hole) => {
            const value = stats.dailyScoringAverage[hole.dayIndex];
            return (
              <li key={hole.dayIndex} className="surface rounded-lg py-2">
                <div className="text-[10px] font-bold uppercase muted">{hole.short}</div>
                <div className="text-sm font-bold tabular-nums">
                  {value === null ? "–" : value.toFixed(1)}
                </div>
                <div className="text-[9px] muted">par {hole.par}</div>
              </li>
            );
          })}
        </ul>
      </section>

      {field.length > 1 && (
        <section className="mt-6">
          <h2 className="mb-2 text-[11px] font-bold uppercase tracking-wider muted">
            Scoring average, everyone
          </h2>
          <ol className="overflow-hidden rounded-2xl border border-[color:var(--line)]">
            {field.map((row, i) => (
              <li
                key={row.player.id}
                className={`flex items-center gap-3 px-3 py-2.5 ${
                  i % 2 === 0 ? "bg-[var(--surface)]" : "bg-cream-50 dark:bg-masters-800"
                } ${row.player.id === player.id ? "ring-2 ring-inset ring-gold-400" : ""}`}
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
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-sm font-bold">{row.player.name}</span>
                  <span className="block text-[11px] muted">
                    {row.stats.holes} hole{row.stats.holes === 1 ? "" : "s"} · GIR{" "}
                    {formatStat(row.stats.greensInRegulation, "percent")}
                  </span>
                </span>
                <span className="font-display text-xl font-bold tabular-nums">
                  {formatStat(row.stats.scoringAverage, "number")}
                </span>
              </li>
            ))}
          </ol>
        </section>
      )}

      <p className="mt-6 text-center text-[11px] leading-relaxed muted">
        These are derived from calorie pace, not measured shots — a fairway hit means you were on
        pace at 10:00. Strokes gained compares you with everyone who played the same hole that week.
      </p>
    </AppShell>
  );
}
