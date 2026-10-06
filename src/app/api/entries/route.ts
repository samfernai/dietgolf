import { NextResponse } from "next/server";
import { currentPlayer } from "@/lib/auth";
import { GameError, currentWeekKey, removeEntry, saveBurn, saveIntake } from "@/lib/game";
import { clampCalories, isIntakeCategory } from "@/lib/golf/calories";
import { MINUTES_IN_DAY } from "@/lib/golf/checkpoints";

export const dynamic = "force-dynamic";

type Payload = {
  kind?: string;
  weekKey?: string;
  dayIndex?: number;
  entryId?: string | null;
  category?: string;
  calories?: number;
  note?: string | null;
  activity?: string | null;
  minutes?: number;
};

async function readPayload(request: Request): Promise<Payload | null> {
  const body = await request.json().catch(() => null);
  return body && typeof body === "object" ? (body as Payload) : null;
}

function handle(error: unknown) {
  if (error instanceof GameError) {
    return NextResponse.json({ error: error.message }, { status: error.status });
  }
  throw error;
}

export async function POST(request: Request) {
  const player = await currentPlayer();
  if (!player) return NextResponse.json({ error: "Sign in first." }, { status: 401 });

  const body = await readPayload(request);
  if (!body) return NextResponse.json({ error: "Nothing to save." }, { status: 400 });

  const weekKey = body.weekKey ?? currentWeekKey(player.timezone ?? undefined);
  const dayIndex = Number(body.dayIndex);
  const calories = clampCalories(Number(body.calories));
  const minutes = Number.isFinite(Number(body.minutes))
    ? Math.min(Math.max(Number(body.minutes), 0), MINUTES_IN_DAY - 1)
    : 0;

  try {
    if (body.kind === "burn") {
      const card = await saveBurn({
        player,
        weekKey,
        dayIndex,
        entryId: body.entryId ?? null,
        calories,
        activity: typeof body.activity === "string" ? body.activity : null,
        minutes,
      });
      return NextResponse.json({ ok: true, card });
    }

    if (!isIntakeCategory(body.category)) {
      return NextResponse.json({ error: "Unrecognised meal." }, { status: 400 });
    }

    const card = await saveIntake({
      player,
      weekKey,
      dayIndex,
      entryId: body.entryId ?? null,
      category: body.category,
      calories,
      note: typeof body.note === "string" ? body.note : null,
      minutes,
    });
    return NextResponse.json({ ok: true, card });
  } catch (error) {
    return handle(error);
  }
}

export async function DELETE(request: Request) {
  const player = await currentPlayer();
  if (!player) return NextResponse.json({ error: "Sign in first." }, { status: 401 });

  const body = await readPayload(request);
  if (!body?.entryId) return NextResponse.json({ error: "Nothing to remove." }, { status: 400 });

  try {
    const card = await removeEntry({
      player,
      weekKey: body.weekKey ?? currentWeekKey(player.timezone ?? undefined),
      dayIndex: Number(body.dayIndex),
      entryId: body.entryId,
      kind: body.kind === "burn" ? "burn" : "intake",
    });
    return NextResponse.json({ ok: true, card });
  } catch (error) {
    return handle(error);
  }
}
