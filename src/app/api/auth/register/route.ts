import { NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { players } from "@/lib/db/schema";
import {
  bagTagFor,
  hashPin,
  startSession,
  toHandle,
  validateName,
  validatePin,
} from "@/lib/auth";
import { clampHandicap } from "@/lib/golf/scoring";
import { BODY_LIMITS, clampBody, isSex, maintenanceCalories } from "@/lib/golf/calories";
import { currentWeekKey, ensureCourse } from "@/lib/game";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  const body = await request.json().catch(() => null);
  const name = typeof body?.name === "string" ? body.name.trim() : "";
  const pin = typeof body?.pin === "string" ? body.pin : "";
  const handicap = clampHandicap(Number(body?.handicap ?? 0));

  const nameError = validateName(name) ?? validatePin(pin);
  if (nameError) return NextResponse.json({ error: nameError }, { status: 400 });

  // Body metrics are what the calorie scoring works from, so they are required
  // at the door rather than left to be filled in later.
  if (!isSex(body?.sex)) {
    return NextResponse.json({ error: "Pick one of the three options." }, { status: 400 });
  }
  const measurements = {
    heightCm: Number(body?.heightCm),
    weightKg: Number(body?.weightKg),
    age: Number(body?.age),
  };
  for (const [field, value] of Object.entries(measurements)) {
    const limit = BODY_LIMITS[field as keyof typeof BODY_LIMITS];
    if (!Number.isFinite(value) || value < limit.min || value > limit.max) {
      const label = field === "age" ? "Age" : field === "heightCm" ? "Height in cm" : "Weight in kg";
      return NextResponse.json(
        { error: `${label} must be between ${limit.min} and ${limit.max}.` },
        { status: 400 },
      );
    }
  }
  const measured = clampBody({ sex: body.sex, ...measurements });

  const handle = toHandle(name);
  const [existing] = await db.select().from(players).where(eq(players.handle, handle)).limit(1);
  if (existing) {
    return NextResponse.json(
      { error: "Someone is already playing under that name. Sign in instead." },
      { status: 409 },
    );
  }

  const tag = bagTagFor(handle);
  const [player] = await db
    .insert(players)
    .values({
      name,
      handle,
      pinHash: hashPin(pin),
      handicap,
      sex: measured.sex,
      heightCm: measured.heightCm,
      weightKg: measured.weightKg,
      age: measured.age,
      ...tag,
    })
    .returning();

  // Make sure this week's course exists so the new player has somewhere to play.
  await ensureCourse(currentWeekKey());
  await startSession(player.id);
  return NextResponse.json({
    ok: true,
    player: { id: player.id, name: player.name, maintenance: maintenanceCalories(measured) },
  });
}
