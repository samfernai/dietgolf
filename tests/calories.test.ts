import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  MENS_THRESHOLDS,
  basalMetabolicRate,
  gradeFor,
  gradeLabel,
  gradesForPar,
  maintenanceCalories,
  scoreBalance,
  thresholdsFor,
  type Sex,
} from "../src/lib/golf/calories";
import {
  checkpointsForPar,
  evaluateHole,
  girIndexForPar,
  minutesFromTime,
  timeFromMinutes,
  MINUTES_IN_DAY,
} from "../src/lib/golf/checkpoints";

describe("maintenance calories", () => {
  const body = { heightCm: 180, weightKg: 82, age: 41 };

  it("follows Mifflin-St Jeor", () => {
    // 10(82) + 6.25(180) − 5(41) + 5 = 820 + 1125 − 205 + 5
    assert.equal(basalMetabolicRate({ ...body, sex: "male" }), 1745);
    assert.equal(basalMetabolicRate({ ...body, sex: "female" }), 1579);
  });

  it("puts unspecified between the two", () => {
    const male = basalMetabolicRate({ ...body, sex: "male" });
    const female = basalMetabolicRate({ ...body, sex: "female" });
    const neither = basalMetabolicRate({ ...body, sex: "unspecified" });
    assert.ok(neither < male && neither > female);
  });

  it("assumes sedentary, because exercise is logged separately", () => {
    assert.equal(maintenanceCalories({ ...body, sex: "male" }), Math.round(1745 * 1.2));
  });
});

describe("grading a balance", () => {
  const male: Sex = "male";

  it("places every men's band exactly where the brief puts it", () => {
    const cases: [number, string][] = [
      [-2500, "EAGLE"],
      [-2000, "EAGLE"],
      [-1999, "BIRDIE"],
      [-1000, "BIRDIE"],
      [-999, "PAR"],
      [0, "PAR"],
      [250, "PAR"],
      [251, "BOGEY"],
      [1500, "BOGEY"],
      [1501, "DOUBLE"],
      [2750, "DOUBLE"],
      [2751, "TRIPLE"],
      [3500, "TRIPLE"],
      [3501, "SNOWMAN"],
      [9000, "SNOWMAN"],
    ];
    for (const [balance, grade] of cases) {
      assert.equal(gradeFor(4, balance, male), grade, `${balance} should be a ${grade}`);
    }
  });

  it("leaves no gap or overlap between bands", () => {
    // Walk the whole range and check the grade only ever moves one step.
    let previous = gradeFor(4, -5000, male);
    for (let balance = -5000; balance <= 5000; balance += 1) {
      const grade = gradeFor(4, balance, male);
      if (grade !== previous) {
        const order = gradesForPar(4);
        assert.equal(
          order.indexOf(grade),
          order.indexOf(previous) + 1,
          `jumped from ${previous} to ${grade} at ${balance}`,
        );
        previous = grade;
      }
    }
    assert.equal(previous, "SNOWMAN");
  });

  it("has no eagle on a par 3 — an albatross aces it instead", () => {
    assert.deepEqual(gradesForPar(3).includes("EAGLE"), false);
    assert.deepEqual(gradesForPar(4).includes("ALBATROSS"), false);

    assert.equal(gradeFor(3, -3500, male), "ALBATROSS");
    assert.equal(gradeFor(3, -4000, male), "ALBATROSS");
    // The eagle band folds into the birdie, because two under a par 3 is the hole.
    assert.equal(gradeFor(3, -3499, male), "BIRDIE");
    assert.equal(gradeFor(3, -2000, male), "BIRDIE");
    assert.equal(gradeFor(3, -1000, male), "BIRDIE");
    assert.equal(gradeFor(3, -999, male), "PAR");
  });

  it("gives women bands 15% tighter", () => {
    const womens = thresholdsFor("female");
    assert.equal(womens.birdie, -850);
    assert.equal(womens.eagle, -1700);
    assert.equal(womens.albatross, -2975);
    assert.equal(womens.par, 213);
    assert.equal(womens.bogey, 1275);

    assert.equal(gradeFor(4, -850, "female"), "BIRDIE");
    assert.equal(gradeFor(4, -849, "female"), "PAR");
    assert.equal(gradeFor(4, -1700, "female"), "EAGLE");
    // The same balance is only a par on the men's table.
    assert.equal(gradeFor(4, -850, "male"), "PAR");
  });

  it("leaves unspecified on the base table", () => {
    assert.deepEqual(thresholdsFor("unspecified"), MENS_THRESHOLDS);
  });
});

describe("turning a grade into strokes", () => {
  it("scores each par correctly", () => {
    assert.equal(scoreBalance(4, 0, "male"), 4);
    assert.equal(scoreBalance(4, -2000, "male"), 2);
    assert.equal(scoreBalance(4, -1200, "male"), 3);
    assert.equal(scoreBalance(4, 3501, "male"), 8); // the snowman is literal on a par 4
    assert.equal(scoreBalance(5, -2000, "male"), 3);
    assert.equal(scoreBalance(5, 3501, "male"), 9);
    assert.equal(scoreBalance(3, 0, "male"), 3);
    assert.equal(scoreBalance(3, 3501, "male"), 7);
  });

  it("aces a par 3 rather than scoring zero", () => {
    assert.equal(scoreBalance(3, -3500, "male"), 1);
    assert.equal(gradeLabel(3, "ALBATROSS"), "Hole in one");
    assert.equal(gradeLabel(5, "ALBATROSS"), "Albatross");
  });
});

