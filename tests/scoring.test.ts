import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { COURSE_PAR, HOLES, generateCourse } from "../src/lib/golf/course";
import {
  NO_RETURN_OVER_PAR,
  resultForHole,
  formatToPar,
  scoreHole,
  scoreLabel,
  shotsReceived,
  stablefordPoints,
  summarise,
} from "../src/lib/golf/scoring";
import type { OutcomeKey } from "../src/lib/golf/shots";
import {
  addDays,
  dayIndex,
  mondayOf,
  prettyDate,
  prettyWeekRange,
  weekKey,
  weekStart,
} from "../src/lib/time";

const shots = (...outcomes: OutcomeKey[]) => outcomes.map((outcome) => ({ outcome }));

describe("the course", () => {
  it("is seven holes to a par of 30", () => {
    assert.equal(HOLES.length, 7);
    assert.equal(COURSE_PAR, 30);
  });

  it("uses each stroke index exactly once", () => {
    const indexes = HOLES.map((hole) => hole.strokeIndex).sort((a, b) => a - b);
    assert.deepEqual(indexes, [1, 2, 3, 4, 5, 6, 7]);
  });

  it("matches the brief hole for hole", () => {
    assert.deepEqual(
      HOLES.map((hole) => [hole.short, hole.par, hole.strokeIndex]),
      [
        ["Mon", 4, 7],
        ["Tue", 4, 6],
        ["Wed", 5, 5],
        ["Thu", 5, 3],
        ["Fri", 4, 2],
        ["Sat", 5, 1],
        ["Sun", 3, 4],
      ],
    );
  });

  it("puts Amen Corner on Friday, Saturday and Sunday", () => {
    assert.deepEqual(
      HOLES.filter((hole) => hole.amenCorner).map((hole) => hole.short),
      ["Fri", "Sat", "Sun"],
    );
  });

  it("generates the same course every time for a given week", () => {
    const a = generateCourse("2026-W38");
    const b = generateCourse("2026-W38");
    assert.deepEqual(a, b);
    assert.equal(a.holes.length, 7);
    assert.equal(new Set(a.holes.map((h) => h.name)).size, 7);
    assert.equal(a.weekStart, "2026-09-14");
  });
});

describe("scoring a hole", () => {
  it("returns nothing when no shots are logged", () => {
    assert.equal(scoreHole(4, []), null);
  });

  it("plays the worked example from the brief", () => {
    // Porridge and fruit off the tee, pizza into the trees at lunch, a healthy
    // chicken dinner that recovers to the green, then a glass of wine that lips
    // out the par putt. Monday is a par 4, and that is a bogey 5.
    const monday = scoreHole(4, shots("STRIPED", "TREES", "STRIPED", "ROUGH"));
    assert.equal(monday, 5);
    assert.equal(scoreLabel(4, monday!), "Bogey");
  });

  it("gives par for a day of straight fairways", () => {
    assert.equal(scoreHole(4, shots("FAIRWAY", "FAIRWAY", "FAIRWAY")), 4);
  });

  it("never scores better than two under par", () => {
    const perfect = shots("STRIPED", "STRIPED", "STRIPED", "STRIPED", "STRIPED");
    assert.equal(scoreHole(5, perfect), 3);
    assert.equal(scoreHole(4, perfect), 2);
    assert.equal(scoreHole(3, perfect), 1);
    assert.equal(scoreLabel(3, 1), "Hole in one");
  });

  it("never scores worse than six over par", () => {
    const disaster = shots("WATER", "WATER", "WATER", "WATER", "WATER");
    assert.equal(scoreHole(4, disaster), 10);
  });

  it("names scores the way a golfer would", () => {
    assert.equal(scoreLabel(5, 3), "Eagle");
    assert.equal(scoreLabel(4, 3), "Birdie");
    assert.equal(scoreLabel(4, 4), "Par");
    assert.equal(scoreLabel(4, 6), "Double bogey");
    assert.equal(scoreLabel(4, 9), "5 over");
  });
});

describe("handicapping", () => {
  it("gives no shots off scratch", () => {
    assert.deepEqual(HOLES.map((h) => shotsReceived(0, h.strokeIndex)), [0, 0, 0, 0, 0, 0, 0]);
  });

  it("scales an 18 handicap to one shot a hole", () => {
    assert.deepEqual(HOLES.map((h) => shotsReceived(18, h.strokeIndex)), [1, 1, 1, 1, 1, 1, 1]);
  });

  it("hands out part shots hardest hole first", () => {
    // 8 off 18 rounds to 3 shots over seven holes: stroke indexes 1, 2 and 3.
    const received = new Map(HOLES.map((h) => [h.strokeIndex, shotsReceived(8, h.strokeIndex)]));
    assert.deepEqual([...received.entries()].sort((a, b) => a[0] - b[0]).map(([, v]) => v), [
      1, 1, 1, 0, 0, 0, 0,
    ]);
  });

  it("clamps silly handicaps", () => {
    assert.equal(shotsReceived(-5, 1), 0);
    assert.equal(shotsReceived(999, 1), shotsReceived(54, 1));
  });
});

describe("stableford", () => {
  it("awards two points for a net par", () => {
    assert.equal(stablefordPoints(4, 4, 0), 2);
    assert.equal(stablefordPoints(4, 5, 1), 2);
  });

  it("awards more for better scores and nothing for a wipeout", () => {
    assert.equal(stablefordPoints(4, 3, 0), 3);
    assert.equal(stablefordPoints(4, 2, 0), 4);
    assert.equal(stablefordPoints(4, 5, 0), 1);
    assert.equal(stablefordPoints(4, 6, 0), 0);
    assert.equal(stablefordPoints(4, 10, 0), 0);
  });
});

