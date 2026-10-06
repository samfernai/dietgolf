import { addDays, prettyWeekRange, weekStart } from "@/lib/time";
import { isOffWeek, tournamentForWeek } from "./tournaments";
import { holesFor, venueFor } from "./venues";

/** A fixed hole on every Diet Golf course: one day of the week. */
export type HoleSpec = {
  /** 0 = Monday … 6 = Sunday. */
  dayIndex: number;
  day: string;
  short: string;
  par: number;
  strokeIndex: number;
  /** Friday, Saturday and Sunday — the hardest stretch of the week. */
  amenCorner: boolean;
};

/**
 * The fallback week, used when the tournament's course has not been mapped
 * hole by hole. Weeks with a real venue take their pars and stroke indexes
 * from the course itself, so the shape varies.
 */
export const HOLES: readonly HoleSpec[] = [
  { dayIndex: 0, day: "Monday", short: "Mon", par: 4, strokeIndex: 7, amenCorner: false },
  { dayIndex: 1, day: "Tuesday", short: "Tue", par: 4, strokeIndex: 6, amenCorner: false },
  { dayIndex: 2, day: "Wednesday", short: "Wed", par: 5, strokeIndex: 5, amenCorner: false },
  { dayIndex: 3, day: "Thursday", short: "Thu", par: 5, strokeIndex: 3, amenCorner: false },
  { dayIndex: 4, day: "Friday", short: "Fri", par: 4, strokeIndex: 2, amenCorner: true },
  { dayIndex: 5, day: "Saturday", short: "Sat", par: 5, strokeIndex: 1, amenCorner: true },
  { dayIndex: 6, day: "Sunday", short: "Sun", par: 3, strokeIndex: 4, amenCorner: true },
] as const;

export const COURSE_PAR = HOLES.reduce((total, hole) => total + hole.par, 0); // 30

export const AMEN_CORNER_PAR = HOLES.filter((h) => h.amenCorner).reduce((t, h) => t + h.par, 0);

export function holeSpec(dayIndex: number): HoleSpec {
  const hole = HOLES[dayIndex];
  if (!hole) throw new Error(`No hole for day index ${dayIndex}`);
  return hole;
}

/* ------------------------------------------------------------------ *
 * Weekly course generation
 *
 * A fresh course appears every Monday. The layout is derived entirely
 * from the week key, so every player sees the same course and it can be
 * recomputed from scratch at any time.
 * ------------------------------------------------------------------ */

