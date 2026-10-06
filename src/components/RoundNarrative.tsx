import Link from "next/link";
import HoleMap from "@/components/HoleMap";
import type { HoleCard } from "@/lib/game";
import { CATEGORY_LABELS } from "@/lib/golf/calories";
import { slugForDay } from "@/lib/golf/course";
import { shotsFromCheckpoints, shotsFromOutcomes, type MapShot } from "@/lib/golf/mapping";
import { timeFromMinutes } from "@/lib/golf/checkpoints";
import { SLOT_OUTCOMES, SLOT_SPECS } from "@/lib/golf/shots";

export function mapShotsFor(entry: HoleCard): MapShot[] {
  return entry.mode === "calories"
    ? shotsFromCheckpoints(entry.evaluation?.checkpoints ?? [])
    : shotsFromOutcomes(entry.shots.map((shot) => shot.outcome));
}

/** The week's seven holes as small drawn cards. */
export function HoleThumbs({ holes, linked = true }: { holes: HoleCard[]; linked?: boolean }) {
  return (
    <ul className="grid grid-cols-4 gap-2">
      {holes.map((entry) => {
        const inner = (
          <>
            <HoleMap
              seed={entry.hole.designSeed}
              par={entry.hole.par}
              shots={mapShotsFor(entry)}
              holedOut={entry.result.status === "played"}
              compact
              className="h-24 w-full rounded-lg"
            />
            <div className="mt-1 flex items-center justify-between px-0.5">
              <span className="text-[10px] font-bold uppercase">{entry.hole.short}</span>
              <span className="text-[10px] font-bold tabular-nums">{entry.result.strokes ?? "–"}</span>
            </div>
          </>
        );
        return (
          <li key={entry.hole.dayIndex} className={linked ? "" : "surface overflow-hidden rounded-xl p-1.5"}>
            {linked ? (
              <Link href={`/play/${slugForDay(entry.hole.dayIndex)}`} className="surface block overflow-hidden rounded-xl p-1.5">
                {inner}
              </Link>
            ) : (
              inner
            )}
          </li>
        );
      })}
    </ul>
  );
}

/** Hole by hole: what was eaten, what was burned, and what it came to. */
export default function RoundNarrative({ holes }: { holes: HoleCard[] }) {
  const played = holes.filter(
    (entry) => entry.intake.length > 0 || entry.burn.length > 0 || entry.shots.length > 0,
  );

  if (played.length === 0) {
    return (
      <p className="surface rounded-xl px-4 py-5 text-center text-sm muted">
        Nothing logged yet this week.
      </p>
    );
  }

  return (
    <ul className="space-y-3">
      {played.map((entry) => (
        <li key={entry.hole.dayIndex} className="surface rounded-xl p-3">
          <div className="flex items-baseline justify-between gap-2">
            <h3 className="text-sm font-bold">
              {entry.hole.day} · {entry.hole.name}
            </h3>
            <span className="shrink-0 text-xs font-semibold muted">
              {entry.result.strokes !== null ? `${entry.result.strokes} (${entry.result.label})` : entry.result.label}
            </span>
          </div>

          {entry.mode === "ratings" ? (
            <ol className="mt-2 space-y-1.5">
              {entry.shots.map((shot, i) => (
                <li key={shot.slot} className="text-xs leading-snug">
                  <span className="font-bold tabular-nums muted">{i + 1}. </span>
                  <span className="font-semibold">{SLOT_OUTCOMES[shot.slot][shot.outcome].title}</span>
                  <span className="muted"> — {SLOT_SPECS[shot.slot].label}</span>
                  {shot.note && <span className="block pl-4 italic muted">“{shot.note}”</span>}
                </li>
              ))}
            </ol>
          ) : (
            <>
              <ul className="mt-2 space-y-1">
                {entry.intake.map((item) => (
                  <li key={item.id} className="flex gap-2 text-xs leading-snug">
                    <span className="w-10 shrink-0 tabular-nums muted">{timeFromMinutes(item.minutes)}</span>
                    <span className="min-w-0 flex-1">
                      <span className="font-semibold">{CATEGORY_LABELS[item.category].label}</span>
                      {item.note && <span className="muted"> — {item.note}</span>}
                    </span>
                    <span className="shrink-0 font-bold tabular-nums">{item.calories.toLocaleString()}</span>
                  </li>
                ))}
                {entry.burn.map((item) => (
                  <li key={item.id} className="flex gap-2 text-xs leading-snug">
                    <span className="w-10 shrink-0 tabular-nums muted">{timeFromMinutes(item.minutes)}</span>
                    <span className="min-w-0 flex-1 font-semibold text-masters-500">
                      {item.activity || "Exercise"}
                    </span>
                    <span className="shrink-0 font-bold tabular-nums text-masters-500">
                      −{item.calories.toLocaleString()}
                    </span>
                  </li>
                ))}
              </ul>
              {entry.evaluation && (
                <p className="mt-2 border-t border-[color:var(--line)] pt-2 text-xs font-semibold">
                  <span className="muted">Balance against {entry.maintenance.toLocaleString()} needed: </span>
                  <span className={entry.evaluation.balance <= 0 ? "text-[var(--color-under)]" : ""}>
                    {entry.evaluation.balance > 0 ? "+" : ""}
                    {entry.evaluation.balance.toLocaleString()}
                  </span>
                  {!entry.completed && <span className="muted"> · not closed out</span>}
                </p>
              )}
            </>
          )}
        </li>
      ))}
    </ul>
  );
}
