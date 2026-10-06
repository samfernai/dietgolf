/**
 * Real tournament courses, hole by hole.
 *
 * ---------------------------------------------------------------------------
 * ON ACCURACY
 *
 * `pars` is the field that matters and the one that is dependable: it is stable
 * year to year and every source agrees on it. Each venue's pars are checked
 * against the course's published par total by a test, so a transcription slip
 * cannot sit here unnoticed.
 *
 * `yards` is optional and approximate. Championship yardages move every year
 * with tee placement and course changes — Augusta alone came back as 7,475 and
 * 7,555 from two sources, both correct for their year. Where a reliable
 * tournament-tee figure was not available the field is left out rather than
 * filled with a member-tee number, and the app simply does not show a yardage.
 *
 * `strokeIndex` is the course's own handicap ranking where it is published.
 * Most championship venues do not publish one, so it is usually absent and the
 * app derives a ranking instead (see `holesFor`).
 * ---------------------------------------------------------------------------
 */

export type Venue = {
  /** Matches `Tournament.venue`. */
  key: string;
  name: string;
  location: string;
  /** The course's own par, used to check the hole list adds up. */
  par: number;
  /** All eighteen, in order. */
  pars: number[];
  yards?: number[];
  strokeIndex?: number[];
  /** Real hole names, for the few courses that have them. */
  holeNames?: Record<number, string>;
};

