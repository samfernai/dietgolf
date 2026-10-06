/**
 * The calorie scoring engine.
 *
 * A hole is scored on the day's net calorie balance — what you ate, minus what
 * you burned, minus what your body needs to hold its weight. Land near zero and
 * you make par. Run a deficit and you go under it.
 */

export const SEXES = ["male", "female", "unspecified"] as const;
export type Sex = (typeof SEXES)[number];

export function isSex(value: unknown): value is Sex {
  return typeof value === "string" && (SEXES as readonly string[]).includes(value);
}

export type Body = {
  sex: Sex;
  heightCm: number;
  weightKg: number;
  age: number;
};

export const BODY_LIMITS = {
  heightCm: { min: 120, max: 230 },
  weightKg: { min: 35, max: 250 },
  age: { min: 16, max: 100 },
} as const;

/**
 * Mifflin-St Jeor, the formula most calorie trackers use. "Unspecified" sits
 * midway between the two constants rather than defaulting to either.
 */
export function basalMetabolicRate({ sex, heightCm, weightKg, age }: Body): number {
  const base = 10 * weightKg + 6.25 * heightCm - 5 * age;
  if (sex === "male") return base + 5;
  if (sex === "female") return base - 161;
  return base - 78;
}

/**
 * Exercise is logged separately and subtracted from the day's intake, so the
 * maintenance figure deliberately assumes a sedentary baseline. Multiplying by
 * an activity factor as well would count the same bike ride twice.
 */
export const SEDENTARY_MULTIPLIER = 1.2;

export function maintenanceCalories(body: Body): number {
  return Math.round(basalMetabolicRate(body) * SEDENTARY_MULTIPLIER);
}

export function clampBody(body: Body): Body {
  const clamp = (value: number, { min, max }: { min: number; max: number }) =>
    Math.min(Math.max(Math.round(value), min), max);
  return {
    sex: body.sex,
    heightCm: clamp(body.heightCm, BODY_LIMITS.heightCm),
    weightKg: clamp(body.weightKg, BODY_LIMITS.weightKg),
    age: clamp(body.age, BODY_LIMITS.age),
  };
}

/* ------------------------------------------------------------------ *
 * Grades
 * ------------------------------------------------------------------ */

export const GRADES = [
  "ALBATROSS",
  "EAGLE",
  "BIRDIE",
  "PAR",
  "BOGEY",
  "DOUBLE",
  "TRIPLE",
  "SNOWMAN",
] as const;

export type Grade = (typeof GRADES)[number];

/**
 * Strokes relative to par. Snowman is four over, which is a literal 8 on the
 * course's par 4s — which is where the name comes from.
 */
export const GRADE_TO_PAR: Record<Grade, number> = {
  ALBATROSS: -3,
  EAGLE: -2,
  BIRDIE: -1,
  PAR: 0,
  BOGEY: 1,
  DOUBLE: 2,
  TRIPLE: 3,
  SNOWMAN: 4,
};

/**
 * Upper edge of each band, in net calories. A balance is graded by the first
 * edge it falls at or under.
 */
export type Thresholds = {
  albatross: number;
  eagle: number;
  birdie: number;
  par: number;
  bogey: number;
  double: number;
  triple: number;
};

export const MENS_THRESHOLDS: Thresholds = {
  albatross: -3500,
  eagle: -2000,
  birdie: -1000,
  par: 250,
  bogey: 1500,
  double: 2750,
  triple: 3500,
};

/**
 * Women play off bands 15% tighter. The same deficit is a larger share of a
 * smaller maintenance, so the grades move in proportion rather than asking for
 * the same absolute swing.
 */
export const WOMENS_SCALE = 0.85;

export function thresholdsFor(sex: Sex): Thresholds {
  if (sex !== "female") return MENS_THRESHOLDS;
  const scale = (value: number) => Math.round(value * WOMENS_SCALE);
  return {
    albatross: scale(MENS_THRESHOLDS.albatross),
    eagle: scale(MENS_THRESHOLDS.eagle),
    birdie: scale(MENS_THRESHOLDS.birdie),
    par: scale(MENS_THRESHOLDS.par),
    bogey: scale(MENS_THRESHOLDS.bogey),
    double: scale(MENS_THRESHOLDS.double),
    triple: scale(MENS_THRESHOLDS.triple),
  };
}

