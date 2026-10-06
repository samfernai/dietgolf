import { randomUUID } from "node:crypto";
import { relations } from "drizzle-orm";
import {
  date,
  index,
  integer,
  jsonb,
  pgTable,
  text,
  timestamp,
  uniqueIndex,
} from "drizzle-orm/pg-core";
import type { GeneratedHole } from "@/lib/golf/course";

export const players = pgTable(
  "players",
  {
    id: text("id").primaryKey().$defaultFn(randomUUID),
    /** Display name exactly as typed. */
    name: text("name").notNull(),
    /** Lowercased, punctuation-stripped name used for login and uniqueness. */
    handle: text("handle").notNull(),
    pinHash: text("pin_hash").notNull(),
    handicap: integer("handicap").notNull().default(0),
    /** Hex colour used for the player's bag tag and shot trail. */
    accent: text("accent").notNull().default("#006747"),
    emoji: text("emoji").notNull().default("🏌️"),

    /* Body metrics, for the maintenance calorie figure the scoring works from. */
    /** male | female | unspecified */
    sex: text("sex").notNull().default("unspecified"),
    heightCm: integer("height_cm"),
    weightKg: integer("weight_kg"),
    age: integer("age"),
    /** Set when a player knows their own maintenance better than the formula does. */
    maintenanceOverride: integer("maintenance_override"),
    /** Decides when the player's day ends. Falls back to the group timezone. */
    timezone: text("timezone"),

    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [uniqueIndex("players_handle_idx").on(table.handle)],
);

export const courses = pgTable("courses", {
  /** ISO week key, e.g. `2026-W38`. One course per week, shared by everyone. */
  weekKey: text("week_key").primaryKey(),
  name: text("name").notNull(),
  weekStart: date("week_start").notNull(),
  seed: integer("seed").notNull(),
  /** The full seven-hole layout, frozen at the moment the course opened. */
  holes: jsonb("holes").$type<GeneratedHole[]>().notNull(),

  /** The PGA Tour event this week borrows its identity from. */
  tournament: text("tournament"),
  tournamentCourse: text("tournament_course"),
  tournamentLocation: text("tournament_location"),

  /**
   * `calories` from the v2 cutover onwards. Weeks played before it stay on
   * `ratings` so their cards still read the way they were played.
   */
  scoringMode: text("scoring_mode").notNull().default("calories"),

  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const rounds = pgTable(
  "rounds",
  {
    id: text("id").primaryKey().$defaultFn(randomUUID),
    playerId: text("player_id")
      .notNull()
      .references(() => players.id, { onDelete: "cascade" }),
    weekKey: text("week_key")
      .notNull()
      .references(() => courses.weekKey, { onDelete: "cascade" }),
    /** Handicap the player was on when the round started, so old cards stand. */
    handicap: integer("handicap").notNull().default(0),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    uniqueIndex("rounds_player_week_idx").on(table.playerId, table.weekKey),
    index("rounds_week_idx").on(table.weekKey),
  ],
);

/**
 * One row per day a player has started. Holds the figures the hole was scored
 * against, snapshotted so that changing your weight next month does not quietly
 * rewrite a card you already played.
 */
export const holeDays = pgTable(
  "hole_days",
  {
    id: text("id").primaryKey().$defaultFn(randomUUID),
    roundId: text("round_id")
      .notNull()
      .references(() => rounds.id, { onDelete: "cascade" }),
    /** 0 = Monday … 6 = Sunday. */
    dayIndex: integer("day_index").notNull(),
    /** Maintenance calories in force on the day. */
    maintenance: integer("maintenance").notNull(),
    /** Which threshold table the day was scored against. */
    sex: text("sex").notNull(),
    /** Set when the player says the day is done; until then the hole is unplayed. */
    completedAt: timestamp("completed_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    uniqueIndex("hole_days_round_day_idx").on(table.roundId, table.dayIndex),
    index("hole_days_round_idx").on(table.roundId),
  ],
);

/** Calories eaten. Several entries per category per day are fine. */
export const intakeEntries = pgTable(
  "intake_entries",
  {
    id: text("id").primaryKey().$defaultFn(randomUUID),
    roundId: text("round_id")
      .notNull()
      .references(() => rounds.id, { onDelete: "cascade" }),
    dayIndex: integer("day_index").notNull(),
    /** breakfast | lunch | dinner | drinks | other */
    category: text("category").notNull(),
    calories: integer("calories").notNull(),
    /** "Burger and chips at the desk". */
    note: text("note"),
    /** Minutes after local midnight — decides which checkpoints see this entry. */
    minutes: integer("minutes").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [index("intake_round_day_idx").on(table.roundId, table.dayIndex)],
);

/** Calories burned, with what you did to earn them. */
export const burnEntries = pgTable(
  "burn_entries",
  {
    id: text("id").primaryKey().$defaultFn(randomUUID),
    roundId: text("round_id")
      .notNull()
      .references(() => rounds.id, { onDelete: "cascade" }),
    dayIndex: integer("day_index").notNull(),
    calories: integer("calories").notNull(),
    /** "Bike ride", "5k", "Dog walk". */
    activity: text("activity"),
    minutes: integer("minutes").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [index("burn_round_day_idx").on(table.roundId, table.dayIndex)],
);

/**
 * The v1 meal ratings. Kept so weeks played before the calorie cutover still
 * render; nothing new is written here.
 */
export const shots = pgTable(
  "shots",
  {
    id: text("id").primaryKey().$defaultFn(randomUUID),
    roundId: text("round_id")
      .notNull()
      .references(() => rounds.id, { onDelete: "cascade" }),
    dayIndex: integer("day_index").notNull(),
    slot: text("slot").notNull(),
    outcome: text("outcome").notNull(),
    note: text("note"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    uniqueIndex("shots_round_day_slot_idx").on(table.roundId, table.dayIndex, table.slot),
    index("shots_round_idx").on(table.roundId),
  ],
);

export const playersRelations = relations(players, ({ many }) => ({
  rounds: many(rounds),
}));

export const coursesRelations = relations(courses, ({ many }) => ({
  rounds: many(rounds),
}));

export const roundsRelations = relations(rounds, ({ one, many }) => ({
  player: one(players, { fields: [rounds.playerId], references: [players.id] }),
  course: one(courses, { fields: [rounds.weekKey], references: [courses.weekKey] }),
  days: many(holeDays),
  intake: many(intakeEntries),
  burn: many(burnEntries),
  shots: many(shots),
}));

export const holeDaysRelations = relations(holeDays, ({ one }) => ({
  round: one(rounds, { fields: [holeDays.roundId], references: [rounds.id] }),
}));

export const intakeEntriesRelations = relations(intakeEntries, ({ one }) => ({
  round: one(rounds, { fields: [intakeEntries.roundId], references: [rounds.id] }),
}));

export const burnEntriesRelations = relations(burnEntries, ({ one }) => ({
  round: one(rounds, { fields: [burnEntries.roundId], references: [rounds.id] }),
}));

export const shotsRelations = relations(shots, ({ one }) => ({
  round: one(rounds, { fields: [shots.roundId], references: [rounds.id] }),
}));

export type Player = typeof players.$inferSelect;
export type Course = typeof courses.$inferSelect;
export type Round = typeof rounds.$inferSelect;
export type HoleDay = typeof holeDays.$inferSelect;
export type IntakeEntry = typeof intakeEntries.$inferSelect;
export type BurnEntry = typeof burnEntries.$inferSelect;
export type ShotRow = typeof shots.$inferSelect;
