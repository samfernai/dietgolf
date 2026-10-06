import { and, asc, desc, eq, inArray } from "drizzle-orm";
import { db } from "@/lib/db";
import {
  burnEntries,
  courses,
  holeDays,
  intakeEntries,
  players,
  rounds,
  shots,
  type BurnEntry,
  type Course,
  type HoleDay,
  type IntakeEntry,
  type Player,
} from "@/lib/db/schema";
import { generateCourse, type GeneratedHole } from "@/lib/golf/course";
import {
  clampBody,
  gradeLabel,
  maintenanceCalories,
  strokesFor,
  type IntakeCategory,
  type Sex,
} from "@/lib/golf/calories";
import {
  MINUTES_IN_DAY,
  evaluateHole,
  girIndexForPar,
  type HoleEvaluation,
} from "@/lib/golf/checkpoints";
import {
  clampHandicap,
  resultForHole,
  resultFromScore,
  summarise,
  type HoleResult,
  type HoleStatus,
  type RoundSummary,
} from "@/lib/golf/scoring";
import { computeStats, puttsFor, type HoleRecord, type PlayerStats } from "@/lib/golf/stats";
import { orderShots, type OutcomeKey, type SlotKey } from "@/lib/golf/shots";
import { tournamentForWeek } from "@/lib/golf/tournaments";
import {
  APP_TIMEZONE,
  addDays,
  minutesNow,
  today as todayInZone,
  weekKey,
  weekStart,
} from "@/lib/time";

/** Used until a player fills in their height, weight and age. */
export const DEFAULT_MAINTENANCE = 2000;

export type ScoringMode = "calories" | "ratings";

/* ------------------------------------------------------------------ *
 * Views
 * ------------------------------------------------------------------ */

export type PlayerView = {
  id: string;
  name: string;
  handle: string;
  handicap: number;
  accent: string;
  emoji: string;
  sex: Sex;
  heightCm: number | null;
  weightKg: number | null;
  age: number | null;
  maintenance: number;
  /** False until the body metrics needed for the calorie maths are in. */
  hasBody: boolean;
  timezone: string;
};

export function maintenanceFor(player: Player): number {
  if (player.maintenanceOverride) return player.maintenanceOverride;
  if (player.heightCm && player.weightKg && player.age) {
    return maintenanceCalories(
      clampBody({
        sex: player.sex as Sex,
        heightCm: player.heightCm,
        weightKg: player.weightKg,
        age: player.age,
      }),
    );
  }
  return DEFAULT_MAINTENANCE;
}

export function toPlayerView(player: Player): PlayerView {
  return {
    id: player.id,
    name: player.name,
    handle: player.handle,
    handicap: player.handicap,
    accent: player.accent,
    emoji: player.emoji,
    sex: player.sex as Sex,
    heightCm: player.heightCm,
    weightKg: player.weightKg,
    age: player.age,
    maintenance: maintenanceFor(player),
    hasBody: Boolean(player.heightCm && player.weightKg && player.age),
    timezone: player.timezone ?? APP_TIMEZONE,
  };
}

export type CourseView = {
  weekKey: string;
  name: string;
  weekStart: string;
  par: number;
  holes: GeneratedHole[];
  scoringMode: ScoringMode;
  tournament: string | null;
  tournamentCourse: string | null;
  tournamentLocation: string | null;
};

export type IntakeView = {
  id: string;
  category: IntakeCategory;
  calories: number;
  note: string | null;
  minutes: number;
};

export type BurnView = {
  id: string;
  calories: number;
  activity: string | null;
  minutes: number;
};

export type LoggedShot = { slot: SlotKey; outcome: OutcomeKey; note: string | null };

export type HoleCard = {
  hole: GeneratedHole;
  result: HoleResult;
  mode: ScoringMode;
  /** Calorie weeks. */
  evaluation: HoleEvaluation | null;
  intake: IntakeView[];
  burn: BurnView[];
  completed: boolean;
  maintenance: number;
  /** Legacy rating weeks. */
  shots: LoggedShot[];
};

