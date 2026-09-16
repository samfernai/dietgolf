/**
 * Hole map geometry.
 *
 * Every hole is drawn from its design seed, so the same hole looks the same for
 * every player and on every device, and a new set of seven layouts appears with
 * each Monday's course.
 */
import { seededRandom } from "./course";
import { OUTCOME_SPECS, type OutcomeKey } from "./shots";

export type Point = { x: number; y: number };

export const MAP_WIDTH = 120;
export const MAP_HEIGHT = 240;

export type Bunker = { x: number; y: number; rx: number; ry: number; rotate: number };
export type Tree = { x: number; y: number; r: number };

export type HoleLayout = {
  width: number;
  height: number;
  tee: Point;
  green: Point;
  greenRx: number;
  greenRy: number;
  fairwayWidth: number;
  /** SVG path for the hole's centre line, tee to green. */
  centreLine: string;
  bunkers: Bunker[];
  trees: Tree[];
  water: string | null;
  pointAt: (t: number) => Point;
  normalAt: (t: number) => Point;
};

function cubic(p0: Point, p1: Point, p2: Point, p3: Point, t: number): Point {
  const u = 1 - t;
  return {
    x: u * u * u * p0.x + 3 * u * u * t * p1.x + 3 * u * t * t * p2.x + t * t * t * p3.x,
    y: u * u * u * p0.y + 3 * u * u * t * p1.y + 3 * u * t * t * p2.y + t * t * t * p3.y,
  };
}

function cubicDerivative(p0: Point, p1: Point, p2: Point, p3: Point, t: number): Point {
  const u = 1 - t;
  return {
    x: 3 * u * u * (p1.x - p0.x) + 6 * u * t * (p2.x - p1.x) + 3 * t * t * (p3.x - p2.x),
    y: 3 * u * u * (p1.y - p0.y) + 6 * u * t * (p2.y - p1.y) + 3 * t * t * (p3.y - p2.y),
  };
}

export function buildHoleLayout(seed: number, par: number): HoleLayout {
  const rnd = seededRandom(seed);

  const tee: Point = { x: 60, y: MAP_HEIGHT - 16 };
  // Longer holes dogleg more and finish further off the tee line.
  const swing = par === 3 ? 8 : par === 4 ? 22 : 30;
  const side = rnd() < 0.5 ? -1 : 1;
  const green: Point = { x: 60 + side * (rnd() * swing * 0.7), y: 34 };

  const c1: Point = { x: 60 + side * (rnd() * swing + swing * 0.3), y: MAP_HEIGHT * 0.66 };
  const c2: Point = { x: green.x - side * (rnd() * swing), y: MAP_HEIGHT * 0.33 };

  const pointAt = (t: number) => cubic(tee, c1, c2, green, Math.min(Math.max(t, 0), 1));
  const normalAt = (t: number) => {
    const d = cubicDerivative(tee, c1, c2, green, Math.min(Math.max(t, 0), 1));
    const len = Math.hypot(d.x, d.y) || 1;
    return { x: -d.y / len, y: d.x / len };
  };

  const fairwayWidth = par === 3 ? 26 : par === 4 ? 32 : 36;
  const greenRx = par === 3 ? 21 : 19;
  const greenRy = par === 3 ? 16 : 14;

  const bunkerCount = par === 3 ? 2 : par === 4 ? 3 : 4;
  const bunkers: Bunker[] = Array.from({ length: bunkerCount }, (_, i) => {
    // First two hug the green, the rest guard the landing areas.
    const t = i < 2 ? 0.93 + rnd() * 0.04 : 0.3 + rnd() * 0.45;
    const base = pointAt(t);
    const normal = normalAt(t);
    const offset = (i % 2 === 0 ? -1 : 1) * (fairwayWidth * 0.62 + rnd() * 6);
    return {
      x: base.x + normal.x * offset,
      y: base.y + normal.y * offset,
      rx: 6 + rnd() * 5,
      ry: 3.5 + rnd() * 2.5,
      rotate: Math.round(rnd() * 120 - 60),
    };
  });

  const hasWater = rnd() < 0.55 || par === 5;
  let water: string | null = null;
  if (hasWater) {
    const t = 0.55 + rnd() * 0.3;
    const base = pointAt(t);
    const normal = normalAt(t);
    const dir = rnd() < 0.5 ? -1 : 1;
    const cx = base.x + normal.x * dir * (fairwayWidth * 0.75);
    const cy = base.y + normal.y * dir * (fairwayWidth * 0.75);
    const w = 16 + rnd() * 12;
    const h = 20 + rnd() * 16;
    water =
      `M ${cx - w / 2} ${cy} ` +
      `C ${cx - w / 2} ${cy - h / 2}, ${cx + w / 2} ${cy - h / 2}, ${cx + w / 2} ${cy} ` +
      `C ${cx + w / 2} ${cy + h / 2}, ${cx - w / 2} ${cy + h / 2}, ${cx - w / 2} ${cy} Z`;
  }

  const trees: Tree[] = [];
  for (let i = 0; i < 26; i++) {
    const t = rnd();
    const base = pointAt(t);
    const normal = normalAt(t);
    const dir = i % 2 === 0 ? -1 : 1;
    const offset = dir * (fairwayWidth * 0.8 + rnd() * 26);
    const x = base.x + normal.x * offset;
    const y = base.y + normal.y * offset;
    if (x < -4 || x > MAP_WIDTH + 4 || y < -4 || y > MAP_HEIGHT + 4) continue;
    trees.push({ x, y, r: 3 + rnd() * 3.5 });
  }

  return {
    width: MAP_WIDTH,
    height: MAP_HEIGHT,
    tee,
    green,
    greenRx,
    greenRy,
    fairwayWidth,
    centreLine: `M ${tee.x} ${tee.y} C ${c1.x} ${c1.y}, ${c2.x} ${c2.y}, ${green.x} ${green.y}`,
    bunkers,
    trees,
    water,
    pointAt,
    normalAt,
  };
}

export type PlottedShot = {
  index: number;
  outcome: OutcomeKey;
  x: number;
  y: number;
  /** Where the ball came from, for drawing the trail. */
  fromX: number;
  fromY: number;
};

/**
 * Places each logged shot along the hole. Good shots cover more ground, so a
 * card full of fairways marches straight up the middle and a bad one zig-zags.
 * The ball always finishes in the hole — the last leg is drawn as the putt.
 */
export function plotShots(layout: HoleLayout, outcomes: OutcomeKey[], seed: number): PlottedShot[] {
  if (outcomes.length === 0) return [];
  const rnd = seededRandom(seed ^ 0x5f3759df);

  const weights = outcomes.map((outcome) => OUTCOME_SPECS[outcome].advance);
  const total = weights.reduce((a, b) => a + b, 0) || 1;

  let travelled = 0;
  let from = layout.tee;

  return outcomes.map((outcome, index) => {
    travelled += weights[index];
    const t = (travelled / total) * 0.9;
    const base = layout.pointAt(t);
    const normal = layout.normalAt(t);
    const spec = OUTCOME_SPECS[outcome];
    const dir = rnd() < 0.5 ? -1 : 1;
    const offset = spec.spread === 0 ? 0 : dir * (spec.spread * (0.65 + rnd() * 0.5));
    const point = {
      x: base.x + normal.x * offset,
      y: base.y + normal.y * offset,
    };
    const plotted: PlottedShot = {
      index,
      outcome,
      x: point.x,
      y: point.y,
      fromX: from.x,
      fromY: from.y,
    };
    from = point;
    return plotted;
  });
}
