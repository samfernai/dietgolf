import Link from "next/link";
import { redirect } from "next/navigation";
import AppShell from "@/components/AppShell";
import HoleMap from "@/components/HoleMap";
import { ScorePill, StrokeBox } from "@/components/ScorePill";
import { currentPlayer } from "@/lib/auth";
import { currentWeekKey, loadCard } from "@/lib/game";
import { slugForDay } from "@/lib/golf/course";
import { formatToPar } from "@/lib/golf/scoring";
import { SLOT_OUTCOMES, SLOT_SPECS } from "@/lib/golf/shots";
import { prettyWeekRange } from "@/lib/time";

export const dynamic = "force-dynamic";

export default async function CardPage() {
  const player = await currentPlayer();
  if (!player) redirect("/join");

  const key = currentWeekKey();
  const card = await loadCard(player, key);
  const { summary } = card;

  return (
    <AppShell
      title={card.course.name}
      subtitle={`${prettyWeekRange(key)} · Par ${card.course.par}`}
      action={
        <div className="shrink-0 text-right">
          <div className="text-[10px] font-bold uppercase tracking-wider text-white/60">Gross</div>
          <div className="font-display text-2xl font-bold leading-none text-gold-400">
            {summary.thru === 0 ? "–" : formatToPar(summary.toPar)}
          </div>
          <div className="text-[10px] text-white/60">thru {summary.thru}</div>
        </div>
      }
    >
      <section className="surface overflow-hidden rounded-2xl">
        <table className="w-full text-sm">
          <thead className="bg-masters-500 text-[10px] uppercase tracking-wider text-white">
            <tr>
              <th className="px-2 py-2 text-left font-semibold">Hole</th>
              <th className="px-1 py-2 text-center font-semibold">Par</th>
              <th className="px-1 py-2 text-center font-semibold">S.I.</th>
              <th className="px-1 py-2 text-center font-semibold">Score</th>
              <th className="px-1 py-2 text-center font-semibold">Net</th>
              <th className="px-2 py-2 text-center font-semibold">Pts</th>
            </tr>
          </thead>
          <tbody>
            {card.holes.map(({ hole, result }) => (
              <tr
                key={hole.dayIndex}
                className={`border-t border-[color:var(--line)] ${
                  hole.amenCorner ? "bg-gold-400/10" : ""
                }`}
              >
                <td className="px-2 py-1.5">
                  <Link href={`/play/${slugForDay(hole.dayIndex)}`} className="block">
                    <span className="block font-bold">{hole.short}</span>
                    <span className="block text-[10px] muted">{hole.name}</span>
                  </Link>
                </td>
                <td className="px-1 py-1.5 text-center tabular-nums">{hole.par}</td>
                <td className="px-1 py-1.5 text-center tabular-nums muted">{hole.strokeIndex}</td>
                <td className="px-1 py-1.5 text-center">
                  <StrokeBox
                    strokes={result.strokes}
                    toPar={result.toPar}
                    noReturn={result.status === "no-return"}
                  />
                </td>
                <td className="px-1 py-1.5 text-center tabular-nums muted">
                  {result.netStrokes ?? "–"}
                </td>
                <td className="px-2 py-1.5 text-center font-bold tabular-nums">
                  {result.strokes === null ? "–" : result.stableford}
                </td>
              </tr>
            ))}
            <tr className="border-t-2 border-masters-500 bg-cream-100 font-bold dark:bg-masters-800">
              <td className="px-2 py-2">Total</td>
              <td className="px-1 py-2 text-center tabular-nums">{card.course.par}</td>
              <td className="px-1 py-2" />
              <td className="px-1 py-2 text-center tabular-nums">{summary.gross || "–"}</td>
              <td className="px-1 py-2 text-center tabular-nums">{summary.net || "–"}</td>
              <td className="px-2 py-2 text-center tabular-nums">{summary.stableford}</td>
            </tr>
          </tbody>
        </table>
      </section>

      <div className="mt-3 grid grid-cols-3 gap-2 text-center">
        <div className="surface rounded-xl px-2 py-3">
          <div className="text-[10px] font-bold uppercase tracking-wider muted">Gross</div>
          <div className="mt-1">
            <ScorePill toPar={summary.thru === 0 ? null : summary.toPar} />
          </div>
        </div>
        <div className="surface rounded-xl px-2 py-3">
          <div className="text-[10px] font-bold uppercase tracking-wider muted">
            Net (h&apos;cap {card.player.handicap})
          </div>
          <div className="mt-1">
            <ScorePill toPar={summary.thru === 0 ? null : summary.netToPar} />
          </div>
        </div>
        <div className="surface rounded-xl px-2 py-3">
          <div className="text-[10px] font-bold uppercase tracking-wider muted">Points</div>
          <div className="mt-1 font-display text-2xl font-bold leading-none">
            {summary.stableford}
          </div>
        </div>
      </div>

      <section className="mt-6">
        <h2 className="mb-2 text-[11px] font-bold uppercase tracking-wider muted">The course</h2>
        <ul className="grid grid-cols-4 gap-2">
          {card.holes.map(({ hole, result, shots }) => (
            <li key={hole.dayIndex}>
              <Link
                href={`/play/${slugForDay(hole.dayIndex)}`}
                className="surface block overflow-hidden rounded-xl p-1.5"
              >
                <HoleMap
                  seed={hole.designSeed}
                  par={hole.par}
                  outcomes={shots.map((shot) => shot.outcome)}
                  holedOut={result.status === "played"}
                  compact
                  className="h-24 w-full rounded-lg"
                />
                <div className="mt-1 flex items-center justify-between px-0.5">
                  <span className="text-[10px] font-bold uppercase">{hole.short}</span>
                  <span className="text-[10px] font-bold tabular-nums">
                    {result.strokes ?? "–"}
                  </span>
                </div>
              </Link>
            </li>
          ))}
        </ul>
      </section>

      <section className="mt-6">
        <h2 className="mb-2 text-[11px] font-bold uppercase tracking-wider muted">
          Round narrative
        </h2>
        {summary.shotsLogged === 0 ? (
          <p className="surface rounded-xl px-4 py-5 text-center text-sm muted">
            Nothing logged yet this week.{" "}
            <Link href="/play" className="font-semibold text-masters-500 underline">
              Play your first shot
            </Link>
            .
          </p>
        ) : (
          <ul className="space-y-3">
            {card.holes
              .filter((entry) => entry.shots.length > 0)
              .map(({ hole, result, shots }) => (
                <li key={hole.dayIndex} className="surface rounded-xl p-3">
                  <div className="flex items-baseline justify-between">
                    <h3 className="text-sm font-bold">
                      {hole.day} · {hole.name}
                    </h3>
                    <span className="text-xs font-semibold muted">
                      {result.strokes} ({result.label})
                    </span>
                  </div>
                  <ol className="mt-2 space-y-1.5">
                    {shots.map((shot, i) => (
                      <li key={shot.slot} className="text-xs leading-snug">
                        <span className="font-bold tabular-nums muted">{i + 1}. </span>
                        <span className="font-semibold">
                          {SLOT_OUTCOMES[shot.slot][shot.outcome].title}
                        </span>
                        <span className="muted"> — {SLOT_SPECS[shot.slot].label}</span>
                        {shot.note && <span className="block pl-4 italic muted">“{shot.note}”</span>}
                      </li>
                    ))}
                  </ol>
                </li>
              ))}
          </ul>
        )}
      </section>
    </AppShell>
  );
}