export type Card = {
  course: CourseView;
  player: PlayerView;
  holes: HoleCard[];
  summary: RoundSummary;
  /** True when this is the live week and the card can still be filled in. */
  editable: boolean;
  today: string;
  nowMinutes: number;
};

/* ------------------------------------------------------------------ *
 * Courses
 * ------------------------------------------------------------------ */

function toCourseView(course: Course): CourseView {
  return {
    weekKey: course.weekKey,
    name: course.name,
    weekStart: course.weekStart,
    par: course.holes.reduce((total, hole) => total + hole.par, 0),
    holes: [...course.holes].sort((a, b) => a.dayIndex - b.dayIndex),
    scoringMode: course.scoringMode as ScoringMode,
    tournament: course.tournament,
    tournamentCourse: course.tournamentCourse,
    tournamentLocation: course.tournamentLocation,
  };
}

/**
 * Courses open on a Monday and never change afterwards, so the generated layout
 * is written to the database the first time anyone asks for that week.
 */
export async function ensureCourse(key: string): Promise<CourseView> {
  const [existing] = await db.select().from(courses).where(eq(courses.weekKey, key)).limit(1);
  if (existing) return toCourseView(existing);

  // The layout, pars and hole names all come from the generator, which reads
  // the week's tournament and its mapped course.
  const generated = generateCourse(key);
  const event = tournamentForWeek(key);

  const [inserted] = await db
    .insert(courses)
    .values({
      weekKey: generated.weekKey,
      name: generated.name,
      weekStart: generated.weekStart,
      seed: generated.seed,
      holes: generated.holes,
      tournament: event.name,
      tournamentCourse: event.course,
      tournamentLocation: event.location,
      scoringMode: "calories",
    })
    .onConflictDoNothing()
    .returning();

  if (inserted) return toCourseView(inserted);
  const [raced] = await db.select().from(courses).where(eq(courses.weekKey, key)).limit(1);
  return toCourseView(raced!);
}

export function currentWeekKey(timezone = APP_TIMEZONE): string {
  return weekKey(todayInZone(new Date(), timezone));
}

/* ------------------------------------------------------------------ *
 * Loading a card
 * ------------------------------------------------------------------ */

type RoundData = {
  roundId: string;
  handicap: number;
  days: Map<number, HoleDay>;
  intake: Map<number, IntakeEntry[]>;
  burn: Map<number, BurnEntry[]>;
  shots: Map<number, LoggedShot[]>;
};

function emptyRoundData(handicap: number): RoundData {
  return {
    roundId: "",
    handicap,
    days: new Map(),
    intake: new Map(),
    burn: new Map(),
    shots: new Map(),
  };
}

function statusFor(date: string, today: string, completed: boolean): HoleStatus {
  if (completed) return "played";
  if (date > today) return "future";
  if (date === today) return "pending";
  return "no-return";
}

