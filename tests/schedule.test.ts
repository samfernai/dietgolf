import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { OFF_WEEK, TOURNAMENTS, isOffWeek, tournamentForWeek } from "../src/lib/golf/tournaments";
import { weekKey } from "../src/lib/time";
import { generateCourse } from "../src/lib/golf/course";

const week = (n: number) => `2026-W${String(n).padStart(2, "0")}`;

describe("the season schedule", () => {
  it("gives every week an event", () => {
    for (let n = 1; n <= 53; n++) {
      assert.ok(tournamentForWeek(week(n)).name, `week ${n} has no event`);
    }
  });

  it("never lands two events on the same week", () => {
    // buildSchedule throws on a clash, so importing is most of the check; this
    // confirms each pinned event really owns its week.
    for (const tournament of TOURNAMENTS) {
      if (!tournament.isoWeek) continue;
      assert.equal(
        tournamentForWeek(week(tournament.isoWeek)).name,
        tournament.name,
        `${tournament.name} does not own week ${tournament.isoWeek}`,
      );
    }
  });

  it("puts the majors on the weeks they are played", () => {
    // The two with confirmed 2026 dates.
    assert.equal(tournamentForWeek(weekKey("2026-05-14")).name, "PGA Championship");
    assert.equal(tournamentForWeek(weekKey("2026-06-18")).name, "U.S. Open");
    // And the two that sit on the same weeks every year.
    assert.equal(tournamentForWeek(weekKey("2026-04-09")).name, "The Masters");
    assert.equal(tournamentForWeek(weekKey("2026-07-16")).name, "The Open Championship");
  });

  /**
   * The schedule used to fill weeks in list order and wrap once it ran out, so
   * October replayed January's events. This is the guard against that.
   */
  it("does not replay the new year in the autumn", () => {
    for (const n of [40, 41, 42, 43, 44, 45, 46, 47, 48, 49, 50, 51, 52, 53]) {
      const name = tournamentForWeek(week(n)).name;
      assert.notEqual(name, "Sony Open in Hawaii", `week ${n} is showing a January event`);
      assert.notEqual(name, "The American Express", `week ${n} is showing a January event`);
      assert.notEqual(name, "The Masters", `week ${n} is showing an April event`);
    }
  });

  it("runs the season in calendar order", () => {
    const pinned = TOURNAMENTS.filter((t) => t.isoWeek).sort((a, b) => a.isoWeek! - b.isoWeek!);
    assert.equal(pinned[0].name, "Sony Open in Hawaii");
    assert.equal(pinned[pinned.length - 1].name, "Hero World Challenge");
  });

  it("treats the weeks the Tour is dark as off weeks", () => {
    // Mid-October sits between the Baycurrent and the Bermuda Championship.
    assert.ok(isOffWeek(week(42)));
    assert.equal(tournamentForWeek(week(42)).name, OFF_WEEK.name);
    // And 2026 opens dark: there is no Sentry, so the year starts in week 3.
    assert.ok(isOffWeek(week(1)));
    assert.ok(isOffWeek(week(2)));
    assert.ok(!isOffWeek(week(15)));
  });
});

describe("course names", () => {
  it("keeps a real event at its real host course, mapped or not", () => {
    // The Scottish Open's holes are not mapped, but it is still played there.
    const scottish = generateCourse(week(28));
    assert.equal(scottish.name, "The Renaissance Club");
    assert.equal(scottish.holes[0].holeNumber, null, "its holes are a stand-in");
    // A mapped venue names itself.
    assert.equal(generateCourse(week(15)).name, "Augusta National Golf Club");
  });

  it("only invents a course name for the off week", () => {
    const off = generateCourse(week(42));
    assert.ok(isOffWeek(week(42)));
    assert.notEqual(off.name, OFF_WEEK.course);
    assert.ok(off.name.length > 3);
  });
});
