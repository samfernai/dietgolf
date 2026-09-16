import Link from "next/link";
import { redirect } from "next/navigation";
import { currentPlayer } from "@/lib/auth";
import { COURSE_PAR, HOLES } from "@/lib/golf/course";
import { currentWeekKey, ensureCourse } from "@/lib/game";
import { prettyWeekRange } from "@/lib/time";

export const dynamic = "force-dynamic";

export default async function HomePage() {
  if (await currentPlayer()) redirect("/play");

  const key = currentWeekKey();
  let courseName: string | null = null;
  try {
    courseName = (await ensureCourse(key)).name;
  } catch {
    // The welcome screen is still worth showing if the database is not up yet.
  }

  return (
    <div className="min-h-dvh bg-masters-600 text-white">
      <div className="mx-auto w-full max-w-lg px-4 pb-16 pt-[calc(env(safe-area-inset-top,0px)+3rem)]">
        <p className="text-[11px] font-bold uppercase tracking-[0.3em] text-gold-400">
          {courseName ? `This week at ${courseName}` : "A new course every Monday"}
        </p>
        <h1 className="mt-3 font-display text-5xl font-bold leading-[1.05]">
          Diet Golf
        </h1>
        <p className="mt-4 text-base leading-relaxed text-white/85">
          Play your week like a round of golf. Seven holes, one a day. Every meal is a
          shot &mdash; and a glass of wine is a putt you probably just lipped out.
        </p>

        <Link
          href="/join"
          className="mt-8 flex w-full items-center justify-center rounded-xl bg-gold-400 px-5 py-4 text-base font-bold text-masters-800 shadow-lg shadow-black/20 active:scale-[0.99]"
        >
          Register and tee off
        </Link>

        <section className="mt-12">
          <h2 className="font-display text-lg font-bold text-gold-400">The card</h2>
          <div className="mt-3 overflow-hidden rounded-xl border border-white/15 bg-masters-700/60">
            <table className="w-full text-sm">
              <thead className="bg-black/20 text-[11px] uppercase tracking-wider text-white/60">
                <tr>
                  <th className="px-3 py-2 text-left font-semibold">Hole</th>
                  <th className="px-2 py-2 text-center font-semibold">Par</th>
                  <th className="px-2 py-2 text-center font-semibold">S.I.</th>
                  <th className="px-3 py-2 text-right font-semibold">&nbsp;</th>
                </tr>
              </thead>
              <tbody>
                {HOLES.map((hole) => (
                  <tr key={hole.dayIndex} className="border-t border-white/10">
                    <td className="px-3 py-2 font-semibold">{hole.day}</td>
                    <td className="px-2 py-2 text-center tabular-nums">{hole.par}</td>
                    <td className="px-2 py-2 text-center tabular-nums text-white/70">
                      {hole.strokeIndex}
                    </td>
                    <td className="px-3 py-2 text-right text-[11px] font-bold uppercase tracking-wider text-gold-400">
                      {hole.amenCorner ? "Amen Corner" : ""}
                    </td>
                  </tr>
                ))}
                <tr className="border-t border-white/20 bg-black/20 font-bold">
                  <td className="px-3 py-2">Total</td>
                  <td className="px-2 py-2 text-center tabular-nums">{COURSE_PAR}</td>
                  <td colSpan={2} />
                </tr>
              </tbody>
            </table>
          </div>
          <p className="mt-2 text-xs text-white/60">{prettyWeekRange(key)}</p>
        </section>

        <section className="mt-10 space-y-4 text-sm leading-relaxed text-white/85">
          <h2 className="font-display text-lg font-bold text-gold-400">How you score</h2>
          <p>
            Rate breakfast, lunch, dinner, snacks and drinks as shots. A clean choice is
            striped down the middle and takes a stroke <strong>off</strong> the hole. A
            takeaway is in the trees. Everything adds up to a score against par.
          </p>
          <ul className="space-y-1.5">
            <li>🎯 <strong>Striped it</strong> &mdash; one under</li>
            <li>⛳ <strong>Fairway</strong> &mdash; level</li>
            <li>🌾 <strong>Rough</strong> &mdash; one over</li>
            <li>🌲 <strong>Trees</strong> &mdash; two over</li>
            <li>💦 <strong>Water</strong> &mdash; three over</li>
          </ul>
          <p>
            The leaderboard is live all week and a fresh course opens every Monday
            morning.
          </p>
        </section>

        <p className="mt-10 text-center text-sm text-white/70">
          Already playing?{" "}
          <Link href="/join?mode=signin" className="font-bold text-gold-400 underline">
            Sign in
          </Link>
        </p>
      </div>
    </div>
  );
}
