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
  // ---------------------------------------------------------------------
  // The rest of the tour. Each card below was taken from its event's
  // published tournament scorecard and checked against the course's stated
  // par before it was written in; several sources disagreed with themselves
  // and the arithmetic is what settled it.
  // ---------------------------------------------------------------------
  {
    key: "waialae",
    name: "Waialae Country Club",
    location: "Honolulu, Hawaii",
    par: 70,
    pars: [4, 4, 4, 3, 4, 4, 3, 4, 5, 4, 3, 4, 4, 4, 4, 4, 3, 5],
    yards: [480, 423, 422, 204, 467, 460, 176, 454, 506, 351, 194, 440, 477, 430, 398, 417, 194, 551],
  },
  {
    key: "pga-west-stadium",
    name: "PGA West, Stadium Course",
    location: "La Quinta, California",
    par: 72,
    pars: [4, 4, 4, 3, 5, 3, 4, 5, 4, 4, 5, 4, 3, 4, 4, 5, 3, 4],
    yards: [445, 371, 471, 170, 535, 227, 346, 559, 452, 405, 591, 363, 214, 389, 468, 600, 165, 439],
    holeNames: { 17: "Alcatraz" },
  },
  {
    key: "pga-national-champion",
    name: "PGA National, Champion Course",
    location: "Palm Beach Gardens, Florida",
    par: 71,
    pars: [4, 4, 5, 4, 3, 4, 3, 4, 4, 5, 4, 4, 4, 4, 3, 4, 3, 5],
    yards: [365, 464, 538, 395, 217, 479, 226, 427, 421, 530, 450, 438, 388, 465, 179, 434, 175, 556],
    holeNames: { 15: "The Bear Trap", 16: "The Bear Trap", 17: "The Bear Trap" },
  },
  {
    key: "innisbrook-copperhead",
    name: "Innisbrook, Copperhead Course",
    location: "Palm Harbor, Florida",
    par: 71,
    pars: [5, 4, 4, 3, 5, 4, 4, 3, 4, 4, 5, 4, 3, 5, 3, 4, 3, 4],
    yards: [560, 435, 455, 195, 605, 465, 420, 235, 442, 445, 575, 380, 200, 590, 215, 475, 215, 445],
    // The Snake Pit falls on the Friday, Saturday and Sunday of a Diet Golf week.
    holeNames: { 16: "Snake Pit", 17: "Snake Pit", 18: "Snake Pit" },
  },
  {
    key: "memorial-park",
    name: "Memorial Park Golf Course",
    location: "Houston, Texas",
    par: 70,
    pars: [4, 3, 5, 4, 4, 4, 3, 5, 3, 4, 3, 4, 4, 4, 3, 5, 4, 4],
    yards: [522, 167, 587, 490, 440, 443, 216, 625, 182, 456, 237, 496, 406, 529, 155, 576, 405, 503],
  },
  {
    key: "tpc-san-antonio-oaks",
    name: "TPC San Antonio, Oaks Course",
    location: "San Antonio, Texas",
    par: 72,
    pars: [4, 5, 3, 4, 4, 4, 3, 5, 4, 4, 4, 4, 3, 5, 4, 3, 4, 5],
    yards: [454, 602, 213, 481, 342, 403, 207, 604, 474, 447, 405, 410, 241, 567, 464, 183, 347, 591],
  },
  {
    key: "tpc-louisiana",
    name: "TPC Louisiana",
    location: "Avondale, Louisiana",
    par: 72,
    pars: [4, 5, 3, 4, 4, 4, 5, 4, 3, 4, 5, 4, 4, 3, 4, 4, 3, 5],
    // Both nines are from published cards, but of different years: each adds up
    // to its own stated total, while together they come to 7,387 against a
    // published 7,425. The closing nine — the one actually played here — is the
    // self-consistent one.
    yards: [399, 548, 221, 482, 438, 476, 561, 372, 207, 390, 575, 492, 377, 216, 490, 340, 215, 588],
  },
  {
    key: "detroit-golf-club",
    name: "Detroit Golf Club, North Course",
    location: "Detroit, Michigan",
    par: 70,
    // A par 72 until the renovation turned the 7th and 17th into long par 4s.
    pars: [4, 4, 4, 5, 3, 4, 4, 4, 3, 4, 3, 4, 4, 5, 3, 4, 4, 4],
    yards: [402, 494, 373, 592, 156, 501, 505, 349, 205, 422, 246, 481, 413, 561, 163, 456, 537, 472],
  },
  {
    key: "tpc-deere-run",
    name: "TPC Deere Run",
    location: "Silvis, Illinois",
    par: 71,
    pars: [4, 5, 3, 4, 4, 4, 3, 4, 4, 5, 4, 3, 4, 4, 4, 3, 5, 4],
    yards: [416, 561, 186, 492, 433, 367, 226, 428, 503, 596, 432, 215, 424, 361, 484, 158, 569, 476],
  },
  {
    key: "tpc-twin-cities",
    name: "TPC Twin Cities",
    location: "Blaine, Minnesota",
    par: 71,
    pars: [4, 4, 4, 3, 4, 5, 4, 3, 4, 4, 4, 5, 3, 4, 4, 4, 3, 5],
    // The published card came back missing the 9th, 17th and 18th. Three
    // guessed holes would be worse than none, so the yardages are left out.
  },
  {
    key: "sedgefield",
    name: "Sedgefield Country Club",
    location: "Greensboro, North Carolina",
    par: 70,
    // The 18th is a member par 5 that the Wyndham plays as a 507-yard par 4,
    // which is what makes the tournament card a 70 and not the 71 on the wall.
    pars: [4, 4, 3, 4, 5, 4, 3, 4, 4, 4, 4, 3, 4, 4, 5, 3, 4, 4],
    yards: [412, 442, 172, 428, 523, 423, 219, 374, 416, 440, 486, 244, 405, 505, 547, 179, 406, 507],
  },
  {
    key: "tpc-southwind",
    name: "TPC Southwind",
    location: "Memphis, Tennessee",
    par: 70,
    pars: [4, 4, 5, 3, 4, 4, 4, 3, 4, 4, 3, 4, 4, 3, 4, 5, 4, 4],
    yards: [434, 408, 579, 196, 529, 433, 482, 171, 457, 465, 168, 406, 472, 205, 395, 530, 505, 453],
  },
  {
    key: "el-cardonal",
    name: "El Cardonal at Diamante",
    location: "Los Cabos, Mexico",
    par: 72,
    pars: [5, 3, 4, 4, 4, 5, 4, 4, 3, 4, 3, 4, 4, 5, 4, 3, 4, 5],
    yards: [541, 208, 351, 483, 438, 601, 489, 474, 200, 344, 189, 401, 475, 554, 462, 154, 462, 537],
  },
  {
    key: "port-royal",
    name: "Port Royal Golf Course",
    location: "Southampton, Bermuda",
    par: 71,
    pars: [4, 5, 3, 4, 4, 4, 5, 3, 4, 4, 4, 4, 3, 4, 4, 3, 5, 4],
    yards: [438, 567, 148, 458, 380, 370, 517, 213, 383, 350, 443, 383, 235, 393, 412, 235, 507, 410],
  },
  {
    key: "sea-island-seaside",
    name: "Sea Island, Seaside Course",
    location: "St Simons Island, Georgia",
    par: 70,
    pars: [4, 4, 3, 4, 4, 3, 5, 4, 4, 4, 4, 3, 4, 4, 5, 4, 3, 4],
    yards: [417, 415, 204, 429, 409, 179, 582, 368, 452, 418, 425, 223, 408, 442, 565, 407, 192, 470],
  },
  {
    key: "albany",
    name: "Albany Golf Course",
    location: "New Providence, Bahamas",
    par: 72,
    pars: [4, 3, 5, 4, 3, 5, 4, 3, 5, 4, 5, 3, 4, 4, 5, 4, 3, 4],
    yards: [438, 193, 573, 498, 179, 602, 366, 217, 632, 440, 592, 204, 513, 307, 552, 483, 189, 471],
  },

  // ---------------------------------------------------------------------
  // The 2026 FedExCup Fall's new stops.
  // ---------------------------------------------------------------------
  {
    key: "walnut-cove",
    name: "The Cliffs at Walnut Cove",
    location: "Arden, North Carolina",
    par: 71,
    pars: [4, 3, 4, 4, 3, 5, 4, 5, 4, 4, 3, 5, 4, 3, 4, 3, 5, 4],
    yards: [450, 190, 400, 417, 227, 518, 461, 557, 424, 408, 244, 530, 470, 205, 464, 196, 532, 474],
  },
  {
    key: "black-desert",
    name: "Black Desert Resort",
    location: "Ivins, Utah",
    par: 71,
    pars: [4, 4, 3, 4, 4, 4, 5, 3, 5, 4, 4, 4, 4, 4, 3, 4, 3, 5],
    // One round's actual tee placements, so they come to 7,290 against a
    // published 7,421. The relative lengths — all the stroke index needs —
    // are right.
    yards: [475, 414, 194, 470, 312, 452, 578, 130, 590, 435, 529, 461, 500, 323, 178, 498, 149, 602],
  },
  {
    key: "yokohama-west",
    name: "Yokohama Country Club, West Course",
    location: "Kanagawa, Japan",
    par: 71,
    // Thirteen par 4s, which is as lopsided as a card on tour gets.
    pars: [4, 4, 3, 5, 4, 5, 3, 4, 4, 4, 4, 4, 4, 4, 4, 3, 4, 4],
    yards: [475, 418, 168, 536, 436, 529, 182, 357, 432, 431, 510, 458, 337, 508, 387, 237, 439, 475],
  },
  {
    key: "vidanta-vallarta",
    name: "Vidanta Vallarta",
    location: "Nuevo Vallarta, Mexico",
    par: 71,
    pars: [4, 4, 4, 4, 3, 5, 4, 4, 3, 4, 3, 5, 3, 5, 4, 4, 3, 5],
    yards: [415, 498, 445, 520, 208, 603, 297, 476, 174, 475, 195, 637, 170, 585, 459, 505, 226, 548],
  },
  {
    key: "barton-creek-foothills",
    name: "Omni Barton Creek, Fazio Foothills",
    location: "Austin, Texas",
    par: 72,
    pars: [4, 4, 3, 4, 5, 4, 4, 5, 3, 4, 4, 4, 4, 3, 5, 4, 3, 5],
    yards: [460, 381, 178, 420, 611, 392, 442, 529, 175, 440, 446, 282, 477, 170, 537, 422, 203, 560],
  },

  // ---------------------------------------------------------------------
  // Off the schedule, kept in the database. These are real tour courses whose
  // events are not on the 2026 calendar; they cost nothing to keep and are
  // ready if the Tour goes back.
  // ---------------------------------------------------------------------
  {
    key: "tpc-summerlin",
    name: "TPC Summerlin",
    location: "Las Vegas, Nevada",
    par: 71,
    // The 3rd is a member par 5 the Shriners played as a 492-yard par 4.
    pars: [4, 4, 4, 4, 3, 4, 4, 3, 5, 4, 4, 4, 5, 3, 4, 5, 3, 4],
    yards: [408, 469, 492, 450, 197, 430, 382, 239, 563, 420, 448, 442, 606, 168, 341, 560, 196, 444],
  },
  {
    key: "silverado-north",
    name: "Silverado Resort, North Course",
    location: "Napa, California",
    par: 72,
    pars: [4, 3, 4, 4, 5, 4, 3, 4, 5, 4, 3, 4, 4, 4, 3, 5, 4, 5],
    // Members' blue tees; the Procore played it about 350 yards longer.
    yards: [432, 193, 399, 378, 536, 431, 209, 344, 521, 409, 174, 363, 413, 389, 187, 521, 355, 539],
  },
  {
    key: "country-club-of-jackson",
    name: "Country Club of Jackson",
    location: "Jackson, Mississippi",
    par: 72,
    // The 18th is a member par 5 the Sanderson Farms played as a par 4.
    pars: [4, 4, 5, 3, 5, 4, 3, 4, 4, 3, 5, 4, 3, 5, 4, 4, 4, 4],
    yards: [411, 418, 591, 181, 612, 482, 214, 403, 421, 223, 554, 449, 168, 584, 330, 479, 436, 505],
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