/**
 * Grades a net balance.
 *
 * Par 3s are the exception the brief calls out: there is no eagle on a par 3
 * because one under par is a birdie and two under is the hole itself, so the
 * eagle band folds into the birdie and only an albatross-sized deficit aces it.
 */
export function gradeFor(par: number, balance: number, sex: Sex): Grade {
  const t = thresholdsFor(sex);

  if (par === 3) {
    if (balance <= t.albatross) return "ALBATROSS";
    if (balance <= t.birdie) return "BIRDIE";
  } else {
    if (balance <= t.eagle) return "EAGLE";
    if (balance <= t.birdie) return "BIRDIE";
  }

  if (balance <= t.par) return "PAR";
  if (balance <= t.bogey) return "BOGEY";
  if (balance <= t.double) return "DOUBLE";
  if (balance <= t.triple) return "TRIPLE";
  return "SNOWMAN";
}

/** Gross strokes for a hole. Never below one — you have to hit it at least once. */
export function strokesFor(par: number, grade: Grade): number {
  return Math.max(1, par + GRADE_TO_PAR[grade]);
}

export function scoreBalance(par: number, balance: number, sex: Sex): number {
  return strokesFor(par, gradeFor(par, balance, sex));
}

export function gradeLabel(par: number, grade: Grade): string {
  if (grade === "ALBATROSS" && par === 3) return "Hole in one";
  return {
    ALBATROSS: "Albatross",
    EAGLE: "Eagle",
    BIRDIE: "Birdie",
    PAR: "Par",
    BOGEY: "Bogey",
    DOUBLE: "Double bogey",
    TRIPLE: "Triple bogey",
    SNOWMAN: "Snowman",
  }[grade];
}

/** Plain-English range for a grade, for the scoring table in the UI. */
export function gradeRange(grade: Grade, sex: Sex): string {
  const t = thresholdsFor(sex);
  const n = (value: number) =>
    value < 0 ? `−${Math.abs(value).toLocaleString()}` : `+${value.toLocaleString()}`;
  switch (grade) {
    case "ALBATROSS": return `${n(t.albatross)} or lower`;
    case "EAGLE": return `${n(t.eagle)} or lower`;
    case "BIRDIE": return `${n(t.birdie)} to ${n(t.eagle + 1)}`;
    case "PAR": return `${n(t.birdie + 1)} to ${n(t.par)}`;
    case "BOGEY": return `${n(t.par + 1)} to ${n(t.bogey)}`;
    case "DOUBLE": return `${n(t.bogey + 1)} to ${n(t.double)}`;
    case "TRIPLE": return `${n(t.double + 1)} to ${n(t.triple)}`;
    case "SNOWMAN": return `${n(t.triple + 1)} and above`;
  }
}

/** Which grades a given par can actually produce, best first. */
export function gradesForPar(par: number): Grade[] {
  return GRADES.filter((grade) => {
    if (par === 3) return grade !== "EAGLE";
    return grade !== "ALBATROSS";
  });
}

/* ------------------------------------------------------------------ *
 * Entries
 * ------------------------------------------------------------------ */

export const INTAKE_CATEGORIES = ["breakfast", "lunch", "dinner", "drinks", "other"] as const;
export type IntakeCategory = (typeof INTAKE_CATEGORIES)[number];

export function isIntakeCategory(value: unknown): value is IntakeCategory {
  return typeof value === "string" && (INTAKE_CATEGORIES as readonly string[]).includes(value);
}

export const CATEGORY_LABELS: Record<
  IntakeCategory,
  { label: string; emoji: string; defaultMinutes: number }
> = {
  breakfast: { label: "Breakfast", emoji: "🌅", defaultMinutes: 8 * 60 },
  lunch: { label: "Lunch", emoji: "🥪", defaultMinutes: 13 * 60 },
  dinner: { label: "Dinner", emoji: "🍽️", defaultMinutes: 19 * 60 },
  drinks: { label: "Drinks", emoji: "🍷", defaultMinutes: 21 * 60 },
  other: { label: "Other", emoji: "🍫", defaultMinutes: 16 * 60 },
};

/** A hole counts only once the player says the day is done. */
export const MAX_CALORIES_PER_ENTRY = 10_000;

export function clampCalories(value: number): number {
  if (!Number.isFinite(value)) return 0;
  return Math.min(Math.max(Math.round(value), 0), MAX_CALORIES_PER_ENTRY);
}
