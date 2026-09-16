import { NextResponse } from "next/server";
import { currentPlayer } from "@/lib/auth";
import { GameError, currentWeekKey, removeShot, saveShot } from "@/lib/game";
import { isOutcome, isSlot } from "@/lib/golf/shots";

export const dynamic = "force-dynamic";

type Payload = {
  dayIndex: number;
  slot: string;
  outcome?: string;
  note?: string | null;
  weekKey?: string;
};

async function readPayload(request: Request): Promise<Payload | null> {
  const body = await request.json().catch(() => null);
  if (!body || typeof body !== "object") return null;
  return body as Payload;
}

export async function POST(request: Request) {
  const player = await currentPlayer();
  if (!player) return NextResponse.json({ error: "Sign in first." }, { status: 401 });

  const body = await readPayload(request);
  if (!body || !isSlot(body.slot) || !isOutcome(body.outcome)) {
    return NextResponse.json({ error: "Unrecognised shot." }, { status: 400 });
  }

  try {
    const card = await saveShot({
      player,
      weekKey: body.weekKey ?? currentWeekKey(),
      dayIndex: Number(body.dayIndex),
      slot: body.slot,
      outcome: body.outcome,
      note: typeof body.note === "string" ? body.note : null,
    });
    return NextResponse.json({ ok: true, card });
  } catch (error) {
    if (error instanceof GameError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }
    throw error;
  }
}

export async function DELETE(request: Request) {
  const player = await currentPlayer();
  if (!player) return NextResponse.json({ error: "Sign in first." }, { status: 401 });

  const body = await readPayload(request);
  if (!body || !isSlot(body.slot)) {
    return NextResponse.json({ error: "Unrecognised shot." }, { status: 400 });
  }

  try {
    const card = await removeShot({
      player,
      weekKey: body.weekKey ?? currentWeekKey(),
      dayIndex: Number(body.dayIndex),
      slot: body.slot,
    });
    return NextResponse.json({ ok: true, card });
  } catch (error) {
    if (error instanceof GameError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }
    throw error;
  }
}
