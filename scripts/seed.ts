/**
 * Fills the current week with a few players so the leaderboard and the stats
 * page have something on them. Safe to re-run: existing players are left alone
 * and days already logged are skipped.
 */
import { eq } from "drizzle-orm";
import { bagTagFor, hashPin, toHandle } from "../src/lib/auth";
import { db, pool } from "../src/lib/db";
import { players } from "../src/lib/db/schema";
import { currentWeekKey, ensureCourse, saveBurn, saveIntake, setDayComplete } from "../src/lib/game";
import { INTAKE_CATEGORIES, type Sex } from "../src/lib/golf/calories";
import { hashString, seededRandom } from "../src/lib/golf/course";
import { dayIndex, today } from "../src/lib/time";

const CAST: { name: string; handicap: number; sex: Sex; heightCm: number; weightKg: number; age: number }[] = [
  { name: "Sam F", handicap: 12, sex: "male", heightCm: 180, weightKg: 84, age: 41 },
  { name: "Rory McIlroast", handicap: 4, sex: "male", heightCm: 175, weightKg: 72, age: 35 },
  { name: "Tiger Woodsmoke", handicap: 0, sex: "male", heightCm: 185, weightKg: 88, age: 48 },
  { name: "Nelly Cordon Bleu", handicap: 18, sex: "female", heightCm: 168, weightKg: 62, age: 27 },
  { name: "Phil Mickelsalad", handicap: 24, sex: "male", heightCm: 190, weightKg: 102, age: 54 },
];

/** Roughly when each meal lands, in minutes after midnight. */
const MEAL_TIMES: Record<string, number> = {
  breakfast: 8 * 60,
  lunch: 13 * 60,
  dinner: 19 * 60,
  drinks: 21 * 60,
  other: 16 * 60,
};

const MEAL_NOTES: Record<string, string[]> = {
  breakfast: ["Porridge and berries", "Two eggs on toast", "Full English, regrets"],
  lunch: ["Chicken salad", "Meal deal", "Burger and chips at the desk"],
  dinner: ["Salmon and greens", "Pasta, big bowl", "Takeaway again"],
  drinks: ["One glass of red", "Couple of pints", "Sparkling water, very smug"],
  other: ["Biscuits at four", "Handful of nuts", "The whole sharing bag"],
};

const WORKOUTS = ["Bike ride", "5k run", "Dog walk", "Gym session", "Swim"];

async function main() {
  const key = currentWeekKey();
  await ensureCourse(key);
  const maxDay = dayIndex(today());
  const rnd = seededRandom(hashString(`seed::${key}`));

  for (const entry of CAST) {
    const handle = toHandle(entry.name);
    let [player] = await db.select().from(players).where(eq(players.handle, handle)).limit(1);
    if (!player) {
      [player] = await db
        .insert(players)
        .values({
          name: entry.name,
          handle,
          pinHash: hashPin("1234"),
          handicap: entry.handicap,
          sex: entry.sex,
          heightCm: entry.heightCm,
          weightKg: entry.weightKg,
          age: entry.age,
          ...bagTagFor(handle),
        })
        .returning();
      console.log(`Registered ${entry.name} (PIN 1234)`);
    }

    for (let day = 0; day <= maxDay; day++) {
      // Leave the odd day blank so no returns show up on the card too.
      if (rnd() < 0.12) continue;

      for (const category of INTAKE_CATEGORIES) {
        if (rnd() < 0.2) continue;
        const base = category === "drinks" ? 180 : category === "other" ? 220 : 520;
        const calories = Math.round(base * (0.5 + rnd() * 1.4));
        const notes = MEAL_NOTES[category];
        await saveIntake({
          player,
          weekKey: key,
          dayIndex: day,
          category,
          calories,
          note: rnd() < 0.6 ? notes[Math.floor(rnd() * notes.length)] : null,
          minutes: MEAL_TIMES[category] + Math.floor(rnd() * 90) - 45,
        });
      }

      if (rnd() < 0.55) {
        await saveBurn({
          player,
          weekKey: key,
          dayIndex: day,
          calories: Math.round(180 + rnd() * 700),
          activity: WORKOUTS[Math.floor(rnd() * WORKOUTS.length)],
          minutes: 7 * 60 + Math.floor(rnd() * 720),
        });
      }

      // Days before today get closed out; today is left in play.
      if (day < maxDay && rnd() < 0.85) {
        await setDayComplete({ player, weekKey: key, dayIndex: day, complete: true });
      }
    }
  }

  console.log(`Seeded ${CAST.length} players for ${key}.`);
  await pool.end();
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