function buildHoleCards(
  course: CourseView,
  player: PlayerView,
  data: RoundData,
  today: string,
  nowMinutes: number,
): { holes: HoleCard[]; summary: RoundSummary } {
  const holes: HoleCard[] = course.holes.map((hole) => {
    const date = hole.date ?? addDays(course.weekStart, hole.dayIndex);

    if (course.scoringMode === "ratings") {
      const shotList = orderShots(data.shots.get(hole.dayIndex) ?? []);
      return {
        hole: { ...hole, date },
        result: resultForHole(
          {
            dayIndex: hole.dayIndex,
            date,
            par: hole.par,
            strokeIndex: hole.strokeIndex,
            shots: shotList,
          },
          today,
          data.handicap,
        ),
        mode: "ratings" as const,
        evaluation: null,
        intake: [],
        burn: [],
        completed: shotList.length > 0,
        maintenance: player.maintenance,
        shots: shotList,
      };
    }

    const day = data.days.get(hole.dayIndex);
    const completed = Boolean(day?.completedAt);
    const status = statusFor(date, today, completed);
    const maintenance = day?.maintenance ?? player.maintenance;
    const sex = (day?.sex as Sex) ?? player.sex;

    const intake = (data.intake.get(hole.dayIndex) ?? []).sort((a, b) => a.minutes - b.minutes);
    const burn = (data.burn.get(hole.dayIndex) ?? []).sort((a, b) => a.minutes - b.minutes);

    // A day that has closed is scored on the whole day; today is scored on the
    // clock so far; a day still to come has not started.
    const clockedTo =
      status === "future" ? 0 : date < today || completed ? MINUTES_IN_DAY : nowMinutes;

    const evaluation = evaluateHole({
      par: hole.par,
      sex,
      maintenance,
      intake: intake.map((entry) => ({ minutes: entry.minutes, calories: entry.calories })),
      burn: burn.map((entry) => ({ minutes: entry.minutes, calories: entry.calories })),
      nowMinutes: clockedTo,
    });

    const strokes = status === "played" ? strokesFor(hole.par, evaluation.grade) : null;

    return {
      hole: { ...hole, date },
      result: resultFromScore(
        {
          dayIndex: hole.dayIndex,
          date,
          par: hole.par,
          strokeIndex: hole.strokeIndex,
          status,
          strokes,
          label: status === "played" ? gradeLabel(hole.par, evaluation.grade) : undefined,
          shotCount: intake.length + burn.length,
        },
        data.handicap,
      ),
      mode: "calories" as const,
      evaluation,
      intake: intake.map((entry) => ({
        id: entry.id,
        category: entry.category as IntakeCategory,
        calories: entry.calories,
        note: entry.note,
        minutes: entry.minutes,
      })),
      burn: burn.map((entry) => ({
        id: entry.id,
        calories: entry.calories,
        activity: entry.activity,
        minutes: entry.minutes,
      })),
      completed,
      maintenance,
      shots: [],
    };
  });

  return { holes, summary: summarise(holes.map((entry) => entry.result)) };
}

async function loadRoundData(roundIds: string[]): Promise<Map<string, RoundData>> {
  const byRound = new Map<string, RoundData>();
  if (roundIds.length === 0) return byRound;

  const ensure = (roundId: string) => {
    const existing = byRound.get(roundId);
    if (existing) return existing;
    const created = emptyRoundData(0);
    created.roundId = roundId;
    byRound.set(roundId, created);
    return created;
  };

  const [days, intake, burn, legacyShots] = await Promise.all([
    db.select().from(holeDays).where(inArray(holeDays.roundId, roundIds)),
    db.select().from(intakeEntries).where(inArray(intakeEntries.roundId, roundIds)).orderBy(asc(intakeEntries.minutes)),
    db.select().from(burnEntries).where(inArray(burnEntries.roundId, roundIds)).orderBy(asc(burnEntries.minutes)),
    db.select().from(shots).where(inArray(shots.roundId, roundIds)),
  ]);

  for (const row of days) ensure(row.roundId).days.set(row.dayIndex, row);
  for (const row of intake) {
    const map = ensure(row.roundId).intake;
    map.set(row.dayIndex, [...(map.get(row.dayIndex) ?? []), row]);
  }
  for (const row of burn) {
    const map = ensure(row.roundId).burn;
    map.set(row.dayIndex, [...(map.get(row.dayIndex) ?? []), row]);
  }
  for (const row of legacyShots) {
    const map = ensure(row.roundId).shots;
    map.set(row.dayIndex, [
      ...(map.get(row.dayIndex) ?? []),
      { slot: row.slot as SlotKey, outcome: row.outcome as OutcomeKey, note: row.note },
    ]);
  }

  return byRound;
}

/** A single player's card for a week, whether or not they have started it. */
export async function loadCard(player: Player, key: string): Promise<Card> {
  const view = toPlayerView(player);
  const course = await ensureCourse(key);
  const today = todayInZone(new Date(), view.timezone);
  const nowMinutes = minutesNow(new Date(), view.timezone);

  const [round] = await db
    .select()
    .from(rounds)
    .where(and(eq(rounds.playerId, player.id), eq(rounds.weekKey, key)))
    .limit(1);

  const data = round
    ? (await loadRoundData([round.id])).get(round.id) ?? emptyRoundData(round.handicap)
    : emptyRoundData(view.handicap);
  data.handicap = round?.handicap ?? view.handicap;

  const { holes, summary } = buildHoleCards(course, view, data, today, nowMinutes);

  return {
    course,
    player: { ...view, handicap: data.handicap },
    holes,
    summary,
    editable: key === weekKey(today),
    today,
    nowMinutes,
  };
}