describe("checkpoints", () => {
  it("runs to the times in the brief", () => {
    assert.deepEqual(checkpointsForPar(3).map((c) => c.time), ["10:00", "20:00"]);
    assert.deepEqual(checkpointsForPar(4).map((c) => c.time), ["10:00", "14:00", "20:00"]);
    assert.deepEqual(checkpointsForPar(5).map((c) => c.time), ["10:00", "14:00", "18:00", "21:00"]);
  });

  it("puts the green in regulation shot second from last on every hole", () => {
    for (const par of [3, 4, 5]) {
      assert.equal(girIndexForPar(par), checkpointsForPar(par).length - 2);
      assert.equal(girIndexForPar(par), par - 3);
    }
  });

  it("converts times both ways", () => {
    assert.equal(minutesFromTime("10:00"), 600);
    assert.equal(minutesFromTime("21:30"), 1290);
    assert.equal(timeFromMinutes(600), "10:00");
    assert.equal(timeFromMinutes(1290), "21:30");
  });
});

describe("playing a hole against the clock", () => {
  const base = {
    par: 4,
    sex: "male" as Sex,
    maintenance: 2400,
    burn: [],
  };

  it("pro-rates maintenance, so breakfast is not an albatross", () => {
    const hole = evaluateHole({
      ...base,
      intake: [{ minutes: 8 * 60, calories: 600 }],
      nowMinutes: 10 * 60,
    });
    // By 10:00, 600/1440 of 2400 = 1000 calories of maintenance have gone.
    assert.equal(hole.checkpoints[0].balance, -400);
    assert.equal(hole.checkpoints[0].grade, "PAR");
  });

  it("settles on the full day's maintenance at midnight", () => {
    const hole = evaluateHole({
      ...base,
      intake: [
        { minutes: 8 * 60, calories: 500 },
        { minutes: 13 * 60, calories: 600 },
        { minutes: 19 * 60, calories: 700 },
      ],
      burn: [{ minutes: 18 * 60, calories: 500 }],
      nowMinutes: MINUTES_IN_DAY,
    });
    assert.equal(hole.intake, 1800);
    assert.equal(hole.burn, 500);
    assert.equal(hole.balance, 1800 - 500 - 2400);
    assert.equal(hole.grade, "BIRDIE");
    assert.equal(hole.provisional, false);
  });

  it("only counts what was logged before each checkpoint", () => {
    const hole = evaluateHole({
      ...base,
      intake: [
        { minutes: 9 * 60, calories: 400 },
        { minutes: 19 * 60, calories: 1600 },
      ],
      nowMinutes: MINUTES_IN_DAY,
    });
    assert.equal(hole.checkpoints[0].intake, 400); // 10:00 — dinner has not happened
    assert.equal(hole.checkpoints[1].intake, 400); // 14:00
    assert.equal(hole.checkpoints[2].intake, 2000); // 20:00
  });

  it("marks checkpoints the clock has not reached", () => {
    const hole = evaluateHole({ ...base, intake: [], nowMinutes: 11 * 60 });
    assert.deepEqual(hole.checkpoints.map((c) => c.reached), [true, false, false]);
    assert.equal(hole.provisional, true);
  });

  it("adjusts a hole that looked like a birdie at 8pm", () => {
    // On pace at 20:00, then a late 900-calorie blowout.
    const intake = [
      { minutes: 8 * 60, calories: 400 },
      { minutes: 13 * 60, calories: 500 },
    ];
    // By 20:00 maintenance has pro-rated to 2000, so 900 eaten is 1,100 under.
    const atEight = evaluateHole({ ...base, intake, nowMinutes: 20 * 60 });
    assert.equal(atEight.checkpoints[2].balance, -1100);
    assert.equal(atEight.checkpoints[2].grade, "BIRDIE");

    // A late dinner pulls it back to a par once the full day is counted.
    const atMidnight = evaluateHole({
      ...base,
      intake: [...intake, { minutes: 22 * 60, calories: 1000 }],
      nowMinutes: MINUTES_IN_DAY,
    });
    assert.equal(atMidnight.balance, -500);
    assert.equal(atMidnight.grade, "PAR");
  });

  it("counts exercise against intake", () => {
    const hole = evaluateHole({
      ...base,
      intake: [{ minutes: 12 * 60, calories: 2400 }],
      burn: [{ minutes: 17 * 60, calories: 1100 }],
      nowMinutes: MINUTES_IN_DAY,
    });
    assert.equal(hole.balance, -1100);
    assert.equal(hole.grade, "BIRDIE");
  });
});
