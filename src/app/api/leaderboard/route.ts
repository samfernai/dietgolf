import { NextResponse } from "next/server";
import { currentWeekKey, loadLeaderboard, type LeaderboardSort } from "@/lib/game";
import { isValidWeekKey } from "@/lib/time";

export const dynamic = "force-dynamic";

const SORTS: LeaderboardSort[] = ["net", "gross", "stableford"];

export async function GET(request: Request) {
  const url = new URL(request.url);
  const week = url.searchParams.get("week");
  const sortParam = url.searchParams.get("sort");
  const sort = SORTS.includes(sortParam as LeaderboardSort)
    ? (sortParam as LeaderboardSort)
    : "net";

  const key = week && isValidWeekKey(week) ? week : currentWeekKey();
  const leaderboard = await loadLeaderboard(key, sort);
  return NextResponse.json(leaderboard);
}