/* ------------------------------------------------------------------ *
 * Leaderboard
 * ------------------------------------------------------------------ */

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

async function cardsForWeek(key: string): Promise<{ course: CourseView; rows: { view: PlayerView; data: RoundData; holes: HoleCard[]; summary: RoundSummary }[] }> {
  const course = await ensureCourse(key);

  const roundRows = await db
    .select({ roundId: rounds.id, handicap: rounds.handicap, player: players })
    .from(rounds)
    .innerJoin(players, eq(rounds.playerId, players.id))
    .where(eq(rounds.weekKey, key));

  const data = await loadRoundData(roundRows.map((row) => row.roundId));

  const rows = roundRows.map(({ roundId, handicap, player }) => {
    const view = toPlayerView(player);
    const roundData = data.get(roundId) ?? emptyRoundData(handicap);
    roundData.handicap = handicap;
    // Each player's day boundary is their own, so the clock is read per player.
    const today = todayInZone(new Date(), view.timezone);
    const nowMinutes = minutesNow(new Date(), view.timezone);
    const built = buildHoleCards(course, view, roundData, today, nowMinutes);
    return { view: { ...view, handicap }, data: roundData, ...built };
  });

  return { course, rows };
}

export async function loadLeaderboard(
  key: string,
  sort: LeaderboardSort = "net",
): Promise<Leaderboard> {
  const { course, rows } = await cardsForWeek(key);
  return {
    course,
    rows: sortLeaderboard(
      rows.map(({ view, summary }) => ({ player: view, summary, position: 0, tied: false })),
      sort,
    ),
    today: todayInZone(),
    resetsOn: addDays(weekStart(key), 7),
  };
}

/* ------------------------------------------------------------------ *
 * Mutations
 * ------------------------------------------------------------------ */

