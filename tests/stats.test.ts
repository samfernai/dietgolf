import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { computeStats, drivingDistanceFor, puttsFor, type HoleRecord } from "../src/lib/golf/stats";
import type { Grade } from "../src/lib/golf/calories";

function record(over: Partial<HoleRecord> & { playerId: string }): HoleRecord {
  return {
    weekKey: "2026-W41",
    dayIndex: 1,
    par: 4,
    strokes: 4,
    grade: "PAR",
    teeGrade: "PAR",
    approachGrades: ["PAR"],
    girGrade: "PAR",
    greenInRegulation: true,
    ...over,
  };
}

describe("putts", () => {
  it("reads the way a card would", () => {
    assert.equal(puttsFor(4, 4, true), 2); // green in two, two putts
    assert.equal(puttsFor(4, 3, true), 1); // birdie from the middle of the green
    assert.equal(puttsFor(4, 4, false), 1); // missed the green, chipped and holed
    assert.equal(puttsFor(4, 5, false), 2);
    assert.equal(puttsFor(5, 5, true), 2);
    assert.equal(puttsFor(3, 3, true), 2);
    assert.equal(puttsFor(3, 1, true), 0); // an ace needs no putt at all
  });

  it("never goes negative", () => {
    assert.equal(puttsFor(5, 2, false), 0);
  });
});

describe("driving distance", () => {
  it("puts a day on pace at the base figure and spreads either side", () => {
    assert.equal(drivingDistanceFor("PAR"), 290);
    assert.ok(drivingDistanceFor("EAGLE") > drivingDistanceFor("PAR"));
    assert.ok(drivingDistanceFor("SNOWMAN") < drivingDistanceFor("BOGEY"));
  });
});

describe("a player's statistics", () => {
  it("is empty for someone who has played nothing", () => {
    const stats = computeStats([record({ playerId: "other" })], "me");
    assert.equal(stats.holes, 0);
    assert.equal(stats.scoringAverage, null);
  });

  it("counts fairways on par 4s and 5s only", () => {
    const stats = computeStats(
      [
        record({ playerId: "me", par: 3, strokes: 3, dayIndex: 6, teeGrade: "BOGEY" }),
        record({ playerId: "me", par: 4, strokes: 4, dayIndex: 0, teeGrade: "PAR" }),
        record({ playerId: "me", par: 5, strokes: 5, dayIndex: 2, teeGrade: "BOGEY" }),
      ],
      "me",
    );
    // The par 3 is excluded, so one of the two counted tee shots found the fairway.
    assert.equal(stats.fairwaysInRegulation, 50);
  });

  it("counts a scramble only when the green was missed", () => {
    const stats = computeStats(
      [
        record({ playerId: "me", dayIndex: 0, greenInRegulation: false, strokes: 4 }), // saved par
        record({ playerId: "me", dayIndex: 1, greenInRegulation: false, strokes: 5 }), // did not
        record({ playerId: "me", dayIndex: 2, greenInRegulation: true, strokes: 4 }),
      ],
      "me",
    );
    assert.equal(stats.greensInRegulation, (1 / 3) * 100);
    assert.equal(stats.scrambling, 50);
  });

  it("measures strokes gained against the players on the same hole", () => {
    // Three players on one hole: two bogey it off the tee, one is on pace.
    // The two who bogeyed missed the green and got up and down in two, so the
    // difference is all in the long game — putting should come out level.
    const field: HoleRecord[] = [
      record({ playerId: "me", teeGrade: "PAR", approachGrades: ["PAR"], strokes: 4 }),
      record({ playerId: "a", teeGrade: "BOGEY", approachGrades: ["BOGEY"], strokes: 5, greenInRegulation: false }),
      record({ playerId: "b", teeGrade: "BOGEY", approachGrades: ["BOGEY"], strokes: 5, greenInRegulation: false }),
    ];
    const mine = computeStats(field, "me");
    // Field averages 2/3 of a stroke worse off the tee, so that is what I gained.
    assert.ok(Math.abs((mine.strokesGainedOffTheTee as number) - 2 / 3) < 1e-9);
    assert.ok(Math.abs((mine.strokesGainedApproach as number) - 2 / 3) < 1e-9);
    assert.equal(mine.strokesGainedPutting, 0);

    const theirs = computeStats(field, "a");
    assert.ok((theirs.strokesGainedOffTheTee as number) < 0);
  });

  it("leaves strokes gained alone when nobody else played the hole", () => {
    const stats = computeStats([record({ playerId: "me" })], "me");
    assert.equal(stats.strokesGainedOffTheTee, null);
    assert.equal(stats.strokesGainedPutting, null);
  });

  it("splits the scoring average by weekday", () => {
    const stats = computeStats(
      [
        record({ playerId: "me", dayIndex: 0, strokes: 5 }),
        record({ playerId: "me", dayIndex: 0, strokes: 3, weekKey: "2026-W40" }),
        record({ playerId: "me", dayIndex: 3, par: 5, strokes: 6 }),
      ],
      "me",
    );
    assert.equal(stats.dailyScoringAverage[0], 4);
    assert.equal(stats.dailyScoringAverage[3], 6);
    assert.equal(stats.dailyScoringAverage[1], null);
    assert.equal(stats.rounds, 2);
  });

  it("counts one-putts and three-putt avoidance", () => {
    const stats = computeStats(
      [
        record({ playerId: "me", dayIndex: 0, strokes: 3, greenInRegulation: true }), // 1 putt
        record({ playerId: "me", dayIndex: 1, strokes: 4, greenInRegulation: true }), // 2 putts
        record({ playerId: "me", dayIndex: 2, strokes: 5, greenInRegulation: true }), // 3 putts
      ],
      "me",
    );
    assert.ok(Math.abs((stats.onePuttPercentage as number) - 100 / 3) < 1e-9);
    assert.ok(Math.abs((stats.threePuttAvoidance as number) - (200 / 3)) < 1e-9);
  });

  it("only counts inside ten feet when the approach left you under par pace", () => {
    const close: Grade = "BIRDIE";
    const stats = computeStats(
      [
        // Approach under pace, converted in one.
        record({ playerId: "me", dayIndex: 0, girGrade: close, strokes: 3 }),
        // Approach under pace, two putts.
        record({ playerId: "me", dayIndex: 1, girGrade: close, strokes: 4 }),
        // Approach only on pace — not a chance from close range, so excluded.
        record({ playerId: "me", dayIndex: 2, girGrade: "PAR", strokes: 3 }),
      ],
      "me",
    );
    assert.equal(stats.puttingInsideTenFeet, 50);
  });
});
