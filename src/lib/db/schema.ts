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

export const shots = pgTable(
  "shots",
  {
    id: text("id").primaryKey().$defaultFn(randomUUID),
    roundId: text("round_id")
      .notNull()
      .references(() => rounds.id, { onDelete: "cascade" }),
    /** 0 = Monday … 6 = Sunday. */
    dayIndex: integer("day_index").notNull(),
    /** breakfast | lunch | dinner | snacks | alcohol */
    slot: text("slot").notNull(),
    /** STRIPED | FAIRWAY | ROUGH | TREES | WATER */
    outcome: text("outcome").notNull(),
    /** "Hit one into the trees, as I had a burger for lunch". */
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
  shots: many(shots),
}));

export const shotsRelations = relations(shots, ({ one }) => ({
  round: one(rounds, { fields: [shots.roundId], references: [rounds.id] }),
}));

export type Player = typeof players.$inferSelect;
export type Course = typeof courses.$inferSelect;
export type Round = typeof rounds.$inferSelect;
export type ShotRow = typeof shots.$inferSelect;
