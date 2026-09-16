import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { eq } from "drizzle-orm";
import AppShell from "@/components/AppShell";
import HoleMap from "@/components/HoleMap";
import { ScorePill, StrokeBox } from "@/components/ScorePill";
import { currentPlayer, toHandle } from "@/lib/auth";
import { db } from "@/lib/db";
import { players } from "@/lib/db/schema";
import { currentWeekKey, loadCard } from "@/lib/game";
import { SLOT_OUTCOMES, SLOT_SPECS } from "@/lib/golf/shots";
import { isValidWeekKey, prettyWeekRange } from "@/lib/time";

export const dynamic = "force-dynamic";

export default async function PlayerPage({
  params,
  searchParams,
}: {
  params: Promise<{ handle: string }>;
  searchParams: Promise<{ week?: string }>;
}) {
  const me = await currentPlayer();
  if (!me) redirect("/join");

  const { handle } = await params;
  const { week } = await searchParams;
  const key = week && isValidWeekKey(week) ? week : currentWeekKey();

  const [player] = await db
    .select()
    .from(players)
    .where(eq(players.handle, toHandle(handle)))
    .limit(1);
  if (!player) notFound();

  const card = await loadCard(player, key);
  const { summary } = card;

  return (
    <AppShell
      title={player.name}
      subtitle={`${card.course.name} · ${prettyWeekRange(key)}`}
      action={
        <div className="shrink-0 text-right">
          <div className="text-[10px] font-bold uppercase tracking-wider text-white/60">Net</div>
          <div className="font-display text-2xl font-bold leading-none text-gold-400">
            {summary.thru === 0 ? "–" : `${summary.netToPar > 0 ? "+" : ""}${summary.netToPar}`}
          </div>
          <div className="text-[10px] text-white/60">thru {summary.thru}</div>
        </div>
      }
    >
      <div className="mb-4 flex items-center gap-3">
        <span
          aria-hidden
          className="flex h-12 w-12 items-center justify-center rounded-full text-xl"
          style={{ background: player.accent, color: "#fff" }}
        >
          {player.emoji}
        </span>
        <div className="flex-1">
          <div className="text-sm font-bold">{player.name}</div>
          <div className="text-xs muted">
            Handicap {card.player.handicap} · {summary.stableford} points this week
          </div>
        </div>
        <ScorePill toPar={summary.thru === 0 ? null : summary.toPar} />
      </div>

      <section className="surface overflow-hidden rounded-2xl">
        <table className="w-full text-sm">
          <thead className="bg-masters-500 text-[10px] uppercase tracking-wider text-white">
            <tr>
              <th className="px-2 py-2 text-left font-semibold">Hole</th>
              <th className="px-1 py-2 text-center font-semibold">Par</th>
              <th className="px-1 py-2 text-center font-semibold">Score</th>
              <th className="px-2 py-2 text-center font-semibold">Pts</th>
            </tr>
          </thead>
          <tbody>
            {card.holes.map(({ hole, result }) => (
              <tr key={hole.dayIndex} className="border-t border-[color:var(--line)]">
                <td className="px-2 py-1.5">
                  <span className="block font-bold">{hole.short}</span>
                  <span className="block text-[10px] muted">{hole.name}</span>
                </td>
                <td className="px-1 py-1.5 text-center tabular-nums">{hole.par}</td>
                <td className="px-1 py-1.5 text-center">
                  <StrokeBox
                    strokes={result.strokes}
                    toPar={result.toPar}
                    noReturn={result.status === "no-return"}
                  />
                </td>
                <td className="px-2 py-1.5 text-center font-bold tabular-nums">
                  {result.strokes === null ? "–" : result.stableford}
                </td>
              </tr>
            ))}
            <tr className="border-t-2 border-masters-500 bg-cream-100 font-bold dark:bg-masters-800">
              <td className="px-2 py-2">Total</td>
              <td className="px-1 py-2 text-center tabular-nums">{card.course.par}</td>
              <td className="px-1 py-2 text-center tabular-nums">{summary.gross || "–"}</td>
              <td className="px-2 py-2 text-center tabular-nums">{summary.stableford}</td>
            </tr>
          </tbody>
        </table>
      </section>

      <section className="mt-5">
        <h2 className="mb-2 text-[11px] font-bold uppercase tracking-wider muted">Their round</h2>
        <ul className="grid grid-cols-4 gap-2">
          {card.holes.map(({ hole, result, shots }) => (
            <li key={hole.dayIndex} className="surface overflow-hidden rounded-xl p-1.5">
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
                <span className="text-[10px] font-bold tabular-nums">{result.strokes ?? "–"}</span>
              </div>
            </li>
          ))}
        </ul>
      </section>

      {summary.shotsLogged > 0 && (
        <section className="mt-6">
          <h2 className="mb-2 text-[11px] font-bold uppercase tracking-wider muted">
            Shot by shot
          </h2>
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
        </section>
      )}

      <p className="mt-6 text-center">
        <Link href="/leaderboard" className="text-sm font-semibold text-masters-500 underline">
          Back to the leaderboard
        </Link>
      </p>
    </AppShell>
  );
}
