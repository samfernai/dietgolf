/**
 * Player statistics, modelled on the PGA Tour's.
 *
 * Most of these have no natural meaning in a calorie game, so each one is given
 * an explicit definition here and the same wording is shown in the app. They
 * are honest derivations, not measurements — a "fairway hit" means the 10:00
 * checkpoint had you on pace, not that a ball landed anywhere.
 *
 * The strokes-gained figures are measured against everyone else who played the
 * same hole in the same week, which is what "vs. leaderboard" means.
 */

import { GRADE_TO_PAR, type Grade } from "./calories";
import { GRADE_LIE, isOnTarget } from "./checkpoints";

/** A completed hole, for one player. */
export type HoleRecord = {
  playerId: string;
  weekKey: string;
  dayIndex: number;
  par: number;
  strokes: number;
  grade: Grade;
  /** Grade at the 10:00 checkpoint. */
  teeGrade: Grade;
  /** Grades from the second shot up to and including the one that must find the green. */
  approachGrades: Grade[];
  /** Grade at the checkpoint that has to find the green. */
  girGrade: Grade;
  greenInRegulation: boolean;
};

/**
 * A par-pace tee shot is worth this many yards. Everything else scales around
 * it, so the spread lands in the range a real driving-distance stat occupies.
 */
const DRIVE_BASE_YARDS = 290;

export function drivingDistanceFor(teeGrade: Grade): number {
  return Math.round(DRIVE_BASE_YARDS * (0.6 + 0.4 * GRADE_LIE[teeGrade].advance));
}

/**
 * Strokes taken once the ball is on the green.
 *
 * Reaching the green in regulation means getting there in par − 2; missing it
 * costs a shot. Whatever is left over is putting, which makes an ace zero putts
 * and a scrambled par one, exactly as a real card would read.
 */
export function puttsFor(par: number, strokes: number, greenInRegulation: boolean): number {
  const strokesToGreen = greenInRegulation ? par - 2 : par - 1;
  return Math.max(0, strokes - strokesToGreen);
}

export type StatValue = number | null;

export type PlayerStats = {
  rounds: number;
  holes: number;
  scoringAverage: StatValue;
  drivingDistance: StatValue;
  fairwaysInRegulation: StatValue;
  greensInRegulation: StatValue;
  scrambling: StatValue;
  puttsPerRound: StatValue;
  strokesGainedOffTheTee: StatValue;
  strokesGainedApproach: StatValue;
  strokesGainedPutting: StatValue;
  onePuttPercentage: StatValue;
  puttingInsideTenFeet: StatValue;
  threePuttAvoidance: StatValue;
  /** Mean strokes by weekday, Monday first. */
  dailyScoringAverage: StatValue[];
};

const EMPTY_STATS: PlayerStats = {
  rounds: 0,
  holes: 0,
  scoringAverage: null,
  drivingDistance: null,
  fairwaysInRegulation: null,
  greensInRegulation: null,
  scrambling: null,
  puttsPerRound: null,
  strokesGainedOffTheTee: null,
  strokesGainedApproach: null,
  strokesGainedPutting: null,
  onePuttPercentage: null,
  puttingInsideTenFeet: null,
  threePuttAvoidance: null,
  dailyScoringAverage: [null, null, null, null, null, null, null],
};

function mean(values: number[]): StatValue {
  if (values.length === 0) return null;
  return values.reduce((total, value) => total + value, 0) / values.length;
}

function percentage(hits: number, attempts: number): StatValue {
  if (attempts === 0) return null;
  return (hits / attempts) * 100;
}

function holeKey(record: HoleRecord): string {
  return `${record.weekKey}:${record.dayIndex}`;
}

/** Mean of the field on each hole, used as the strokes-gained baseline. */
type Baseline = { tee: number; approach: number; putts: number; entries: number };

function buildBaselines(field: HoleRecord[]): Map<string, Baseline> {
  const groups = new Map<string, { tee: number[]; approach: number[]; putts: number[] }>();

  for (const record of field) {
    const key = holeKey(record);
    const group = groups.get(key) ?? { tee: [], approach: [], putts: [] };
    group.tee.push(GRADE_TO_PAR[record.teeGrade]);
    const approach = mean(record.approachGrades.map((grade) => GRADE_TO_PAR[grade]));
    if (approach !== null) group.approach.push(approach);
    group.putts.push(puttsFor(record.par, record.strokes, record.greenInRegulation));
    groups.set(key, group);
  }

  const baselines = new Map<string, Baseline>();
  for (const [key, group] of groups) {
    baselines.set(key, {
      tee: mean(group.tee) ?? 0,
      approach: mean(group.approach) ?? 0,
      putts: mean(group.putts) ?? 0,
      entries: group.tee.length,
    });
  }
  return baselines;
}

/**
 * `field` is every completed hole by everyone, which is what the strokes-gained
 * figures are measured against. A hole played by only one person has no field
 * to compare with, so it is left out of those three stats.
 */
