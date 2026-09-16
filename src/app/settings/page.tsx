import { redirect } from "next/navigation";
import AppShell from "@/components/AppShell";
import SettingsForm from "@/components/SettingsForm";
import { currentPlayer } from "@/lib/auth";
import { COURSE_PAR, HOLES } from "@/lib/golf/course";
import { NO_RETURN_OVER_PAR } from "@/lib/golf/scoring";
import { OUTCOMES, OUTCOME_SPECS, SLOTS, SLOT_SPECS } from "@/lib/golf/shots";
import { currentWeekKey, loadCard } from "@/lib/game";
import { shotsReceived } from "@/lib/golf/scoring";

export const dynamic = "force-dynamic";

export default async function SettingsPage() {
  const player = await currentPlayer();
  if (!player) redirect("/join");
  const card = await loadCard(player, currentWeekKey());

  return (
    <AppShell title={player.name} subtitle={`Handicap ${player.handicap}`}>
      <div className="mb-5 flex items-center gap-3">
        <span
          aria-hidden
          className="flex h-14 w-14 items-center justify-center rounded-full text-2xl"
          style={{ background: player.accent, color: "#fff" }}
        >
          {player.emoji}
        </span>
        <div>
          <div className="font-display text-xl font-bold">{player.name}</div>
          <div className="text-xs muted">
            Playing as @{player.handle} · {card.summary.stableford} points this week
          </div>
        </div>
      </div>

      <SettingsForm handicap={player.handicap} />

      <section className="mt-6 surface rounded-2xl p-4">
        <h2 className="text-sm font-bold">Your shots on this course</h2>
        <p className="mt-1 text-xs muted">
          A handicap of {player.handicap} scales to {Math.round((player.handicap * 7) / 18)} shots
          over seven holes, handed out by stroke index.
        </p>
        <ul className="mt-3 grid grid-cols-7 gap-1 text-center">
          {HOLES.map((hole) => (
            <li key={hole.dayIndex} className="rounded-lg border border-[color:var(--line)] py-1.5">
              <div className="text-[10px] font-bold uppercase">{hole.short}</div>
              <div className="text-sm font-bold tabular-nums">
                {shotsReceived(player.handicap, hole.strokeIndex)}
              </div>
            </li>
          ))}
        </ul>
      </section>

      <section className="mt-6 surface rounded-2xl p-4">
        <h2 className="text-sm font-bold">How scoring works</h2>
        <p className="mt-2 text-xs leading-relaxed muted">
          The course is {COURSE_PAR} par over seven holes — one for each day. Every meal you log is
          a shot, and its rating moves the hole score relative to par.
        </p>
        <ul className="mt-3 space-y-1.5">
          {OUTCOMES.map((key) => {
            const spec = OUTCOME_SPECS[key];
            return (
              <li key={key} className="flex items-center gap-2 text-xs">
                <span
                  aria-hidden
                  className="h-3 w-3 shrink-0 rounded-full"
                  style={{ background: spec.color }}
                />
                <span className="flex-1 font-semibold">
                  {spec.emoji} {spec.short}
                </span>
                <span className="font-bold tabular-nums">
                  {spec.delta > 0 ? `+${spec.delta}` : spec.delta === 0 ? "level" : spec.delta}
                </span>
              </li>
            );
          })}
        </ul>
        <p className="mt-3 text-xs leading-relaxed muted">
          Shots play in order: {SLOTS.map((slot) => SLOT_SPECS[slot].label).join(", ")}. A hole can
          never be better than two under par, and never worse than six over. A day that slips past
          unlogged is a no return and goes down as {NO_RETURN_OVER_PAR} over par — so it always pays
          to fill the card in, however the day went.
        </p>
      </section>
    </AppShell>
  );
}
