/**
 * Re-generates a week's course in place.
 *
 * Courses are frozen once they open, so a week already underway keeps whatever
 * layout it was created with. This rebuilds one from the current generator —
 * useful after mapping a new venue — and refuses to touch a week where anyone
 * has already closed a day out, because the pars would move under their score.
 *
 *   npm run db:refresh-course            # the current week
 *   npm run db:refresh-course 2026-W41   # a specific week
 */
import { and, eq, isNotNull } from "drizzle-orm";
import { db, pool } from "../src/lib/db";
import { courses, holeDays, rounds } from "../src/lib/db/schema";
import { generateCourse } from "../src/lib/golf/course";
import { tournamentForWeek } from "../src/lib/golf/tournaments";
import { today, weekKey } from "../src/lib/time";

async function main() {
  const key = process.argv[2] ?? weekKey(today());

  const [existing] = await db.select().from(courses).where(eq(courses.weekKey, key)).limit(1);
  if (!existing) {
    console.log(`No course for ${key} yet — it will be generated fresh when someone opens it.`);
    return;
  }

  const completed = await db
    .select({ id: holeDays.id })
    .from(holeDays)
    .innerJoin(rounds, eq(holeDays.roundId, rounds.id))
    .where(and(eq(rounds.weekKey, key), isNotNull(holeDays.completedAt)))
    .limit(1);

  if (completed.length > 0) {
    console.error(
      `${key} already has closed-out holes. Refusing to rebuild it — the pars would move under scores that are already on the card.`,
    );
    process.exitCode = 1;
    return;
  }

  const generated = generateCourse(key);
  const event = tournamentForWeek(key);

  await db
    .update(courses)
    .set({
      name: generated.name,
      seed: generated.seed,
      holes: generated.holes,
      tournament: event.name,
      tournamentCourse: event.course,
      tournamentLocation: event.location,
    })
    .where(eq(courses.weekKey, key));

  const mapped = generated.holes[0].holeNumber !== null;
  console.log(`${key} is now ${event.name} at ${generated.name}, par ${generated.par}.`);
  console.log(
    mapped
      ? `  Playing the real holes ${generated.holes.map((h) => h.holeNumber).join(", ")}.`
      : "  No mapped venue for this event — using a generated layout.",
  );
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(() => pool.end());
