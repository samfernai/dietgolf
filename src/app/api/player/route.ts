import { NextResponse } from "next/server";
import { currentPlayer } from "@/lib/auth";
import { updateHandicap } from "@/lib/game";

export const dynamic = "force-dynamic";

export async function PATCH(request: Request) {
  const player = await currentPlayer();
  if (!player) return NextResponse.json({ error: "Sign in first." }, { status: 401 });

  const body = await request.json().catch(() => null);
  const raw = Number(body?.handicap);
  if (!Number.isFinite(raw)) {
    return NextResponse.json({ error: "Handicap must be a number." }, { status: 400 });
  }

  const handicap = await updateHandicap(player, raw);
  return NextResponse.json({ ok: true, handicap });
}
