/**
 * Shot timing.
 *
 * A hole is played against the clock. At each checkpoint the app works out
 * where the ball is from the calories logged so far, which is what moves the
 * shot tracker through the day. The hole settles at midnight.
 *
 * Maintenance is pro-rated to the time of day, so a checkpoint asks "are you on
 * pace right now", not "have you already eaten a whole day's calories". Without
 * that, every breakfast would read as an albatross.
 */

import { gradeFor, type Grade, type Sex } from "./calories";

export const MINUTES_IN_DAY = 1440;

export type Phase = "tee" | "approach" | "green";

export type Checkpoint = {
  /** Minutes after local midnight. */
  minutes: number;
  /** "10:00", "14:00" … */
  time: string;
  label: string;
  phase: Phase;
};

function at(hour: number): { minutes: number; time: string } {
  return { minutes: hour * 60, time: `${String(hour).padStart(2, "0")}:00` };
}

/**
 * Checkpoint counts work out as par − 1, which makes the green-in-regulation
 * checkpoint the penultimate one on every hole.
 */
const SCHEDULE: Record<number, Checkpoint[]> = {
  3: [
    { ...at(10), label: "Tee shot", phase: "tee" },
    { ...at(20), label: "The putt", phase: "green" },
  ],
  4: [
    { ...at(10), label: "Tee shot", phase: "tee" },
    { ...at(14), label: "Approach", phase: "approach" },
    { ...at(20), label: "The putt", phase: "green" },
  ],
  5: [
    { ...at(10), label: "Tee shot", phase: "tee" },
    { ...at(14), label: "Second shot", phase: "approach" },
    { ...at(18), label: "Approach", phase: "approach" },
    { ...at(21), label: "The putt", phase: "green" },
  ],
};

export function checkpointsForPar(par: number): Checkpoint[] {
  const schedule = SCHEDULE[par];
  if (!schedule) throw new Error(`No checkpoint schedule for par ${par}`);
  return schedule;
}

/** The shot that has to find the green to count as a green in regulation. */
export function girIndexForPar(par: number): number {
  return checkpointsForPar(par).length - 2;
}

/* ------------------------------------------------------------------ *
 * Lies
 * ------------------------------------------------------------------ */

export type Lie = {
  label: string;
  color: string;
  /** How far up the hole this shot leaves the ball, relative to the others. */
  advance: number;
  /** Sideways spread from the centre line, in hole-map units. */
  spread: number;
};

export const GRADE_LIE: Record<Grade, Lie> = {
  ALBATROSS: { label: "Striped it", color: "#FAD02E", advance: 1.5, spread: 0 },
  EAGLE: { label: "Flushed it", color: "#FAD02E", advance: 1.35, spread: 0 },
  BIRDIE: { label: "Pin high", color: "#9BD37E", advance: 1.15, spread: 3 },
  PAR: { label: "Fairway", color: "#7BC47F", advance: 1.0, spread: 5 },
  BOGEY: { label: "Rough", color: "#C8A94B", advance: 0.8, spread: 13 },
  DOUBLE: { label: "Trees", color: "#D97706", advance: 0.6, spread: 22 },
  TRIPLE: { label: "Bunker", color: "#DC2626", advance: 0.45, spread: 18 },
  SNOWMAN: { label: "Water", color: "#991B1B", advance: 0.3, spread: 24 },
};

/** A grade at or better than par means the shot found its target. */
export function isOnTarget(grade: Grade): boolean {
  return grade === "ALBATROSS" || grade === "EAGLE" || grade === "BIRDIE" || grade === "PAR";
}

/* ------------------------------------------------------------------ *
 * Evaluation
 * ------------------------------------------------------------------ */

export type TimedEntry = {
  /** Minutes after local midnight. */
  minutes: number;
  calories: number;
};

export type CheckpointResult = Checkpoint & {
  index: number;
  /** False until the clock passes it. */
  reached: boolean;
  /** Net calories at this point in the day, with maintenance pro-rated. */
  balance: number;
  intake: number;
  burn: number;
  grade: Grade;
  lie: Lie;
  /** True on the checkpoint that has to find the green. */
  isGreenInRegulation: boolean;
};

export type HoleEvaluation = {
  checkpoints: CheckpointResult[];
  /** Net calories for the whole day: intake − burn − maintenance. */
  balance: number;
  intake: number;
  burn: number;
  maintenance: number;
  grade: Grade;
  /** Grade the hole is heading for, before the day is done. */
  provisional: boolean;
};

function totalUpTo(entries: TimedEntry[], minutes: number): number {
  return entries.reduce((sum, entry) => (entry.minutes <= minutes ? sum + entry.calories : sum), 0);
}

/**
 * Walks a hole's checkpoints.
 *
 * `nowMinutes` is the local time of day; pass MINUTES_IN_DAY for a day that has
 * closed, which pro-rates maintenance to the full amount and settles the score.
 */
export function evaluateHole(input: {
  par: number;
  sex: Sex;
  maintenance: number;
  intake: TimedEntry[];
  burn: TimedEntry[];
  nowMinutes: number;
}): HoleEvaluation {
  const { par, sex, maintenance, intake, burn, nowMinutes } = input;
  const clockedTo = Math.min(Math.max(nowMinutes, 0), MINUTES_IN_DAY);
  const girIndex = girIndexForPar(par);

  const checkpoints = checkpointsForPar(par).map((checkpoint, index) => {
    const reached = clockedTo >= checkpoint.minutes;
    // Before a checkpoint arrives, show the pace as it stands right now.
    const upTo = reached ? checkpoint.minutes : clockedTo;
    const intakeSoFar = totalUpTo(intake, upTo);
    const burnSoFar = totalUpTo(burn, upTo);
    const balance = Math.round(intakeSoFar - burnSoFar - (maintenance * upTo) / MINUTES_IN_DAY);
    const grade = gradeFor(par, balance, sex);
    return {
      ...checkpoint,
      index,
      reached,
      balance,
      intake: intakeSoFar,
      burn: burnSoFar,
      grade,
      lie: GRADE_LIE[grade],
      isGreenInRegulation: index === girIndex,
    };
  });

  const intakeTotal = totalUpTo(intake, clockedTo);
  const burnTotal = totalUpTo(burn, clockedTo);
  const balance = Math.round(
    intakeTotal - burnTotal - (maintenance * clockedTo) / MINUTES_IN_DAY,
  );

  return {
    checkpoints,
    balance,
    intake: intakeTotal,
    burn: burnTotal,
    maintenance,
    grade: gradeFor(par, balance, sex),
    provisional: clockedTo < MINUTES_IN_DAY,
  };
}

/** "10:00" → 600. */
export function minutesFromTime(time: string): number {
  const match = /^(\d{1,2}):(\d{2})$/.exec(time.trim());
  if (!match) throw new Error(`Invalid time: ${time}`);
  const [, hours, mins] = match;
  return Math.min(Number(hours) * 60 + Number(mins), MINUTES_IN_DAY);
}

/** 600 → "10:00". */
export function timeFromMinutes(minutes: number): string {
  const clamped = Math.min(Math.max(Math.round(minutes), 0), MINUTES_IN_DAY - 1);
  return `${String(Math.floor(clamped / 60)).padStart(2, "0")}:${String(clamped % 60).padStart(2, "0")}`;
}