export class GameError extends Error {
  constructor(
    message: string,
    readonly status = 400,
  ) {
    super(message);
  }
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

/**
 * Takes the snapshot of maintenance and threshold table the day will be scored
 * against, so changing your weight next month does not rewrite an old card.
 */
async function ensureDay(roundId: string, dayIndex: number, player: PlayerView): Promise<HoleDay> {
  const [existing] = await db
    .select()
    .from(holeDays)
    .where(and(eq(holeDays.roundId, roundId), eq(holeDays.dayIndex, dayIndex)))
    .limit(1);
  if (existing) return existing;

  const [inserted] = await db
    .insert(holeDays)
    .values({ roundId, dayIndex, maintenance: player.maintenance, sex: player.sex })
    .onConflictDoNothing()
    .returning();
  if (inserted) return inserted;

  const [raced] = await db
    .select()
    .from(holeDays)
    .where(and(eq(holeDays.roundId, roundId), eq(holeDays.dayIndex, dayIndex)))
    .limit(1);
  return raced!;
}

async function assertEditable(player: PlayerView, key: string, dayIndex: number): Promise<void> {
  const course = await ensureCourse(key);
  const today = todayInZone(new Date(), player.timezone);
  if (key !== weekKey(today)) {
    throw new GameError("That week's card is closed. Only the current week can be edited.", 409);
  }
  if (course.scoringMode !== "calories") {
    throw new GameError("That week was played on the old scoring and is read-only.", 409);
  }
  if (!Number.isInteger(dayIndex) || dayIndex < 0 || dayIndex > 6) {
    throw new GameError("Unknown hole.");
  }
  if (addDays(course.weekStart, dayIndex) > today) {
    throw new GameError("You can't play a hole before you get to it.", 409);
  }
}

export async function saveIntake(input: {
  player: Player;
  weekKey: string;
  dayIndex: number;
  entryId?: string | null;
  category: IntakeCategory;
  calories: number;
  note: string | null;
  minutes: number;
}): Promise<Card> {
  const view = toPlayerView(input.player);
  await assertEditable(view, input.weekKey, input.dayIndex);

  const roundId = await ensureRound(input.player.id, input.weekKey, input.player.handicap);
  await ensureDay(roundId, input.dayIndex, view);

  const values = {
    category: input.category,
    calories: input.calories,
    note: input.note?.trim() ? input.note.trim().slice(0, 280) : null,
    minutes: Math.min(Math.max(Math.round(input.minutes), 0), MINUTES_IN_DAY - 1),
    updatedAt: new Date(),
  };

  if (input.entryId) {
    await db
      .update(intakeEntries)
      .set(values)
      .where(and(eq(intakeEntries.id, input.entryId), eq(intakeEntries.roundId, roundId)));
  } else {
    await db.insert(intakeEntries).values({ roundId, dayIndex: input.dayIndex, ...values });
  }

  return loadCard(input.player, input.weekKey);
}

export async function saveBurn(input: {
  player: Player;
  weekKey: string;
  dayIndex: number;
  entryId?: string | null;
  calories: number;
  activity: string | null;
  minutes: number;
}): Promise<Card> {
  const view = toPlayerView(input.player);
  await assertEditable(view, input.weekKey, input.dayIndex);

  const roundId = await ensureRound(input.player.id, input.weekKey, input.player.handicap);
  await ensureDay(roundId, input.dayIndex, view);

  const values = {
    calories: input.calories,
    activity: input.activity?.trim() ? input.activity.trim().slice(0, 120) : null,
    minutes: Math.min(Math.max(Math.round(input.minutes), 0), MINUTES_IN_DAY - 1),
    updatedAt: new Date(),
  };

  if (input.entryId) {
    await db
      .update(burnEntries)
      .set(values)
      .where(and(eq(burnEntries.id, input.entryId), eq(burnEntries.roundId, roundId)));
  } else {
    await db.insert(burnEntries).values({ roundId, dayIndex: input.dayIndex, ...values });
  }

  return loadCard(input.player, input.weekKey);
}

export async function removeEntry(input: {
  player: Player;
  weekKey: string;
  dayIndex: number;
  entryId: string;
  kind: "intake" | "burn";
}): Promise<Card> {
  const view = toPlayerView(input.player);
  await assertEditable(view, input.weekKey, input.dayIndex);

  const [round] = await db
    .select({ id: rounds.id })
    .from(rounds)
    .where(and(eq(rounds.playerId, input.player.id), eq(rounds.weekKey, input.weekKey)))
    .limit(1);

  if (round) {
    const table = input.kind === "intake" ? intakeEntries : burnEntries;
    await db.delete(table).where(and(eq(table.id, input.entryId), eq(table.roundId, round.id)));
  }

  return loadCard(input.player, input.weekKey);
}

/** Closing the day is what makes the hole count. */
export async function setDayComplete(input: {
  player: Player;
  weekKey: string;
  dayIndex: number;
  complete: boolean;
}): Promise<Card> {
  const view = toPlayerView(input.player);
  await assertEditable(view, input.weekKey, input.dayIndex);

  const roundId = await ensureRound(input.player.id, input.weekKey, input.player.handicap);
  const day = await ensureDay(roundId, input.dayIndex, view);

  if (input.complete) {
    const [entry] = await db
      .select({ id: intakeEntries.id })
      .from(intakeEntries)
      .where(and(eq(intakeEntries.roundId, roundId), eq(intakeEntries.dayIndex, input.dayIndex)))
      .limit(1);
    if (!entry) {
      throw new GameError("Log what you ate before closing the day out.", 400);
    }
  }

  await db
    .update(holeDays)
    .set({ completedAt: input.complete ? new Date() : null })
    .where(eq(holeDays.id, day.id));

  return loadCard(input.player, input.weekKey);
}

export async function updateHandicap(player: Player, handicap: number): Promise<number> {
  const value = clampHandicap(handicap);
  await db.update(players).set({ handicap: value }).where(eq(players.id, player.id));
  await db
    .update(rounds)
    .set({ handicap: value })
    .where(
      and(
        eq(rounds.playerId, player.id),
        eq(rounds.weekKey, currentWeekKey(player.timezone ?? APP_TIMEZONE)),
      ),
    );
  return value;
}

export async function updateBody(
  player: Player,
  body: { sex: Sex; heightCm: number; weightKg: number; age: number; maintenanceOverride?: number | null },
): Promise<PlayerView> {
  const clamped = clampBody(body);
  const [updated] = await db
    .update(players)
    .set({
      sex: clamped.sex,
      heightCm: clamped.heightCm,
      weightKg: clamped.weightKg,
      age: clamped.age,
      maintenanceOverride: body.maintenanceOverride ?? null,
    })
    .where(eq(players.id, player.id))
    .returning();
  return toPlayerView(updated);
}

/* ------------------------------------------------------------------ *
 * Season and statistics
 * ------------------------------------------------------------------ */

export type SeasonRow = {
  player: PlayerView;
  roundsPlayed: number;
  stableford: number;
  bestToPar: number | null;
  birdies: number;
  pars: number;
  holesPlayed: number;
};

async function everyWeek(limitWeeks: number): Promise<string[]> {
  const rows = await db
    .select({ weekKey: courses.weekKey })
    .from(courses)
    .orderBy(desc(courses.weekStart))
    .limit(limitWeeks);
  return rows.map((row) => row.weekKey);
}

/** Running totals across every course a player has teed it up on. */
export async function loadSeason(limitWeeks = 26): Promise<SeasonRow[]> {
  const keys = await everyWeek(limitWeeks);
  const totals = new Map<string, SeasonRow>();

  for (const key of keys) {
    const { rows } = await cardsForWeek(key);
    for (const { view, holes, summary } of rows) {
      if (summary.holesPlayed === 0) continue;
      const row = totals.get(view.id) ?? {
        player: view,
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
      totals.set(view.id, row);
    }
  }

  return [...totals.values()].sort(
    (a, b) => b.stableford - a.stableford || a.player.name.localeCompare(b.player.name),
  );
}

/**
 * Every completed calorie-scored hole, by everyone — the field the strokes
 * gained figures are measured against.
 */
export async function loadStatsField(limitWeeks = 26): Promise<HoleRecord[]> {
  const keys = await everyWeek(limitWeeks);
  const records: HoleRecord[] = [];

  for (const key of keys) {
    const { course, rows } = await cardsForWeek(key);
    if (course.scoringMode !== "calories") continue;

    for (const { view, holes } of rows) {
      for (const entry of holes) {
        if (entry.result.status !== "played" || !entry.evaluation || entry.result.strokes === null) {
          continue;
        }
        const grades = entry.evaluation.checkpoints.map((checkpoint) => checkpoint.grade);
        const girIndex = girIndexForPar(entry.hole.par);
        records.push({
          playerId: view.id,
          weekKey: key,
          dayIndex: entry.hole.dayIndex,
          par: entry.hole.par,
          strokes: entry.result.strokes,
          grade: entry.evaluation.grade,
          teeGrade: grades[0],
          approachGrades: grades.slice(entry.hole.par === 3 ? 0 : 1, -1),
          girGrade: grades[girIndex],
          greenInRegulation: entry.evaluation.checkpoints[girIndex]
            ? ["ALBATROSS", "EAGLE", "BIRDIE", "PAR"].includes(grades[girIndex])
            : false,
        });
      }
    }
  }

  return records;
}

export type StatsPage = {
  stats: PlayerStats;
  /** Everyone's scoring average, so a player can see where they sit. */
  field: { player: PlayerView; stats: PlayerStats }[];
};

export async function loadStats(playerId: string, limitWeeks = 26): Promise<StatsPage> {
  const field = await loadStatsField(limitWeeks);
  const ids = [...new Set(field.map((record) => record.playerId))];

  const playerRows = ids.length
    ? await db.select().from(players).where(inArray(players.id, ids))
    : [];

  return {
    stats: computeStats(field, playerId),
    field: playerRows
      .map((player) => ({ player: toPlayerView(player), stats: computeStats(field, player.id) }))
      .sort((a, b) => (a.stats.scoringAverage ?? 99) - (b.stats.scoringAverage ?? 99)),
  };
}

export { puttsFor };
