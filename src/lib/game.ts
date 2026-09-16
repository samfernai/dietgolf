import { and, asc, desc, eq, inArray } from "drizzle-orm";
import { db } from "@/lib/db";
import { courses, players, rounds, shots, type Course, type Player } from "@/lib/db/schema";
import { generateCourse, type GeneratedHole } from "@/lib/golf/course";
import {
  clampHandicap,
  summariseRound,
  type HoleInput,
  type HoleResult,
  type RoundSummary,
} from "@/lib/golf/scoring";
import { orderShots, type OutcomeKey, type SlotKey } from "@/lib/golf/shots";
import { addDays, today as todayInZone, weekKey, weekStart } from "@/lib/time";

export type LoggedShot = {
  slot: SlotKey;
  outcome: OutcomeKey;
  note: string | null;
};

export type HoleCard = {
  hole: GeneratedHole;
  result: HoleResult;
  shots: LoggedShot[];
};

export type Card = {
  course: CourseView;
  player: PlayerView;
  holes: HoleCard[];
  summary: RoundSummary;
  /** True when this is the live week and the card can still be filled in. */
  editable: boolean;
};

export type CourseView = {
  weekKey: string;
  name: string;
  weekStart: string;
  par: number;
  holes: GeneratedHole[];
};

export type PlayerView = {
  id: string;
  name: string;
  handle: string;
  handicap: number;
  accent: string;
  emoji: string;
};

export function toPlayerView(player: Player): PlayerView {
  return {
    id: player.id,
    name: player.name,
    handle: player.handle,
    handicap: player.handicap,
    accent: player.accent,
    emoji: player.emoji,
  };
}

export function currentWeekKey(): string {
  return weekKey(todayInZone());
}

function toCourseView(course: Course): CourseView {
  return {
    weekKey: course.weekKey,
    name: course.name,
    weekStart: course.weekStart,
    par: course.holes.reduce((total, hole) => total + hole.par, 0),
    holes: [...course.holes].sort((a, b) => a.dayIndex - b.dayIndex),
  };
}

/**
 * Courses open on a Monday and never change afterwards, so the generated layout
 * is written to the database the first time anyone asks for that week.
 */
export async function ensureCourse(key: string): Promise<CourseView> {
  const [existing] = await db.select().from(courses).where(eq(courses.weekKey, key)).limit(1);
  if (existing) return toCourseView(existing);

  const generated = generateCourse(key);
  const [inserted] = await db
    .insert(courses)
    .values({
      weekKey: generated.weekKey,
      name: generated.name,
      weekStart: generated.weekStart,
      seed: generated.seed,
      holes: generated.holes,
    })
    .onConflictDoNothing()
    .returning();

  if (inserted) return toCourseView(inserted);
  const [raced] = await db.select().from(courses).where(eq(courses.weekKey, key)).limit(1);
  return toCourseView(raced!);
}

async function ensureRound(playerId: string, key: string, handicap: number): Promise<string> {
  const [existing] = await db
    .select({ id: rounds.id })
    .from(rounds)
    .where(and(eq(rounds.playerId, playerId), eq(rounds.weekKey, key)))
    .limit(1);
  if (existing) return existing.id;

  const [inserted] = await db
    .insert(rounds)
    .values({ playerId, weekKey: key, handicap })
    .onConflictDoNothing()
    .returning({ id: rounds.id });
  if (inserted) return inserted.id;

  const [raced] = await db
    .select({ id: rounds.id })
    .from(rounds)
    .where(and(eq(rounds.playerId, playerId), eq(rounds.weekKey, key)))
    .limit(1);
  return raced!.id;
}

function buildHoleCards(
  course: CourseView,
  shotsByDay: Map<number, LoggedShot[]>,
  handicap: number,
  today: string,
): { holes: HoleCard[]; summary: RoundSummary } {
  const inputs: HoleInput[] = course.holes.map((hole) => ({
    dayIndex: hole.dayIndex,
    date: hole.date ?? addDays(course.weekStart, hole.dayIndex),
    shots: shotsByDay.get(hole.dayIndex) ?? [],
  }));

  const summary = summariseRound(inputs, today, handicap);
  const holes: HoleCard[] = course.holes.map((hole, i) => ({
    hole: { ...hole, date: inputs[i].date },
    result: summary.holes[i],
    shots: orderShots(shotsByDay.get(hole.dayIndex) ?? []),
  }));

  return { holes, summary };
}

async function shotsForRounds(roundIds: string[]) {
  if (roundIds.length === 0) return [];
  return db
    .select()
    .from(shots)
    .where(inArray(shots.roundId, roundIds))
    .orderBy(asc(shots.dayIndex));
}