export function computeStats(field: HoleRecord[], playerId: string): PlayerStats {
  const mine = field.filter((record) => record.playerId === playerId);
  if (mine.length === 0) return { ...EMPTY_STATS };

  const baselines = buildBaselines(field);

  const strokes: number[] = [];
  const drives: number[] = [];
  const putts: number[] = [];
  const byDay: number[][] = Array.from({ length: 7 }, () => []);
  const sgTee: number[] = [];
  const sgApproach: number[] = [];
  const sgPutting: number[] = [];

  let fairwayAttempts = 0;
  let fairwayHits = 0;
  let girHits = 0;
  let scrambleAttempts = 0;
  let scrambleSaves = 0;
  let onePutts = 0;
  let threePutts = 0;
  let closeAttempts = 0;
  let closeConverted = 0;

  const rounds = new Set<string>();

  for (const record of mine) {
    rounds.add(record.weekKey);
    strokes.push(record.strokes);
    byDay[record.dayIndex]?.push(record.strokes);

    const holePutts = puttsFor(record.par, record.strokes, record.greenInRegulation);
    putts.push(holePutts);
    if (holePutts === 1) onePutts += 1;
    if (holePutts >= 3) threePutts += 1;

    // Driving distance is a par 4 and 5 stat on tour; a par 3 tee shot is an approach.
    if (record.par > 3) {
      drives.push(drivingDistanceFor(record.teeGrade));
      fairwayAttempts += 1;
      if (isOnTarget(record.teeGrade)) fairwayHits += 1;
    }

    if (record.greenInRegulation) {
      girHits += 1;
      // "Inside ten feet" is an approach that left you comfortably on pace —
      // a birdie grade or better on the shot that found the green.
      if (GRADE_TO_PAR[record.girGrade] < 0) {
        closeAttempts += 1;
        if (holePutts <= 1) closeConverted += 1;
      }
    } else {
      scrambleAttempts += 1;
      if (record.strokes <= record.par) scrambleSaves += 1;
    }

    const baseline = baselines.get(holeKey(record));
    if (baseline && baseline.entries > 1) {
      sgTee.push(baseline.tee - GRADE_TO_PAR[record.teeGrade]);
      const approach = mean(record.approachGrades.map((grade) => GRADE_TO_PAR[grade]));
      if (approach !== null) sgApproach.push(baseline.approach - approach);
      sgPutting.push(baseline.putts - holePutts);
    }
  }

  const holesPerRound = 7;

  return {
    rounds: rounds.size,
    holes: mine.length,
    scoringAverage: mean(strokes),
    drivingDistance: mean(drives),
    fairwaysInRegulation: percentage(fairwayHits, fairwayAttempts),
    greensInRegulation: percentage(girHits, mine.length),
    scrambling: percentage(scrambleSaves, scrambleAttempts),
    // Scaled to a full seven-hole round so a part-played week is comparable.
    puttsPerRound: mean(putts) === null ? null : (mean(putts) as number) * holesPerRound,
    strokesGainedOffTheTee: mean(sgTee),
    strokesGainedApproach: mean(sgApproach),
    strokesGainedPutting: mean(sgPutting),
    onePuttPercentage: percentage(onePutts, mine.length),
    puttingInsideTenFeet: percentage(closeConverted, closeAttempts),
    threePuttAvoidance: percentage(mine.length - threePutts, mine.length),
    dailyScoringAverage: byDay.map((day) => mean(day)),
  };
}

/** What each number means, shown alongside the figures so they are not a mystery. */
export const STAT_DEFINITIONS: { key: keyof PlayerStats; label: string; detail: string; format: "number" | "percent" | "yards" | "gained" }[] = [
  { key: "scoringAverage", label: "Scoring average", detail: "Mean strokes per hole played.", format: "number" },
  { key: "drivingDistance", label: "Driving distance", detail: "How far the 10:00 checkpoint got you, scaled so a day on pace is 290 yards. Par 4s and 5s only.", format: "yards" },
  { key: "fairwaysInRegulation", label: "Fairways in regulation", detail: "Par 4s and 5s where you were on pace or better at 10:00.", format: "percent" },
  { key: "greensInRegulation", label: "Greens in regulation", detail: "Holes where you were on pace or better at the shot that has to find the green — 10:00 on a par 3, 14:00 on a par 4, 18:00 on a par 5.", format: "percent" },
  { key: "scrambling", label: "Scrambling", detail: "Of the greens you missed, how often you still made par or better.", format: "percent" },
  { key: "puttsPerRound", label: "Putts per round", detail: "Strokes taken after reaching the green, scaled to a full seven-hole round.", format: "number" },
  { key: "strokesGainedOffTheTee", label: "SG: Off the tee", detail: "Your 10:00 grade against everyone else who played the same hole that week.", format: "gained" },
  { key: "strokesGainedApproach", label: "SG: Approach to green", detail: "Your mid-day grades against the same field.", format: "gained" },
  { key: "strokesGainedPutting", label: "SG: Putting", detail: "Your putts against the field's on the same hole.", format: "gained" },
  { key: "onePuttPercentage", label: "One-putt percentage", detail: "Holes finished with a single putt.", format: "percent" },
  { key: "puttingInsideTenFeet", label: "Putting inside 10 feet", detail: "When the approach left you under par pace, how often you converted in one putt.", format: "percent" },
  { key: "threePuttAvoidance", label: "3-putt avoidance", detail: "Holes that did not run to three putts or more.", format: "percent" },
];

export function formatStat(value: StatValue, format: "number" | "percent" | "yards" | "gained"): string {
  if (value === null) return "–";
  switch (format) {
    case "percent": return `${value.toFixed(1)}%`;
    case "yards": return `${Math.round(value)} yds`;
    case "gained": return `${value > 0 ? "+" : value < 0 ? "−" : ""}${Math.abs(value).toFixed(2)}`;
    default: return value.toFixed(2);
  }
}