export const VENUES: Venue[] = [
  {
    key: "augusta-national",
    name: "Augusta National Golf Club",
    location: "Augusta, Georgia",
    par: 72,
    pars: [4, 5, 4, 3, 4, 3, 4, 5, 4, 4, 4, 3, 5, 4, 5, 3, 4, 4],
    yards: [445, 585, 350, 240, 495, 180, 450, 570, 460, 495, 520, 155, 545, 440, 550, 170, 440, 465],
    holeNames: {
      1: "Tea Olive", 2: "Pink Dogwood", 3: "Flowering Peach", 4: "Flowering Crab Apple",
      5: "Magnolia", 6: "Juniper", 7: "Pampas", 8: "Yellow Jasmine", 9: "Carolina Cherry",
      10: "Camellia", 11: "White Dogwood", 12: "Golden Bell", 13: "Azalea", 14: "Chinese Fir",
      15: "Firethorn", 16: "Redbud", 17: "Nandina", 18: "Holly",
    },
  },
  {
    key: "tpc-sawgrass",
    name: "TPC Sawgrass, Stadium Course",
    location: "Ponte Vedra Beach, Florida",
    par: 72,
    pars: [4, 5, 3, 4, 4, 4, 4, 3, 5, 4, 5, 4, 3, 4, 4, 5, 3, 4],
    yards: [424, 555, 182, 387, 469, 413, 450, 236, 601, 419, 573, 365, 183, 485, 470, 537, 141, 462],
    holeNames: { 17: "Island Green" },
  },
  {
    key: "pebble-beach",
    name: "Pebble Beach Golf Links",
    location: "Pebble Beach, California",
    par: 72,
    pars: [4, 5, 4, 4, 3, 5, 3, 4, 4, 4, 4, 3, 4, 5, 4, 4, 3, 5],
    yards: [381, 516, 404, 331, 195, 523, 106, 428, 504, 446, 390, 202, 445, 580, 397, 403, 178, 543],
  },
  {
    key: "kapalua-plantation",
    name: "Kapalua, Plantation Course",
    location: "Maui, Hawaii",
    par: 73,
    pars: [4, 3, 4, 4, 5, 4, 4, 3, 5, 4, 3, 4, 4, 4, 5, 4, 4, 5],
    yards: [520, 219, 424, 422, 526, 424, 522, 199, 550, 384, 161, 424, 383, 301, 541, 369, 550, 677],
  },
  {
    key: "riviera",
    name: "Riviera Country Club",
    location: "Pacific Palisades, California",
    par: 71,
    pars: [5, 4, 4, 3, 4, 3, 4, 4, 4, 4, 5, 4, 4, 3, 4, 3, 5, 4],
    yards: [503, 471, 434, 273, 434, 199, 408, 433, 458, 315, 583, 479, 459, 192, 487, 166, 576, 451],
  },
  {
    key: "harbour-town",
    name: "Harbour Town Golf Links",
    location: "Hilton Head, South Carolina",
    par: 71,
    pars: [4, 5, 4, 3, 5, 4, 3, 4, 4, 4, 4, 4, 4, 3, 5, 4, 3, 4],
    yards: [422, 550, 469, 200, 569, 431, 217, 473, 332, 451, 436, 430, 373, 192, 588, 434, 198, 478],
    // One of the few tournament venues that publishes its handicap ranking.
    strokeIndex: [11, 13, 9, 15, 5, 3, 17, 1, 7, 12, 6, 8, 10, 18, 4, 14, 16, 2],
  },
  {
    key: "tpc-scottsdale",
    name: "TPC Scottsdale, Stadium Course",
    location: "Scottsdale, Arizona",
    par: 71,
    pars: [4, 4, 5, 3, 4, 4, 3, 4, 4, 4, 4, 3, 5, 4, 5, 3, 4, 4],
    yards: [403, 442, 558, 183, 470, 432, 215, 475, 453, 428, 472, 192, 558, 490, 553, 163, 332, 442],
    holeNames: { 16: "The Coliseum" },
  },
  {
    key: "quail-hollow",
    name: "Quail Hollow Club",
    location: "Charlotte, North Carolina",
    par: 71,
    pars: [4, 4, 4, 3, 4, 3, 5, 4, 4, 5, 4, 4, 3, 4, 5, 4, 3, 4],
    yards: [495, 452, 483, 184, 449, 249, 546, 346, 530, 592, 462, 456, 205, 344, 577, 529, 190, 494],
  },
  {
    key: "muirfield-village",
    name: "Muirfield Village Golf Club",
    location: "Dublin, Ohio",
    par: 72,
    pars: [4, 4, 4, 3, 5, 4, 5, 3, 4, 4, 5, 3, 4, 4, 5, 3, 4, 4],
    yards: [490, 459, 392, 210, 547, 455, 582, 200, 417, 472, 588, 180, 455, 360, 561, 218, 503, 480],
  },
  {
    key: "east-lake",
    name: "East Lake Golf Club",
    location: "Atlanta, Georgia",
    par: 70,
    pars: [4, 3, 4, 4, 4, 5, 4, 4, 3, 4, 3, 4, 4, 4, 3, 4, 4, 5],
    yards: [510, 205, 415, 465, 450, 525, 495, 390, 260, 425, 225, 390, 450, 530, 215, 460, 445, 585],
  },
  {
    key: "torrey-pines-south",
    name: "Torrey Pines, South Course",
    location: "San Diego, California",
    par: 72,
    pars: [4, 4, 3, 4, 4, 5, 4, 3, 5, 4, 3, 4, 5, 4, 4, 3, 4, 5],
    yards: [451, 389, 201, 490, 454, 564, 462, 177, 615, 454, 225, 505, 621, 437, 480, 227, 443, 570],
  },
  {
    key: "bay-hill",
    name: "Bay Hill Club & Lodge",
    location: "Orlando, Florida",
    par: 72,
    pars: [4, 3, 4, 5, 4, 5, 3, 4, 4, 4, 4, 5, 4, 3, 4, 5, 3, 4],
    yards: [459, 230, 435, 569, 384, 589, 196, 456, 481, 397, 436, 573, 371, 216, 427, 510, 220, 460],
  },
  {
    key: "tpc-river-highlands",
    name: "TPC River Highlands",
    location: "Cromwell, Connecticut",
    par: 70,
    pars: [4, 4, 4, 4, 3, 5, 4, 3, 4, 4, 3, 4, 5, 4, 4, 3, 4, 4],
    // Only member-tee yardages were available, which would misrepresent the
    // tournament setup, so none are given.
  },
  {
    key: "colonial",
    name: "Colonial Country Club",
    location: "Fort Worth, Texas",
    par: 70,
    pars: [5, 4, 4, 3, 4, 4, 4, 3, 4, 4, 5, 4, 3, 4, 4, 3, 4, 4],
  },
  {
    key: "shinnecock-hills",
    name: "Shinnecock Hills Golf Club",
    location: "Southampton, New York",
    par: 70,
    pars: [4, 3, 4, 4, 5, 4, 3, 4, 4, 4, 3, 4, 4, 4, 4, 5, 3, 4],
    yards: [394, 252, 501, 476, 592, 495, 187, 440, 482, 415, 157, 469, 371, 520, 409, 614, 176, 490],
  },
  {
    key: "royal-birkdale",
    name: "Royal Birkdale",
    location: "Southport, England",
    par: 70,
    pars: [4, 4, 4, 3, 4, 4, 3, 4, 4, 4, 4, 3, 4, 5, 3, 4, 5, 4],
    // Yardages were only available for the front nine and the twelfth, so none
    // are given rather than a partial card.
  },
  {
    key: "aronimink",
    name: "Aronimink Golf Club",
    location: "Newtown Square, Pennsylvania",
    par: 70,
    pars: [4, 4, 4, 4, 3, 4, 4, 3, 5, 4, 4, 4, 4, 3, 4, 5, 3, 4],
    yards: [434, 413, 455, 457, 159, 402, 396, 242, 605, 444, 425, 466, 385, 221, 515, 556, 229, 463],
  },
];

