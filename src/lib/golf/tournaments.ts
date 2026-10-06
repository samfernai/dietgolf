/**
 * The weekly tournament.
 *
 * Each week's course is a PGA Tour event. Where the host course is mapped hole
 * by hole in `venues.ts`, the week is played over its real closing seven, with
 * that course's real pars — so the shape of the week changes from one event to
 * the next. Events without a mapped venue fall back to a generated layout but
 * keep the real course's name.
 *
 * ---------------------------------------------------------------------------
 * ON THE CALENDAR: every `isoWeek` below is the week that event is actually
 * played in 2026, taken from the published schedule rather than from the shape
 * a season usually has. A few things about 2026 in particular:
 *
 *   - There is no Sentry. The 2026 edition was cancelled when drought left
 *     Kapalua's Plantation Course unplayable, so the season opens in week 3
 *     with the Sony Open and weeks 1 and 2 are dark.
 *   - The FedExCup Fall dropped the Procore, the Sanderson Farms and the
 *     Shriners, and added Asheville, Austin and a Mexico swing.
 *   - The schedule holds one event per week, so where two run at once the
 *     bigger one takes the week: the Myrtle Beach Classic yields to the
 *     Truist, the ISCO and Corales to the majors beside them.
 *
 * The Tour has off weeks, and so does this: a week with no event listed is the
 * Diet Golf Invitational, played over a course of its own.
 * ---------------------------------------------------------------------------
 */

export type Tournament = {
  name: string;
  course: string;
  location: string;
  /** Pin this event to a week of the year (1–53). Optional. */
  isoWeek?: number;
  /**
   * Key into VENUES. When set, the week is played over that course's real
   * holes. Without one the week falls back to a generated layout.
   */
  venue?: string;
  /** Override which seven holes the week uses. Defaults to the closing 12–18. */
  holes?: number[];
  /** Marks the four majors, which get a flash of gold in the UI. */
  major?: boolean;
};

