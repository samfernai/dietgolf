/**
 * The shot model.
 *
 * A day is a hole. Each thing you eat or drink is a shot, played in order:
 * breakfast off the tee, lunch, dinner, snacks around the green, and whatever
 * you drank as the putt. Every shot is rated on the same five-point scale, and
 * that rating is worth a number of strokes relative to par.
 */

export const SLOTS = ["breakfast", "lunch", "dinner", "snacks", "alcohol"] as const;
export type SlotKey = (typeof SLOTS)[number];

export const OUTCOMES = ["STRIPED", "FAIRWAY", "ROUGH", "TREES", "WATER"] as const;
export type OutcomeKey = (typeof OUTCOMES)[number];

export function isSlot(value: unknown): value is SlotKey {
  return typeof value === "string" && (SLOTS as readonly string[]).includes(value);
}

export function isOutcome(value: unknown): value is OutcomeKey {
  return typeof value === "string" && (OUTCOMES as readonly string[]).includes(value);
}

export type SlotSpec = {
  key: SlotKey;
  label: string;
  /** The shot this meal represents. */
  shot: string;
  emoji: string;
};

export const SLOT_SPECS: Record<SlotKey, SlotSpec> = {
  breakfast: { key: "breakfast", label: "Breakfast", shot: "Tee shot", emoji: "🌅" },
  lunch: { key: "lunch", label: "Lunch", shot: "Second shot", emoji: "🥪" },
  dinner: { key: "dinner", label: "Dinner", shot: "Approach", emoji: "🍽️" },
  snacks: { key: "snacks", label: "Snacks", shot: "Short game", emoji: "🍫" },
  alcohol: { key: "alcohol", label: "Drinks", shot: "The putt", emoji: "🍷" },
};

export type OutcomeSpec = {
  key: OutcomeKey;
  /** Strokes relative to par contributed by this shot. */
  delta: number;
  /** Generic name for the lie, used by the hole map. */
  lie: string;
  short: string;
  color: string;
  emoji: string;
  /** How far up the hole this shot leaves the ball, 0–1. */
  advance: number;
  /** Sideways spread from the centre line, in hole-map units. */
  spread: number;
};

export const OUTCOME_SPECS: Record<OutcomeKey, OutcomeSpec> = {
  STRIPED: { key: "STRIPED", delta: -1, lie: "Green", short: "Striped", color: "#FAD02E", emoji: "🎯", advance: 1.35, spread: 0 },
  FAIRWAY: { key: "FAIRWAY", delta: 0, lie: "Fairway", short: "Fairway", color: "#7BC47F", emoji: "⛳", advance: 1.0, spread: 4 },
  ROUGH: { key: "ROUGH", delta: 1, lie: "Rough", short: "Rough", color: "#C8A94B", emoji: "🌾", advance: 0.75, spread: 13 },
  TREES: { key: "TREES", delta: 2, lie: "Trees", short: "Trees", color: "#D97706", emoji: "🌲", advance: 0.5, spread: 24 },
  WATER: { key: "WATER", delta: 3, lie: "Water", short: "Water", color: "#DC2626", emoji: "💦", advance: 0.35, spread: 19 },
};

/**
 * Per-slot narrative. Each option reads as a golf shot and carries the diet
 * meaning underneath it, so the scorecard tells the story of the day.
 */
export const SLOT_OUTCOMES: Record<SlotKey, Record<OutcomeKey, { title: string; hint: string }>> = {
  breakfast: {
    STRIPED: { title: "Piped it down the middle", hint: "Porridge, eggs, fruit — the perfect opener" },
    FAIRWAY: { title: "Found the fairway", hint: "Sensible, nothing to report" },
    ROUGH: { title: "Drifted into the rough", hint: "A bit heavy, still playable" },
    TREES: { title: "Snap-hooked into the trees", hint: "Full fry-up, pastries, the works" },
    WATER: { title: "Straight in the creek", hint: "Skipped it entirely, or a total blowout" },
  },
  lunch: {
    STRIPED: { title: "Flushed it to the green", hint: "Salad, soup, something you'd tell people about" },
    FAIRWAY: { title: "Safely on the fairway", hint: "A decent, balanced lunch" },
    ROUGH: { title: "Leaked it into the rough", hint: "Meal deal, bit more than you needed" },
    TREES: { title: "Blocked it into the trees", hint: "Burger and chips at the desk" },
    WATER: { title: "Found the water", hint: "Second helpings, then dessert" },
  },
  dinner: {
    STRIPED: { title: "Stiffed the approach", hint: "Lean protein and veg, portion under control" },
    FAIRWAY: { title: "Front edge of the green", hint: "Solid dinner, no regrets" },
    ROUGH: { title: "Missed the green", hint: "Heavier than planned, or late" },
    TREES: { title: "Airmailed it into the trees", hint: "Takeaway, big plate, seconds" },
    WATER: { title: "Dunked it in the pond", hint: "Takeaway and a pudding on top" },
  },
  snacks: {
    STRIPED: { title: "Chipped in", hint: "Nothing between meals, or fruit and nuts" },
    FAIRWAY: { title: "Nice little chip", hint: "One sensible snack" },
    ROUGH: { title: "Caught it thin", hint: "Biscuits crept in" },
    TREES: { title: "Bladed it over the green", hint: "Grazed all afternoon" },
    WATER: { title: "Duffed it into the hazard", hint: "The whole sharing bag, on your own" },
  },
  alcohol: {
    STRIPED: { title: "Drained the putt", hint: "Alcohol-free day" },
    FAIRWAY: { title: "Tapped in", hint: "One drink, and that was that" },
    ROUGH: { title: "Lipped out", hint: "A couple more than planned" },
    TREES: { title: "Three-putted", hint: "A proper session" },
    WATER: { title: "Putted off the green", hint: "Big night. Say no more." },
  },
};

export function outcomeLabel(slot: SlotKey, outcome: OutcomeKey): string {
  return SLOT_OUTCOMES[slot][outcome].title;
}

export type Shot = {
  slot: SlotKey;
  outcome: OutcomeKey;
  note: string | null;
};

/** Shots always play in meal order, whichever order they were entered in. */
export function orderShots<T extends { slot: SlotKey }>(shots: T[]): T[] {
  return [...shots].sort((a, b) => SLOTS.indexOf(a.slot) - SLOTS.indexOf(b.slot));
}
