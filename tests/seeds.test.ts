import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { generateCourse, hashString } from "../src/lib/golf/course";
import { weekKey } from "../src/lib/time";

/**
 * hashString returns an unsigned 32-bit value, so roughly half of all week keys
 * exceed what a signed integer column can hold. The seed column is a bigint for
 * that reason; this checks the values really do run past the old limit, so the
 * reason for it is not lost.
 */
describe("course seeds", () => {
  const SIGNED_32_BIT_MAX = 2_147_483_647;

  it("produces values beyond a signed integer for a fair share of weeks", () => {
    const seeds: number[] = [];
    for (let week = 1; week <= 53; week++) {
      seeds.push(generateCourse(`2026-W${String(week).padStart(2, "0")}`).seed);
    }
    const over = seeds.filter((seed) => seed > SIGNED_32_BIT_MAX);
    assert.ok(over.length > 5, `only ${over.length} of 53 weeks exceeded the old limit`);
    for (const seed of seeds) {
      assert.ok(Number.isSafeInteger(seed) && seed >= 0, `bad seed ${seed}`);
    }
  });

  it("is stable for a given week", () => {
    assert.equal(generateCourse("2026-W14").seed, generateCourse("2026-W14").seed);
    assert.equal(hashString("diet-golf::2026-W14"), generateCourse("2026-W14").seed);
  });

  it("covers every week of a year without throwing", () => {
    for (const date of ["2026-01-01", "2026-06-15", "2026-12-31", "2027-01-03"]) {
      const course = generateCourse(weekKey(date));
      assert.equal(course.holes.length, 7);
      assert.ok(course.par >= 24 && course.par <= 34, `par ${course.par} looks wrong`);
    }
  });
});
