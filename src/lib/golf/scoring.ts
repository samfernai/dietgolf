import { HOLES, holeSpec } from "./course";
import { OUTCOME_SPECS, orderShots, type OutcomeKey, type Shot } from "./shots";

/**
 * Best possible score on a hole is two under par, so a par 3 can be aced but an
 * albatross is off the table.
 */
export const BEST_UNDER_PAR = 2;
/** Worst score that goes on the card, however bad the day actually was. */
export const WORST_OVER_PAR = 6;
/**
 * A day in the past with nothing logged is a no return. It has to cost more
 * than an honestly logged bad day, otherwise the cheapest way to protect a
 * score would be to stop filling the card in.
 */
export const NO_RETURN_OVER_PAR = 5;

export const MAX_HANDICAP = 54;

export type HoleStatus = "played" | "no-return" | "pending" | "future";

export type HoleResult = {
  dayIndex: number;
  date: string;
  par: number;
  strokeIndex: number;
  status: HoleStatus;
  /** Gross strokes, or null when the hole has not been played yet. */
  strokes: number | null;
  toPar: number | null;
  shotsReceived: number;
  netStrokes: number | null;
  netToPar: number | null;
  stableford: number;
  label: string;
  shotCount: number;
};

/** Strokes relative to par contributed by a single set of shots. */
export function shotsDelta(outcomes: OutcomeKey[]): number {
  return outcomes.reduce((total, outcome) => total + OUTCOME_SPECS[outcome].delta, 0);
}

export function clampStrokes(par: number, raw: number): number {
  const floor = Math.max(1, par - BEST_UNDER_PAR);
  return Math.min(Math.max(raw, floor), par + WORST_OVER_PAR);
}

/** Gross strokes for a hole from the shots logged against it. */
export function scoreHole(par: number, shots: Pick<Shot, "outcome">[]): number | null {
  if (shots.length === 0) return null;
  return clampStrokes(par, par + shotsDelta(shots.map((s) => s.outcome)));
}

export function scoreLabel(par: number, strokes: number): string {
  if (strokes === 1) return "Hole in one";
  const toPar = strokes - par;
  switch (toPar) {
    case -3: return "Albatross";
    case -2: return "Eagle";
    case -1: return "Birdie";
    case 0: return "Par";
    case 1: return "Bogey";
    case 2: return "Double bogey";
    case 3: return "Triple bogey";
    default: return toPar > 0 ? `${toPar} over` : `${Math.abs(toPar)} under`;
  }
}

/**
 * Handicap strokes given on a hole. Handicaps are entered as regular 18-hole
 * numbers and scaled to this seven-hole course, then handed out hardest hole
 * first by stroke index.
 */
export function shotsReceived(handicap: number, strokeIndex: number): number {
  const courseHandicap = Math.round((clampHandicap(handicap) * HOLES.length) / 18);
  const base = Math.floor(courseHandicap / HOLES.length);
  const remainder = courseHandicap % HOLES.length;
  return base + (strokeIndex <= remainder ? 1 : 0);
}

export function clampHandicap(handicap: number): number {
  if (!Number.isFinite(handicap)) return 0;
  return Math.min(Math.max(Math.round(handicap), 0), MAX_HANDICAP);
}

/** Standard Stableford: 2 points for a net par, one more for each shot better. */
export function stablefordPoints(par: number, strokes: number, received: number): number {
  return Math.max(0, 2 + (par + received - strokes));
}

export type HoleInput = {
  dayIndex: number;
  date: string;
  shots: Pick<Shot, "outcome">[];
};

export function resolveStatus(date: string, today: string, hasShots: boolean): HoleStatus {
  if (hasShots) return "played";
  if (date > today) return "future";
  if (date === today) return "pending";
  return "no-return";
}

export function resultForHole(input: HoleInput, today: string, handicap: number): HoleResult {
  const spec = holeSpec(input.dayIndex);
  const status = resolveStatus(input.date, today, input.shots.length > 0);
  const received = shotsReceived(handicap, spec.strokeIndex);

  let strokes: number | null = null;
  let label = "";
  if (status === "played") {
    strokes = scoreHole(spec.par, input.shots)!;
    label = scoreLabel(spec.par, strokes);
  } else if (status === "no-return") {
    strokes = spec.par + NO_RETURN_OVER_PAR;
    label = "No return";
  } else {
    label = status === "pending" ? "In play" : "To come";
  }

  return {
    dayIndex: spec.dayIndex,
    date: input.date,
    par: spec.par,
    strokeIndex: spec.strokeIndex,
    status,
    strokes,
    toPar: strokes === null ? null : strokes - spec.par,
    shotsReceived: received,
    netStrokes: strokes === null ? null : strokes - received,
    netToPar: strokes === null ? null : strokes - received - spec.par,
    // A no return scores nothing, exactly as it would on a real card.
    stableford:
      strokes === null || status === "no-return"
        ? 0
        : stablefordPoints(spec.par, strokes, received),
    label,
    shotCount: input.shots.length,
  };
}

export type RoundSummary = {
  holes: HoleResult[];
  /** Holes that count so far — played plus no returns. */
  thru: number;
  holesPlayed: number;
  gross: number;
  net: number;
  parToDate: number;
  toPar: number;
  netToPar: number;
  stableford: number;
  shotsLogged: number;
  complete: boolean;
};

export function summariseRound(
  inputs: HoleInput[],
  today: string,
  handicap: number,
): RoundSummary {
  const holes = [...inputs]
    .sort((a, b) => a.dayIndex - b.dayIndex)
    .map((input) => resultForHole(input, today, handicap));

  const counting = holes.filter((h) => h.strokes !== null);
  const gross = counting.reduce((t, h) => t + (h.strokes ?? 0), 0);
  const net = counting.reduce((t, h) => t + (h.netStrokes ?? 0), 0);
  const parToDate = counting.reduce((t, h) => t + h.par, 0);

  return {
    holes,
    thru: counting.length,
    holesPlayed: holes.filter((h) => h.status === "played").length,
    gross,
    net,
    parToDate,
    toPar: gross - parToDate,
    netToPar: net - parToDate,
    stableford: holes.reduce((t, h) => t + h.stableford, 0),
    shotsLogged: holes.reduce((t, h) => t + h.shotCount, 0),
    complete: counting.length === HOLES.length,
  };
}

/** "−2", "E", "+5" — the way a leaderboard writes it. */
export function formatToPar(toPar: number | null): string {
  if (toPar === null) return "–";
  if (toPar === 0) return "E";
  return toPar > 0 ? `+${toPar}` : `−${Math.abs(toPar)}`;
}

/** Empty shot list for every hole of the week — a card nobody has started. */
export function blankCard(dates: string[]): HoleInput[] {
  return HOLES.map((hole) => ({
    dayIndex: hole.dayIndex,
    date: dates[hole.dayIndex],
    shots: [],
  }));
}

export { orderShots };