/** A single player's card for a week, whether or not they have started it. */
export async function loadCard(player: Player, key: string): Promise<Card> {
  const course = await ensureCourse(key);
  const today = todayInZone();

  const [round] = await db
    .select()
    .from(rounds)
    .where(and(eq(rounds.playerId, player.id), eq(rounds.weekKey, key)))
    .limit(1);

  const shotsByDay = new Map<number, LoggedShot[]>();
  if (round) {
    for (const row of await shotsForRounds([round.id])) {
      const list = shotsByDay.get(row.dayIndex) ?? [];
      list.push({ slot: row.slot as SlotKey, outcome: row.outcome as OutcomeKey, note: row.note });
      shotsByDay.set(row.dayIndex, list);
    }
  }

  const handicap = round?.handicap ?? player.handicap;
  const { holes, summary } = buildHoleCards(course, shotsByDay, handicap, today);

  return {
    course,
    player: { ...toPlayerView(player), handicap },
    holes,
    summary,
    editable: key === weekKey(today),
  };
}

export type LeaderboardRow = {
  player: PlayerView;
  summary: RoundSummary;
  position: number;
  tied: boolean;
};

export type Leaderboard = {
  course: CourseView;
  rows: LeaderboardRow[];
  today: string;
  /** Monday of the week after this one — when the card resets. */
  resetsOn: string;
};

export type LeaderboardSort = "net" | "gross" | "stableford";

export function sortLeaderboard(rows: LeaderboardRow[], sort: LeaderboardSort): LeaderboardRow[] {
  const ordered = [...rows].sort((a, b) => {
    if (sort === "stableford") {
      if (b.summary.stableford !== a.summary.stableford) {
        return b.summary.stableford - a.summary.stableford;
      }
    } else {
      const key = sort === "net" ? "netToPar" : "toPar";
      // Nobody has teed off yet — keep them below anyone with a score.
      if (a.summary.thru === 0 !== (b.summary.thru === 0)) return a.summary.thru === 0 ? 1 : -1;
      if (a.summary[key] !== b.summary[key]) return a.summary[key] - b.summary[key];
      if (b.summary.thru !== a.summary.thru) return b.summary.thru - a.summary.thru;
    }
    return a.player.name.localeCompare(b.player.name);
  });

  const valueOf = (row: LeaderboardRow) =>
    sort === "stableford"
      ? row.summary.stableford
      : sort === "net"
        ? row.summary.netToPar
        : row.summary.toPar;

  let position = 0;
  return ordered.map((row, i) => {
    const previous = ordered[i - 1];
    const sameAsPrevious = previous !== undefined && valueOf(previous) === valueOf(row);
    if (!sameAsPrevious) position = i + 1;
    const nextRow = ordered[i + 1];
    const tied = sameAsPrevious || (nextRow !== undefined && valueOf(nextRow) === valueOf(row));
    return { ...row, position, tied };
  });
}

export async function loadLeaderboard(key: string, sort: LeaderboardSort = "net"): Promise<Leaderboard> {
  const course = await ensureCourse(key);
  const today = todayInZone();

  const roundRows = await db
    .select({
      roundId: rounds.id,
      handicap: rounds.handicap,
      player: players,
    })
    .from(rounds)
    .innerJoin(players, eq(rounds.playerId, players.id))
    .where(eq(rounds.weekKey, key));

  const allShots = await shotsForRounds(roundRows.map((r) => r.roundId));
  const byRound = new Map<string, Map<number, LoggedShot[]>>();
  for (const row of allShots) {
    const days = byRound.get(row.roundId) ?? new Map<number, LoggedShot[]>();
    const list = days.get(row.dayIndex) ?? [];
    list.push({ slot: row.slot as SlotKey, outcome: row.outcome as OutcomeKey, note: row.note });
    days.set(row.dayIndex, list);
    byRound.set(row.roundId, days);
  }

  const rows: LeaderboardRow[] = roundRows.map(({ roundId, handicap, player }) => {
    const { summary } = buildHoleCards(
      course,
      byRound.get(roundId) ?? new Map(),
      handicap,
      today,
    );
    return { player: { ...toPlayerView(player), handicap }, summary, position: 0, tied: false };
  });

  return {
    course,
    rows: sortLeaderboard(rows, sort),
    today,
    resetsOn: addDays(weekStart(key), 7),
  };
}

/* ---------------------------- Mutations ---------------------------- */

export class GameError extends Error {
  constructor(
    message: string,
    readonly status = 400,
  ) {
    super(message);
  }
}

function assertEditable(course: CourseView, dayIndex: number, today: string): string {
  if (course.weekKey !== weekKey(today)) {
    throw new GameError("That week's card is closed. Only the current week can be edited.", 409);
  }
  const date = addDays(course.weekStart, dayIndex);
  if (date > today) {
    throw new GameError("You can't play a hole before you get to it.", 409);
  }
  return date;
}

