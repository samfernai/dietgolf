import { redirect } from "next/navigation";
import AppShell from "@/components/AppShell";
import SettingsForm from "@/components/SettingsForm";
import { currentPlayer } from "@/lib/auth";
import { NO_RETURN_OVER_PAR, shotsReceived } from "@/lib/golf/scoring";
import { GRADE_TO_PAR, gradeLabel, gradeRange, gradesForPar } from "@/lib/golf/calories";
import { checkpointsForPar } from "@/lib/golf/checkpoints";
import { currentWeekKey, loadCard, toPlayerView } from "@/lib/game";

export const dynamic = "force-dynamic";

export default async function SettingsPage() {
  const player = await currentPlayer();
  if (!player) redirect("/join");

  const view = toPlayerView(player);
  const card = await loadCard(player, currentWeekKey(view.timezone));

  return (
    <AppShell title={player.name} subtitle={`${view.maintenance.toLocaleString()} cal · h'cap ${player.handicap}`}>
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

      <SettingsForm player={view} />

      <section className="surface mt-6 rounded-2xl p-4">
        <h2 className="text-sm font-bold">Your scoring bands</h2>
        <p className="mt-1 text-xs muted">
          Net calories for the day — what you ate, minus what you burned, minus the{" "}
          {view.maintenance.toLocaleString()} your body needs.
          {view.sex === "female" && " Women play off bands 15% tighter."}
        </p>
        <div className="mt-3 overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="text-[10px] uppercase tracking-wider muted">
              <tr>
                <th className="pb-1 text-left font-semibold">Score</th>
                <th className="pb-1 text-right font-semibold">Net calories</th>
              </tr>
            </thead>
            <tbody>
              {gradesForPar(4).map((grade) => (
                <tr key={grade} className="border-t border-[color:var(--line)]">
                  <td className="py-1.5 font-semibold">
                    {gradeLabel(4, grade)}
                    <span className="ml-1.5 text-[11px] tabular-nums muted">
                      {GRADE_TO_PAR[grade] > 0 ? `+${GRADE_TO_PAR[grade]}` : GRADE_TO_PAR[grade] === 0 ? "E" : GRADE_TO_PAR[grade]}
                    </span>
                  </td>
                  <td className="py-1.5 text-right tabular-nums">{gradeRange(grade, view.sex)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <p className="mt-3 text-xs leading-relaxed muted">
          A par 3 has no eagle — one under is a birdie and two under is the hole itself, so only an
          albatross-sized deficit aces it. A day in the past you never closed out is a no return,
          worth {NO_RETURN_OVER_PAR} over par.
        </p>
      </section>

      <section className="surface mt-6 rounded-2xl p-4">
        <h2 className="text-sm font-bold">When shots are played</h2>
        <p className="mt-1 text-xs muted">
          Each hole is checked at these times. Maintenance is spread across the day, so a checkpoint
          asks whether you are on pace right now — not whether you have eaten a full day already.
        </p>
        <ul className="mt-3 space-y-2">
          {[3, 4, 5].map((par) => (
            <li key={par} className="flex items-baseline gap-3 text-xs">
              <span className="w-12 shrink-0 font-bold">Par {par}</span>
              <span className="flex flex-wrap gap-1.5">
                {checkpointsForPar(par).map((checkpoint) => (
                  <span
                    key={checkpoint.time}
                    className="rounded bg-cream-100 px-1.5 py-0.5 font-semibold tabular-nums dark:bg-masters-800"
                  >
                    {checkpoint.time}
                  </span>
                ))}
              </span>
            </li>
          ))}
        </ul>
      </section>

      <section className="surface mt-6 rounded-2xl p-4">
        <h2 className="text-sm font-bold">Your shots on this course</h2>
        <p className="mt-1 text-xs muted">
          A handicap of {player.handicap} scales to {Math.round((player.handicap * 7) / 18)} shots
          over seven holes, handed out by stroke index. This week is{" "}
          {card.course.tournament ?? card.course.name}, par {card.course.par}.
        </p>
        <ul className="mt-3 grid grid-cols-7 gap-1 text-center">
          {card.course.holes.map((hole) => (
            <li key={hole.dayIndex} className="rounded-lg border border-[color:var(--line)] py-1.5">
              <div className="text-[10px] font-bold uppercase">{hole.short}</div>
              <div className="text-sm font-bold tabular-nums">
                {shotsReceived(player.handicap, hole.strokeIndex)}
              </div>
              <div className="text-[9px] muted">par {hole.par}</div>
            </li>
          ))}
        </ul>
      </section>
    </AppShell>
  );
}