const BY_KEY = new Map(VENUES.map((venue) => [venue.key, venue]));

export function venueFor(key: string | undefined): Venue | null {
  return key ? BY_KEY.get(key) ?? null : null;
}

/**
 * The seven holes a Diet Golf week is played over: the course's closing
 * stretch, 12 through 18.
 *
 * Taking the finish rather than the start means the week ends on the holes the
 * tournament is actually decided on, and it puts the famous ones where they
 * belong — Sawgrass's island 17th on a Saturday, Augusta's 16th on the Friday
 * of Amen Corner. Override `holes` on a tournament to pick a different seven.
 */
export const DEFAULT_SEVEN = [12, 13, 14, 15, 16, 17, 18];

export type VenueHole = {
  /** The hole's real number on the course, 1–18. */
  number: number;
  par: number;
  yards: number | null;
  name: string | null;
  /** 1 is the hardest of the seven. */
  strokeIndex: number;
};

/**
 * Builds the week's seven holes from a venue.
 *
 * Stroke index uses the course's own ranking where it publishes one. Otherwise
 * it is derived from how long each hole plays for its par, which is the usual
 * shape of difficulty, and falls back to hole order when no yardage is known.
 */
export function holesFor(venue: Venue, numbers: number[] = DEFAULT_SEVEN): VenueHole[] {
  const picked = numbers.map((number) => {
    const index = number - 1;
    const par = venue.pars[index];
    const yards = venue.yards?.[index] ?? null;
    return {
      number,
      par,
      yards,
      name: venue.holeNames?.[number] ?? null,
      // Longer than a hole of that par usually plays is harder.
      difficulty: venue.strokeIndex
        ? -venue.strokeIndex[index]
        : yards !== null
          ? yards - { 3: 180, 4: 440, 5: 560 }[par]!
          : // No yardages to go on, so fall back to par: the long holes are
            // the hard ones. Better than ranking by hole number.
            par * 100,
    };
  });

  const ranked = [...picked].sort((a, b) => b.difficulty - a.difficulty || a.number - b.number);
  const strokeIndexes = new Map(ranked.map((hole, i) => [hole.number, i + 1]));

  return picked.map(({ difficulty: _difficulty, ...hole }) => ({
    ...hole,
    strokeIndex: strokeIndexes.get(hole.number)!,
  }));
}