export async function saveShot(input: {
  player: Player;
  weekKey: string;
  dayIndex: number;
  slot: SlotKey;
  outcome: OutcomeKey;
  note: string | null;
}): Promise<Card> {
  const { player, dayIndex, slot, outcome } = input;
  if (!Number.isInteger(dayIndex) || dayIndex < 0 || dayIndex > 6) {
    throw new GameError("Unknown hole.");
  }
  const course = await ensureCourse(input.weekKey);
  assertEditable(course, dayIndex, todayInZone());

  const note = input.note?.trim() ? input.note.trim().slice(0, 280) : null;
  const roundId = await ensureRound(player.id, input.weekKey, player.handicap);

  await db
    .insert(shots)
    .values({ roundId, dayIndex, slot, outcome, note })
    .onConflictDoUpdate({
      target: [shots.roundId, shots.dayIndex, shots.slot],
      set: { outcome, note, updatedAt: new Date() },
    });

  return loadCard(player, input.weekKey);
}

export async function removeShot(input: {
  player: Player;
  weekKey: string;
  dayIndex: number;
  slot: SlotKey;
}): Promise<Card> {
  const course = await ensureCourse(input.weekKey);
  assertEditable(course, input.dayIndex, todayInZone());

  const [round] = await db
    .select({ id: rounds.id })
    .from(rounds)
    .where(and(eq(rounds.playerId, input.player.id), eq(rounds.weekKey, input.weekKey)))
    .limit(1);

  if (round) {
    await db
      .delete(shots)
      .where(
        and(
          eq(shots.roundId, round.id),
          eq(shots.dayIndex, input.dayIndex),
          eq(shots.slot, input.slot),
        ),
      );
  }

  return loadCard(input.player, input.weekKey);
}

export async function updateHandicap(player: Player, handicap: number): Promise<number> {
  const value = clampHandicap(handicap);
  await db.update(players).set({ handicap: value }).where(eq(players.id, player.id));
  // The live round follows the player until the week closes.
  await db
    .update(rounds)
    .set({ handicap: value })
    .where(and(eq(rounds.playerId, player.id), eq(rounds.weekKey, currentWeekKey())));
  return value;
}

/* ----------------------------- Season ----------------------------- */

export type SeasonRow = {
  player: PlayerView;
  roundsPlayed: number;
  stableford: number;
  bestToPar: number | null;
  birdies: number;
  pars: number;
  holesPlayed: number;
};

/** Running totals across every course a player has teed it up on. */
export async function loadSeason(limitWeeks = 26): Promise<SeasonRow[]> {
  const today = todayInZone();
  const courseRows = await db
    .select()
    .from(courses)
    .orderBy(desc(courses.weekStart))
    .limit(limitWeeks);
  if (courseRows.length === 0) return [];

  const keys = courseRows.map((c) => c.weekKey);
  const roundRows = await db
    .select({ roundId: rounds.id, weekKey: rounds.weekKey, handicap: rounds.handicap, player: players })
    .from(rounds)
    .innerJoin(players, eq(rounds.playerId, players.id))
    .where(inArray(rounds.weekKey, keys));

  const allShots = await shotsForRounds(roundRows.map((r) => r.roundId));
  const byRound = new Map<string, Map<number, LoggedShot[]>>();
  for (const row of allShots) {
    const days = byRound.get(row.roundId) ?? new Map<number, LoggedShot[]>();
    const list = days.get(row.dayIndex) ?? [];
    list.push({ slot: row.slot as SlotKey, outcome: row.outcome as OutcomeKey, note: row.note });
    days.set(row.dayIndex, list);
    byRound.set(row.roundId, days);
  }

  const courseByKey = new Map(courseRows.map((c) => [c.weekKey, toCourseView(c)]));
  const totals = new Map<string, SeasonRow>();

  for (const { roundId, weekKey: key, handicap, player } of roundRows) {
    const course = courseByKey.get(key);
    if (!course) continue;
    const { holes, summary } = buildHoleCards(course, byRound.get(roundId) ?? new Map(), handicap, today);
    if (summary.holesPlayed === 0) continue;

    const row = totals.get(player.id) ?? {
      player: toPlayerView(player),
      roundsPlayed: 0,
      stableford: 0,
      bestToPar: null,
      birdies: 0,
      pars: 0,
      holesPlayed: 0,
    };

    row.roundsPlayed += 1;
    row.stableford += summary.stableford;
    row.holesPlayed += summary.holesPlayed;
    if (summary.complete) {
      row.bestToPar = row.bestToPar === null ? summary.toPar : Math.min(row.bestToPar, summary.toPar);
    }
    for (const { result } of holes) {
      if (result.status !== "played" || result.toPar === null) continue;
      if (result.toPar < 0) row.birdies += 1;
      else if (result.toPar === 0) row.pars += 1;
    }
    totals.set(player.id, row);
  }

  return [...totals.values()].sort(
    (a, b) => b.stableford - a.stableford || a.player.name.localeCompare(b.player.name),
  );
}
