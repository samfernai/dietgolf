import { NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { players } from "@/lib/db/schema";
import { startSession, toHandle, verifyPin } from "@/lib/auth";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  const body = await request.json().catch(() => null);
  const name = typeof body?.name === "string" ? body.name.trim() : "";
  const pin = typeof body?.pin === "string" ? body.pin : "";

  const handle = toHandle(name);
  const [player] = handle
    ? await db.select().from(players).where(eq(players.handle, handle)).limit(1)
    : [];

  if (!player || !verifyPin(pin, player.pinHash)) {
    return NextResponse.json({ error: "That name and PIN don't match." }, { status: 401 });
  }

  await startSession(player.id);
  return NextResponse.json({ ok: true, player: { id: player.id, name: player.name } });
}
