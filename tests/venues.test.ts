import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { DEFAULT_SEVEN, VENUES, holesFor, venueFor } from "../src/lib/golf/venues";

describe("the venue data", () => {
  it("has eighteen holes per course, all of them par 3 to 5", () => {
    for (const venue of VENUES) {
      assert.equal(venue.pars.length, 18, `${venue.name} should have 18 pars`);
      for (const par of venue.pars) {
        assert.ok(par >= 3 && par <= 5, `${venue.name} has a par of ${par}`);
      }
    }
  });

  /** The check that catches a mistyped hole: the card has to add up. */
  it("adds up to each course's published par", () => {
    for (const venue of VENUES) {
      const total = venue.pars.reduce((sum, par) => sum + par, 0);
      assert.equal(total, venue.par, `${venue.name} pars sum to ${total}, not ${venue.par}`);
    }
  });

  it("keeps yardages aligned with the holes, where they are given", () => {
    for (const venue of VENUES) {
      if (!venue.yards) continue;
      assert.equal(venue.yards.length, 18, `${venue.name} yardages are misaligned`);
      for (const [i, yards] of venue.yards.entries()) {
        const par = venue.pars[i];
        const limits = { 3: [90, 300], 4: [260, 560], 5: [450, 700] }[par]!;
        assert.ok(
          yards >= limits[0] && yards <= limits[1],
          `${venue.name} hole ${i + 1} is ${yards} yards for a par ${par}`,
        );
      }
    }
  });

  it("uses each stroke index once, where a course publishes one", () => {
    for (const venue of VENUES) {
      if (!venue.strokeIndex) continue;
      assert.deepEqual(
        [...venue.strokeIndex].sort((a, b) => a - b),
        Array.from({ length: 18 }, (_, i) => i + 1),
        `${venue.name} stroke indexes are not 1–18`,
      );
    }
  });

  it("has unique keys", () => {
    assert.equal(new Set(VENUES.map((v) => v.key)).size, VENUES.length);
  });
});

describe("picking the week's seven holes", () => {
  it("takes the closing stretch", () => {
    const augusta = venueFor("augusta-national")!;
    const holes = holesFor(augusta);
    assert.deepEqual(holes.map((h) => h.number), DEFAULT_SEVEN);
    // Augusta 12-18: Golden Bell, Azalea, Chinese Fir, Firethorn, Redbud, Nandina, Holly.
    assert.deepEqual(holes.map((h) => h.par), [3, 5, 4, 5, 3, 4, 4]);
    assert.equal(holes.reduce((sum, h) => sum + h.par, 0), 28);
    assert.equal(holes[0].name, "Golden Bell");
    assert.equal(holes[6].name, "Holly");
  });

  it("puts the island green on the Saturday at Sawgrass", () => {
    // Fri, Sat, Sun are the last three of the seven — holes 16, 17 and 18.
    const holes = holesFor(venueFor("tpc-sawgrass")!);
    assert.equal(holes[5].number, 17);
    assert.equal(holes[5].par, 3);
    assert.equal(holes[5].yards, 141);
  });

  it("gives every hole its own stroke index, hardest first", () => {
    for (const venue of VENUES) {
      const holes = holesFor(venue);
      assert.deepEqual(
        [...holes.map((h) => h.strokeIndex)].sort((a, b) => a - b),
        [1, 2, 3, 4, 5, 6, 7],
        `${venue.name} stroke indexes are not 1–7`,
      );
    }
  });

  it("uses the course's own ranking when it has one", () => {
    // Harbour Town's 18th is its stroke index 2, the hardest of the closing seven.
    const holes = holesFor(venueFor("harbour-town")!);
    assert.equal(holes.find((h) => h.number === 18)!.strokeIndex, 1);
    // Its 14th is stroke index 18 on the card — the easiest of the seven.
    assert.equal(holes.find((h) => h.number === 14)!.strokeIndex, 7);
  });

  it("still ranks a course with no yardages at all", () => {
    const holes = holesFor(venueFor("colonial")!);
    assert.equal(holes.length, 7);
    assert.deepEqual([...holes.map((h) => h.strokeIndex)].sort((a, b) => a - b), [1, 2, 3, 4, 5, 6, 7]);
  });

  it("can take a different seven", () => {
    const holes = holesFor(venueFor("pebble-beach")!, [1, 2, 3, 4, 5, 6, 7]);
    assert.deepEqual(holes.map((h) => h.number), [1, 2, 3, 4, 5, 6, 7]);
    assert.equal(holes[6].yards, 106);
  });
});