/** Deterministic 32-bit hash, so a week key always yields the same course. */
export function hashString(value: string): number {
  let h = 2166136261;
  for (let i = 0; i < value.length; i++) {
    h ^= value.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

/** mulberry32 — small, fast, and stable across runtimes. */
export function seededRandom(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const COURSE_FIRST = [
  "Magnolia", "Amen", "Bramble", "Cedar", "Firethorn", "Camellia", "Azalea",
  "Redbud", "Holly", "Juniper", "Dogwood", "Pampas", "Nandina", "Carolina",
  "Sawgrass", "Whistling", "Brambleberry", "Peachtree", "Hazel", "Rye",
];

const COURSE_SECOND = [
  "National", "Ridge", "Park", "Downs", "Hollow", "Links", "Bay",
  "Common", "Meadows", "Point", "Valley", "Hill", "Fields", "Rise",
];

const HOLE_NAMES = [
  "Tea Olive", "Pink Dogwood", "Flowering Peach", "Flowering Crab Apple",
  "Magnolia", "Juniper", "Pampas", "Yellow Jasmine", "Carolina Cherry",
  "Camellia", "White Dogwood", "Golden Bell", "Azalea", "Chinese Fir",
  "Firethorn", "Redbud", "Nandina", "Holly", "Wild Olive", "Sweet Bay",
  "Silver Birch", "Hawthorn", "Bluebell", "Foxglove", "Wisteria", "Laurel",
  "Cowslip", "Honeysuckle", "Bramble", "Sorrel",
];

function pickDistinct<T>(pool: readonly T[], count: number, rnd: () => number): T[] {
  const remaining = [...pool];
  const chosen: T[] = [];
  for (let i = 0; i < count && remaining.length > 0; i++) {
    chosen.push(remaining.splice(Math.floor(rnd() * remaining.length), 1)[0]);
  }
  return chosen;
}

function yardageFor(par: number, rnd: () => number): number {
  const ranges: Record<number, [number, number]> = {
    3: [155, 205],
    4: [345, 465],
    5: [495, 590],
  };
  const [min, max] = ranges[par] ?? [400, 450];
  return Math.round((min + rnd() * (max - min)) / 5) * 5;
}

export type GeneratedHole = Omit<HoleSpec, "par" | "strokeIndex"> & {
  par: number;
  strokeIndex: number;
  name: string;
  /** Null where no dependable tournament-tee figure was available. */
  yards: number | null;
  /** The hole's real number on the course, when the week has a mapped venue. */
  holeNumber: number | null;
  /** Seed for the hole map: dogleg, bunkers, water and tree placement. */
  designSeed: number;
  date: string;
};

export type GeneratedCourse = {
  weekKey: string;
  name: string;
  weekStart: string;
  dateRange: string;
  par: number;
  seed: number;
  holes: GeneratedHole[];
};

/**
 * Builds the week's course.
 *
 * Where the week's tournament has a mapped venue, the seven holes are that
 * course's real closing stretch, with its real pars. Everything else — the
 * drawn layout, the dogleg, the bunkering — is still generated from the week
 * key so every player sees the same holes.
 */
export function generateCourse(key: string): GeneratedCourse {
  const seed = hashString(`diet-golf::${key}`);
  const rnd = seededRandom(seed);
  const start = weekStart(key);
  const event = tournamentForWeek(key);
  const venue = venueFor(event.venue);

  let holes: GeneratedHole[];

  if (venue) {
    const real = holesFor(venue, event.holes);
    holes = HOLES.map((day, i) => ({
      dayIndex: day.dayIndex,
      day: day.day,
      short: day.short,
      amenCorner: day.amenCorner,
      par: real[i].par,
      strokeIndex: real[i].strokeIndex,
      name: real[i].name ?? `Hole ${real[i].number}`,
      yards: real[i].yards,
      holeNumber: real[i].number,
      designSeed: hashString(`${key}::${real[i].number}`),
      date: addDays(start, day.dayIndex),
    }));
  } else {
    const names = pickDistinct(HOLE_NAMES, HOLES.length, rnd);
    holes = HOLES.map((day, i) => ({
      ...day,
      name: names[i] ?? `Hole ${i + 1}`,
      yards: yardageFor(day.par, rnd),
      holeNumber: null,
      designSeed: hashString(`${key}::${day.dayIndex}`),
      date: addDays(start, day.dayIndex),
    }));
  }

  const first = COURSE_FIRST[Math.floor(rnd() * COURSE_FIRST.length)];
  const second = COURSE_SECOND[Math.floor(rnd() * COURSE_SECOND.length)];

  // A real event keeps its real host course even when the holes have not been
  // mapped — inventing a name for it would put the Sony Open somewhere that
  // does not exist. Only the off week gets a made-up course.
  const name = venue?.name ?? (isOffWeek(key) ? `${first} ${second}` : event.course);

  return {
    weekKey: key,
    name,
    weekStart: start,
    dateRange: prettyWeekRange(key),
    par: holes.reduce((total, hole) => total + hole.par, 0),
    seed,
    holes,
  };
}

/** URL-friendly day slugs: `/play/mon` … `/play/sun`. */
export const DAY_SLUGS = HOLES.map((hole) => hole.short.toLowerCase());

export function dayIndexFromSlug(slug: string): number | null {
  const index = DAY_SLUGS.indexOf(slug.toLowerCase());
  return index === -1 ? null : index;
}

export function slugForDay(dayIndex: number): string {
  return DAY_SLUGS[dayIndex] ?? DAY_SLUGS[0];
}
