import { redirect } from "next/navigation";
import AppShell from "@/components/AppShell";
import LeaderboardView from "@/components/LeaderboardView";
import SeasonTable from "@/components/SeasonTable";
import { currentPlayer } from "@/lib/auth";
import {
  currentWeekKey,
  loadLeaderboard,
  loadSeason,
  type LeaderboardSort,
} from "@/lib/game";
import { isValidWeekKey, prettyWeekRange } from "@/lib/time";
import Link from "next/link";

export const dynamic = "force-dynamic";

const SORTS: LeaderboardSort[] = ["net", "gross", "stableford"];

export default async function LeaderboardPage({
  searchParams,
}: {
  searchParams: Promise<{ week?: string; sort?: string; view?: string }>;
}) {
  const player = await currentPlayer();
  if (!player) redirect("/join");

  const params = await searchParams;
  const key = params.week && isValidWeekKey(params.week) ? params.week : currentWeekKey();
  const sort = SORTS.includes(params.sort as LeaderboardSort)
    ? (params.sort as LeaderboardSort)
    : "net";
  const season = params.view === "season";

  const [leaderboard, seasonRows] = await Promise.all([
    loadLeaderboard(key, sort),
    season ? loadSeason() : Promise.resolve([]),
  ]);

  return (
    <AppShell
      title={season ? "Season standings" : leaderboard.course.name}
      subtitle={season ? "Every course so far" : prettyWeekRange(key)}
    >
      <div className="mb-4 grid grid-cols-2 gap-1 rounded-xl border border-[color:var(--line)] p-1">
        <Link
          href="/leaderboard"
          className={`rounded-lg py-2 text-center text-sm font-bold ${
            season ? "muted" : "bg-masters-500 text-white"
          }`}
        >
          This week
        </Link>
        <Link
          href="/leaderboard?view=season"
          className={`rounded-lg py-2 text-center text-sm font-bold ${
            season ? "bg-masters-500 text-white" : "muted"
          }`}
        >
          Season
        </Link>
      </div>

      {season ? (
        <SeasonTable rows={seasonRows} meId={player.id} />
      ) : (
        <LeaderboardView
          initial={leaderboard}
          sort={sort}
          meId={player.id}
          isCurrentWeek={key === currentWeekKey()}
        />
      )}
    </AppShell>
  );
}
