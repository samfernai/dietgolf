/**
 * The weekly tournament.
 *
 * Each week's course is a PGA Tour event. Where the host course is mapped hole
 * by hole in `venues.ts`, the week is played over its real closing seven, with
 * that course's real pars — so the shape of the week changes from one event to
 * the next. Events without a mapped venue fall back to a generated layout.
 *
 * ---------------------------------------------------------------------------
 * ON THE CALENDAR: these are real events on the weeks they usually fall. The
 * two majors whose 2026 dates are confirmed sit exactly (PGA Championship 14-17
 * May, U.S. Open 18-21 June); the rest follow the season's usual shape and may
 * be a week out when the Tour publishes the official schedule. Correct one by
 * changing its `isoWeek`.
 *
 * The Tour has off weeks, and so does this: a week with no event listed is the
 * Diet Golf Invitational, played over a course of its own. The schedule holds
 * one event per week, which is why the Genesis Scottish Open is absent — it
 * shares its week with the John Deere Classic.
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
  { name: "The Sentry", course: "Kapalua, Plantation Course", location: "Maui, Hawaii", venue: "kapalua-plantation", isoWeek: 2 },
  { name: "Sony Open in Hawaii", course: "Waialae Country Club", location: "Honolulu, Hawaii", isoWeek: 3 },
  { name: "The American Express", course: "PGA West", location: "La Quinta, California", isoWeek: 4 },
  { name: "Farmers Insurance Open", course: "Torrey Pines, South Course", location: "San Diego, California", venue: "torrey-pines-south", isoWeek: 5 },
  { name: "AT&T Pebble Beach Pro-Am", course: "Pebble Beach Golf Links", location: "Pebble Beach, California", venue: "pebble-beach", isoWeek: 6 },
  { name: "WM Phoenix Open", course: "TPC Scottsdale, Stadium Course", location: "Scottsdale, Arizona", venue: "tpc-scottsdale", isoWeek: 7 },
  { name: "The Genesis Invitational", course: "Riviera Country Club", location: "Pacific Palisades, California", venue: "riviera", isoWeek: 8 },
  { name: "Cognizant Classic", course: "PGA National", location: "Palm Beach Gardens, Florida", isoWeek: 9 },
  { name: "Arnold Palmer Invitational", course: "Bay Hill Club & Lodge", location: "Orlando, Florida", venue: "bay-hill", isoWeek: 10 },
  { name: "The Players Championship", course: "TPC Sawgrass, Stadium Course", location: "Ponte Vedra Beach, Florida", venue: "tpc-sawgrass", isoWeek: 11 },
  { name: "Valspar Championship", course: "Innisbrook, Copperhead Course", location: "Palm Harbor, Florida", isoWeek: 12 },
  { name: "Texas Children's Houston Open", course: "Memorial Park Golf Course", location: "Houston, Texas", isoWeek: 13 },
  { name: "Valero Texas Open", course: "TPC San Antonio", location: "San Antonio, Texas", isoWeek: 14 },
  { name: "The Masters", course: "Augusta National Golf Club", location: "Augusta, Georgia", venue: "augusta-national", major: true, isoWeek: 15 },
  { name: "RBC Heritage", course: "Harbour Town Golf Links", location: "Hilton Head, South Carolina", venue: "harbour-town", isoWeek: 16 },
  { name: "Zurich Classic of New Orleans", course: "TPC Louisiana", location: "Avondale, Louisiana", isoWeek: 17 },
  { name: "Truist Championship", course: "Quail Hollow Club", location: "Charlotte, North Carolina", venue: "quail-hollow", isoWeek: 18 },
  { name: "PGA Championship", course: "Aronimink Golf Club", location: "Newtown Square, Pennsylvania", venue: "aronimink", major: true, isoWeek: 20 },
  { name: "Charles Schwab Challenge", course: "Colonial Country Club", location: "Fort Worth, Texas", venue: "colonial", isoWeek: 21 },
  { name: "The Memorial Tournament", course: "Muirfield Village Golf Club", location: "Dublin, Ohio", venue: "muirfield-village", isoWeek: 22 },
  { name: "RBC Canadian Open", course: "A rotating host", location: "Canada", isoWeek: 23 },
  { name: "U.S. Open", course: "Shinnecock Hills Golf Club", location: "Southampton, New York", venue: "shinnecock-hills", major: true, isoWeek: 25 },
  { name: "Travelers Championship", course: "TPC River Highlands", location: "Cromwell, Connecticut", venue: "tpc-river-highlands", isoWeek: 26 },
  { name: "Rocket Classic", course: "Detroit Golf Club", location: "Detroit, Michigan", isoWeek: 27 },
  { name: "John Deere Classic", course: "TPC Deere Run", location: "Silvis, Illinois", isoWeek: 28 },
  { name: "The Open Championship", course: "Royal Birkdale", location: "Southport, England", venue: "royal-birkdale", major: true, isoWeek: 29 },
  { name: "3M Open", course: "TPC Twin Cities", location: "Blaine, Minnesota", isoWeek: 30 },
  { name: "Wyndham Championship", course: "Sedgefield Country Club", location: "Greensboro, North Carolina", isoWeek: 31 },
  { name: "FedEx St. Jude Championship", course: "TPC Southwind", location: "Memphis, Tennessee", isoWeek: 32 },
  { name: "BMW Championship", course: "A rotating host", location: "United States", isoWeek: 33 },
  { name: "Tour Championship", course: "East Lake Golf Club", location: "Atlanta, Georgia", venue: "east-lake", isoWeek: 34 },
  { name: "Procore Championship", course: "Silverado Resort", location: "Napa, California", isoWeek: 37 },
  { name: "Sanderson Farms Championship", course: "Country Club of Jackson", location: "Jackson, Mississippi", isoWeek: 40 },
  { name: "Shriners Children's Open", course: "TPC Summerlin", location: "Las Vegas, Nevada", isoWeek: 42 },
  { name: "World Wide Technology Championship", course: "El Cardonal at Diamante", location: "Los Cabos, Mexico", isoWeek: 44 },
  { name: "Butterfield Bermuda Championship", course: "Port Royal Golf Course", location: "Southampton, Bermuda", isoWeek: 45 },
  { name: "The RSM Classic", course: "Sea Island Golf Club", location: "St Simons Island, Georgia", isoWeek: 47 },
  { name: "Hero World Challenge", course: "Albany Golf Course", location: "New Providence, Bahamas", isoWeek: 49 },
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
