import { NextResponse } from "next/server";
import { currentPlayer } from "@/lib/auth";
import { GameError, currentWeekKey, setDayComplete } from "@/lib/game";

export const dynamic = "force-dynamic";

/** Closing a day out is what makes the hole count towards the card. */
export async function POST(request: Request) {
  const player = await currentPlayer();
  if (!player) return NextResponse.json({ error: "Sign in first." }, { status: 401 });

  const body = await request.json().catch(() => null);
  if (!body || typeof body !== "object") {
    return NextResponse.json({ error: "Nothing to do." }, { status: 400 });
  }

  try {
    const card = await setDayComplete({
      player,
      weekKey: body.weekKey ?? currentWeekKey(player.timezone ?? undefined),
      dayIndex: Number(body.dayIndex),
      complete: body.complete !== false,
    });
    return NextResponse.json({ ok: true, card });
  } catch (error) {
    if (error instanceof GameError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }
    throw error;
  }
}
