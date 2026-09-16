import { createHmac, randomBytes, scryptSync, timingSafeEqual } from "node:crypto";
import { cookies } from "next/headers";
import { eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { players, type Player } from "@/lib/db/schema";

const COOKIE_NAME = "dg_session";
const SESSION_DAYS = 120;

function secret(): string {
  const value = process.env.SESSION_SECRET;
  if (!value || value.length < 16) {
    if (process.env.NODE_ENV === "production") {
      throw new Error("SESSION_SECRET must be set to a random string of at least 16 characters.");
    }
    return "dev-only-insecure-session-secret";
  }
  return value;
}

/* ----------------------------- PINs ----------------------------- */

export function hashPin(pin: string): string {
  const salt = randomBytes(16).toString("hex");
  const derived = scryptSync(pin, salt, 64).toString("hex");
  return `${salt}:${derived}`;
}

export function verifyPin(pin: string, stored: string): boolean {
  const [salt, derived] = stored.split(":");
  if (!salt || !derived) return false;
  const expected = Buffer.from(derived, "hex");
  const actual = scryptSync(pin, salt, expected.length);
  return expected.length === actual.length && timingSafeEqual(expected, actual);
}

/* --------------------------- Identity --------------------------- */

/** Login key for a name: case and punctuation insensitive. */
export function toHandle(name: string): string {
  return name
    .normalize("NFKD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

export function validateName(name: string): string | null {
  const trimmed = name.trim();
  if (trimmed.length < 2) return "Name needs at least 2 characters.";
  if (trimmed.length > 30) return "Name must be 30 characters or fewer.";
  if (!toHandle(trimmed)) return "Name needs at least one letter or number.";
  return null;
}

export function validatePin(pin: string): string | null {
  if (!/^\d{4}$/.test(pin)) return "PIN must be exactly 4 digits.";
  return null;
}

/* --------------------------- Sessions --------------------------- */

function sign(payload: string): string {
  return createHmac("sha256", secret()).update(payload).digest("base64url");
}

function serialise(playerId: string): string {
  const expires = Date.now() + SESSION_DAYS * 86_400_000;
  const payload = `${playerId}.${expires}`;
  return `${payload}.${sign(payload)}`;
}

function deserialise(token: string): string | null {
  const parts = token.split(".");
  if (parts.length !== 3) return null;
  const [playerId, expires, signature] = parts;
  const expected = sign(`${playerId}.${expires}`);
  const a = Buffer.from(signature);
  const b = Buffer.from(expected);
  if (a.length !== b.length || !timingSafeEqual(a, b)) return null;
  if (!Number(expires) || Number(expires) < Date.now()) return null;
  return playerId;
}

export async function startSession(playerId: string): Promise<void> {
  const store = await cookies();
  store.set(COOKIE_NAME, serialise(playerId), {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: SESSION_DAYS * 86_400,
  });
}

export async function endSession(): Promise<void> {
  const store = await cookies();
  store.delete(COOKIE_NAME);
}

/** The signed-in player, or null. */
export async function currentPlayer(): Promise<Player | null> {
  const store = await cookies();
  const token = store.get(COOKIE_NAME)?.value;
  if (!token) return null;
  const playerId = deserialise(token);
  if (!playerId) return null;
  const [player] = await db.select().from(players).where(eq(players.id, playerId)).limit(1);
  return player ?? null;
}

export async function requirePlayer(): Promise<Player> {
  const player = await currentPlayer();
  if (!player) throw new Error("UNAUTHENTICATED");
  return player;
}

/* ------------------------- Bag tag styling ------------------------ */

export const ACCENTS = [
  "#006747", "#FAD02E", "#1F6FB2", "#B3313C", "#7A4FA3",
  "#E07A1F", "#0F8F7E", "#4B5D2A", "#C2185B", "#3E4C59",
];

export const EMOJIS = ["🏌️", "⛳", "🦅", "🐦", "🎯", "🍏", "🥑", "🏆", "🧢", "🫒"];

export function bagTagFor(handle: string): { accent: string; emoji: string } {
  let hash = 0;
  for (let i = 0; i < handle.length; i++) hash = (hash * 31 + handle.charCodeAt(i)) >>> 0;
  return {
    accent: ACCENTS[hash % ACCENTS.length],
    emoji: EMOJIS[(hash >>> 8) % EMOJIS.length],
  };
}
