import { NextResponse } from "next/server";
import { currentPlayer } from "@/lib/auth";
import { toPlayerView, updateBody, updateHandicap } from "@/lib/game";
import { BODY_LIMITS, isSex } from "@/lib/golf/calories";

export const dynamic = "force-dynamic";

export async function PATCH(request: Request) {
  const player = await currentPlayer();
  if (!player) return NextResponse.json({ error: "Sign in first." }, { status: 401 });

  const body = await request.json().catch(() => null);
  if (!body || typeof body !== "object") {
    return NextResponse.json({ error: "Nothing to change." }, { status: 400 });
  }

  if (body.handicap !== undefined) {
    const raw = Number(body.handicap);
    if (!Number.isFinite(raw)) {
      return NextResponse.json({ error: "Handicap must be a number." }, { status: 400 });
    }
    await updateHandicap(player, raw);
  }

  if (body.sex !== undefined || body.heightCm !== undefined) {
    if (!isSex(body.sex)) {
      return NextResponse.json({ error: "Pick one of the three options." }, { status: 400 });
    }
    const numbers = {
      heightCm: Number(body.heightCm),
      weightKg: Number(body.weightKg),
      age: Number(body.age),
    };
    for (const [field, value] of Object.entries(numbers)) {
      const limit = BODY_LIMITS[field as keyof typeof BODY_LIMITS];
      if (!Number.isFinite(value) || value < limit.min || value > limit.max) {
        return NextResponse.json(
          { error: `${field === "age" ? "Age" : field === "heightCm" ? "Height" : "Weight"} must be between ${limit.min} and ${limit.max}.` },
          { status: 400 },
        );
      }
    }
    const override = Number(body.maintenanceOverride);
    await updateBody(player, {
      sex: body.sex,
      ...numbers,
      maintenanceOverride: Number.isFinite(override) && override > 0 ? Math.round(override) : null,
    });
  }

  const refreshed = await currentPlayer();
  return NextResponse.json({ ok: true, player: toPlayerView(refreshed ?? player) });
}