describe("a round", () => {
  const week = "2026-W38";
  const start = weekStart(week);
  const dates = HOLES.map((hole) => addDays(start, hole.dayIndex));

  const card = (played: Record<number, OutcomeKey[]>) =>
    HOLES.map((hole) => ({
      dayIndex: hole.dayIndex,
      date: dates[hole.dayIndex],
      par: hole.par,
      strokeIndex: hole.strokeIndex,
      shots: shots(...(played[hole.dayIndex] ?? [])),
    }));

  const summariseRound = (
    holes: ReturnType<typeof card>,
    today: string,
    handicap: number,
  ) => summarise(holes.map((hole) => resultForHole(hole, today, handicap)));

  it("reports live position through the holes played", () => {
    const summary = summariseRound(
      card({ 0: ["FAIRWAY", "FAIRWAY"], 1: ["STRIPED", "FAIRWAY"] }),
      dates[1],
      0,
    );
    assert.equal(summary.thru, 2);
    assert.equal(summary.holesPlayed, 2);
    assert.equal(summary.gross, 7); // par 4 + birdie 3
    assert.equal(summary.toPar, -1);
    assert.equal(summary.complete, false);
  });

  it("leaves holes still to come off the card entirely", () => {
    const summary = summariseRound(card({ 0: ["FAIRWAY"] }), dates[0], 0);
    assert.equal(summary.thru, 1);
    assert.equal(summary.holes.filter((hole) => hole.status === "future").length, 6);
  });

  it("marks today as in play until something is logged", () => {
    const summary = summariseRound(card({}), dates[2], 0);
    assert.equal(summary.holes[2].status, "pending");
    assert.equal(summary.holes[2].strokes, null);
  });

  it("penalises days that went unlogged", () => {
    const summary = summariseRound(card({}), dates[3], 0);
    const monday = summary.holes[0];
    assert.equal(monday.status, "no-return");
    assert.equal(monday.strokes, 4 + NO_RETURN_OVER_PAR);
    assert.equal(monday.stableford, 0);
    // Wednesday is in the past too, so three holes count.
    assert.equal(summary.thru, 3);
  });

  it("costs more to skip a day than to log a terrible one", () => {
    const skipped = summariseRound(card({}), dates[3], 0).holes[0].strokes!;
    const awful = summariseRound(
      card({ 0: ["WATER", "WATER", "TREES", "TREES", "WATER"] }),
      dates[3],
      0,
    ).holes[0].strokes!;
    assert.equal(skipped, 4 + NO_RETURN_OVER_PAR);
    assert.ok(awful > skipped, "an honest disaster should still cost more than a no return");
  });

  it("completes once every hole has a score", () => {
    const every: Record<number, OutcomeKey[]> = {};
    for (const hole of HOLES) every[hole.dayIndex] = ["FAIRWAY"];
    const summary = summariseRound(card(every), dates[6], 0);
    assert.equal(summary.complete, true);
    assert.equal(summary.gross, COURSE_PAR);
    assert.equal(summary.toPar, 0);
    assert.equal(summary.stableford, 14);
  });

  it("applies handicap shots to the net total", () => {
    const every: Record<number, OutcomeKey[]> = {};
    for (const hole of HOLES) every[hole.dayIndex] = ["FAIRWAY"];
    const summary = summariseRound(card(every), dates[6], 18);
    assert.equal(summary.net, COURSE_PAR - 7);
    assert.equal(summary.netToPar, -7);
    assert.equal(summary.stableford, 21);
  });
});

describe("formatting", () => {
  it("writes scores the way a board does", () => {
    assert.equal(formatToPar(0), "E");
    assert.equal(formatToPar(-3), "−3");
    assert.equal(formatToPar(4), "+4");
    assert.equal(formatToPar(null), "–");
  });
});

describe("weeks", () => {
  it("indexes days from Monday", () => {
    assert.equal(dayIndex("2026-09-14"), 0);
    assert.equal(dayIndex("2026-09-20"), 6);
  });

  it("snaps any day back to its Monday", () => {
    assert.equal(mondayOf("2026-09-16"), "2026-09-14");
    assert.equal(mondayOf("2026-09-20"), "2026-09-14");
    assert.equal(mondayOf("2026-09-14"), "2026-09-14");
  });

  it("round-trips week keys", () => {
    for (const date of ["2026-01-01", "2026-09-16", "2024-12-30", "2027-01-03"]) {
      assert.equal(weekStart(weekKey(date)), mondayOf(date));
    }
  });

  it("starts a new week on Monday", () => {
    assert.notEqual(weekKey("2026-09-20"), weekKey("2026-09-21"));
    assert.equal(weekKey("2026-09-14"), weekKey("2026-09-20"));
  });

  it("describes the week in plain English", () => {
    assert.equal(prettyWeekRange(weekKey("2026-09-16")), "14 – 20 Sep 2026");
    assert.equal(prettyWeekRange(weekKey("2026-12-31")), "28 Dec 2026 – 3 Jan 2027");
    assert.equal(prettyDate("2026-09-16"), "Wed, 16 Sep");
  });

  it("numbers weeks the ISO way across new year", () => {
    assert.equal(weekKey("2026-01-01"), "2026-W01");
    assert.equal(weekKey("2024-12-30"), "2025-W01");
    assert.equal(weekKey("2027-01-03"), "2026-W53");
  });
});
