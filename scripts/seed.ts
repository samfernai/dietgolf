/**
 * Fills the current week with a few players so the leaderboard has something on
 * it. Safe to re-run: existing players and shots are left alone.
 */
import { eq } from "drizzle-orm";
import { bagTagFor, hashPin, toHandle } from "../src/lib/auth";
import { db, pool } from "../src/lib/db";
import { players } from "../src/lib/db/schema";
import { currentWeekKey, ensureCourse, saveShot } from "../src/lib/game";
import { OUTCOMES, SLOTS, type OutcomeKey } from "../src/lib/golf/shots";
import { seededRandom, hashString } from "../src/lib/golf/course";
import { dayIndex, today } from "../src/lib/time";

const CAST = [
  { name: "Sam F", handicap: 12 },
  { name: "Rory McIlroast", handicap: 4 },
  { name: "Tiger Woodsmoke", handicap: 0 },
  { name: "Nelly Cordon Bleu", handicap: 18 },
  { name: "Phil Mickelsalad", handicap: 24 },
];

const NOTES: Record<OutcomeKey, string[]> = {
  STRIPED: ["Porridge and berries, felt great", "Grilled chicken and greens", "Nothing between meals"],
  FAIRWAY: ["Sensible enough", "Normal portion, no seconds", "One glass and stopped"],
  ROUGH: ["Meal deal got the better of me", "Biscuits at 4pm", "A couple more than planned"],
  TREES: ["Hit one into the trees, as I had a burger for lunch", "Takeaway again", "Grazed all afternoon"],
  WATER: ["Straight in the water — pizza and pudding", "Big night out", "Skipped it then over-ate"],
};

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
          ...bagTagFor(handle),
        })
        .returning();
      console.log(`Registered ${entry.name} (PIN 1234)`);
    }

    for (let day = 0; day <= maxDay; day++) {
      // Leave a few gaps so no returns and part-played holes show up too.
      if (rnd() < 0.12) continue;
      for (const slot of SLOTS) {
        if (rnd() < 0.18) continue;
        const outcome = OUTCOMES[Math.floor(rnd() * OUTCOMES.length)];
        const notes = NOTES[outcome];
        await saveShot({
          player,
          weekKey: key,
          dayIndex: day,
          slot,
          outcome,
          note: rnd() < 0.55 ? notes[Math.floor(rnd() * notes.length)] : null,
        });
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