export const TOURNAMENTS: Tournament[] = [
  { name: "Sony Open in Hawaii", course: "Waialae Country Club", location: "Honolulu, Hawaii", venue: "waialae", isoWeek: 3 },
  { name: "The American Express", course: "PGA West, Stadium Course", location: "La Quinta, California", venue: "pga-west-stadium", isoWeek: 4 },
  { name: "Farmers Insurance Open", course: "Torrey Pines, South Course", location: "San Diego, California", venue: "torrey-pines-south", isoWeek: 5 },
  { name: "WM Phoenix Open", course: "TPC Scottsdale, Stadium Course", location: "Scottsdale, Arizona", venue: "tpc-scottsdale", isoWeek: 6 },
  { name: "AT&T Pebble Beach Pro-Am", course: "Pebble Beach Golf Links", location: "Pebble Beach, California", venue: "pebble-beach", isoWeek: 7 },
  { name: "The Genesis Invitational", course: "Riviera Country Club", location: "Pacific Palisades, California", venue: "riviera", isoWeek: 8 },
  { name: "Cognizant Classic", course: "PGA National, Champion Course", location: "Palm Beach Gardens, Florida", venue: "pga-national-champion", isoWeek: 9 },
  { name: "Arnold Palmer Invitational", course: "Bay Hill Club & Lodge", location: "Orlando, Florida", venue: "bay-hill", isoWeek: 10 },
  { name: "The Players Championship", course: "TPC Sawgrass, Stadium Course", location: "Ponte Vedra Beach, Florida", venue: "tpc-sawgrass", isoWeek: 11 },
  { name: "Valspar Championship", course: "Innisbrook, Copperhead Course", location: "Palm Harbor, Florida", venue: "innisbrook-copperhead", isoWeek: 12 },
  { name: "Texas Children's Houston Open", course: "Memorial Park Golf Course", location: "Houston, Texas", venue: "memorial-park", isoWeek: 13 },
  { name: "Valero Texas Open", course: "TPC San Antonio, Oaks Course", location: "San Antonio, Texas", venue: "tpc-san-antonio-oaks", isoWeek: 14 },
  { name: "The Masters", course: "Augusta National Golf Club", location: "Augusta, Georgia", venue: "augusta-national", major: true, isoWeek: 15 },
  { name: "RBC Heritage", course: "Harbour Town Golf Links", location: "Hilton Head, South Carolina", venue: "harbour-town", isoWeek: 16 },
  { name: "Zurich Classic of New Orleans", course: "TPC Louisiana", location: "Avondale, Louisiana", venue: "tpc-louisiana", isoWeek: 17 },
  { name: "Cadillac Championship", course: "Trump National Doral, Blue Monster", location: "Miami, Florida", isoWeek: 18 },
  { name: "Truist Championship", course: "Quail Hollow Club", location: "Charlotte, North Carolina", venue: "quail-hollow", isoWeek: 19 },
  { name: "PGA Championship", course: "Aronimink Golf Club", location: "Newtown Square, Pennsylvania", venue: "aronimink", major: true, isoWeek: 20 },
  { name: "CJ Cup Byron Nelson", course: "TPC Craig Ranch", location: "McKinney, Texas", isoWeek: 21 },
  { name: "Charles Schwab Challenge", course: "Colonial Country Club", location: "Fort Worth, Texas", venue: "colonial", isoWeek: 22 },
  { name: "The Memorial Tournament", course: "Muirfield Village Golf Club", location: "Dublin, Ohio", venue: "muirfield-village", isoWeek: 23 },
  { name: "RBC Canadian Open", course: "A rotating host", location: "Canada", isoWeek: 24 },
  { name: "U.S. Open", course: "Shinnecock Hills Golf Club", location: "Southampton, New York", venue: "shinnecock-hills", major: true, isoWeek: 25 },
  { name: "Travelers Championship", course: "TPC River Highlands", location: "Cromwell, Connecticut", venue: "tpc-river-highlands", isoWeek: 26 },
  { name: "John Deere Classic", course: "TPC Deere Run", location: "Silvis, Illinois", venue: "tpc-deere-run", isoWeek: 27 },
  { name: "Genesis Scottish Open", course: "The Renaissance Club", location: "North Berwick, Scotland", isoWeek: 28 },
  { name: "The Open Championship", course: "Royal Birkdale", location: "Southport, England", venue: "royal-birkdale", major: true, isoWeek: 29 },
  { name: "3M Open", course: "TPC Twin Cities", location: "Blaine, Minnesota", venue: "tpc-twin-cities", isoWeek: 30 },
  { name: "Rocket Classic", course: "Detroit Golf Club", location: "Detroit, Michigan", venue: "detroit-golf-club", isoWeek: 31 },
  { name: "Wyndham Championship", course: "Sedgefield Country Club", location: "Greensboro, North Carolina", venue: "sedgefield", isoWeek: 32 },
  { name: "FedEx St. Jude Championship", course: "TPC Southwind", location: "Memphis, Tennessee", venue: "tpc-southwind", isoWeek: 33 },
  { name: "BMW Championship", course: "A rotating host", location: "United States", isoWeek: 34 },
  { name: "Tour Championship", course: "East Lake Golf Club", location: "Atlanta, Georgia", venue: "east-lake", isoWeek: 35 },
  { name: "Biltmore Championship Asheville", course: "The Cliffs at Walnut Cove", location: "Arden, North Carolina", venue: "walnut-cove", isoWeek: 38 },
  { name: "Bank of Utah Championship", course: "Black Desert Resort", location: "Ivins, Utah", venue: "black-desert", isoWeek: 40 },
  { name: "Baycurrent Classic", course: "Yokohama Country Club, West Course", location: "Kanagawa, Japan", venue: "yokohama-west", isoWeek: 41 },
  { name: "Butterfield Bermuda Championship", course: "Port Royal Golf Course", location: "Southampton, Bermuda", venue: "port-royal", isoWeek: 43 },
  { name: "VidantaWorld Mexico Open", course: "Vidanta Vallarta", location: "Nuevo Vallarta, Mexico", venue: "vidanta-vallarta", isoWeek: 44 },
  { name: "World Wide Technology Championship", course: "El Cardonal at Diamante", location: "Los Cabos, Mexico", venue: "el-cardonal", isoWeek: 45 },
  { name: "Good Good Championship", course: "Omni Barton Creek, Fazio Foothills", location: "Austin, Texas", venue: "barton-creek-foothills", isoWeek: 46 },
  { name: "The RSM Classic", course: "Sea Island, Seaside Course", location: "St Simons Island, Georgia", venue: "sea-island-seaside", isoWeek: 47 },
  { name: "Hero World Challenge", course: "Albany Golf Course", location: "New Providence, Bahamas", venue: "albany", isoWeek: 49 },
  // The off week. Every week the Tour is not playing falls to this.
  { name: "The Diet Golf Invitational", course: "A course of its own", location: "Wherever you are" },
];

/** Week number from an ISO week key, e.g. "2026-W38" → 38. */
function weekNumber(weekKey: string): number {
  const match = /^\d{4}-W(\d{2})$/.exec(weekKey);
  if (!match) throw new Error(`Invalid week key: ${weekKey}`);
  return Number(match[1]);
}

/** Each event claims the week it falls on. */
function buildSchedule(): Map<number, Tournament> {
  const schedule = new Map<number, Tournament>();
  for (const tournament of TOURNAMENTS) {
    if (!tournament.isoWeek) continue;
    if (schedule.has(tournament.isoWeek)) {
      throw new Error(
        `Two events claim week ${tournament.isoWeek}: ${schedule.get(tournament.isoWeek)!.name} and ${tournament.name}`,
      );
    }
    schedule.set(tournament.isoWeek, tournament);
  }
  return schedule;
}

const SCHEDULE = buildSchedule();

/** The week the Tour is not playing. */
export const OFF_WEEK = TOURNAMENTS.find((tournament) => !tournament.isoWeek)!;

export function tournamentForWeek(weekKey: string): Tournament {
  return SCHEDULE.get(weekNumber(weekKey)) ?? OFF_WEEK;
}

/** True when the Tour is not playing that week. */
export function isOffWeek(weekKey: string): boolean {
  return !SCHEDULE.has(weekNumber(weekKey));
}
