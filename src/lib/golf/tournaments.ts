/**
 * The weekly tournament.
 *
 * Each week's course is a PGA Tour event. Where the host course is mapped hole
 * by hole in `venues.ts`, the week is played over its real closing seven, with
 * that course's real pars — so the shape of the week changes from one event to
 * the next. Events without a mapped venue fall back to a generated layout.
 *
 * ---------------------------------------------------------------------------
 * ON THE CALENDAR: these are real events and their host courses, listed in
 * roughly the order the season runs. The mapping of event to calendar week is
 * NOT the official schedule — the Tour publishes that each autumn and it moves
 * year to year. Events fill the weeks in order, so the season reads correctly
 * even though a given week may not match the real date.
 *
 * To pin one to a real week, give it an `isoWeek`. Everything without one fills
 * the remaining weeks in order.
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
  { name: "The Sentry", course: "Kapalua, Plantation Course", location: "Maui, Hawaii", venue: "kapalua-plantation" },
  { name: "Sony Open in Hawaii", course: "Waialae Country Club", location: "Honolulu, Hawaii" },
  { name: "The American Express", course: "PGA West", location: "La Quinta, California" },
  { name: "Farmers Insurance Open", course: "Torrey Pines, South Course", location: "San Diego, California", venue: "torrey-pines-south" },
  { name: "AT&T Pebble Beach Pro-Am", course: "Pebble Beach Golf Links", location: "Pebble Beach, California", venue: "pebble-beach" },
  { name: "WM Phoenix Open", course: "TPC Scottsdale, Stadium Course", location: "Scottsdale, Arizona", venue: "tpc-scottsdale" },
  { name: "The Genesis Invitational", course: "Riviera Country Club", location: "Pacific Palisades, California", venue: "riviera" },
  { name: "Cognizant Classic", course: "PGA National", location: "Palm Beach Gardens, Florida" },
  { name: "Arnold Palmer Invitational", course: "Bay Hill Club & Lodge", location: "Orlando, Florida", venue: "bay-hill" },
  { name: "The Players Championship", course: "TPC Sawgrass, Stadium Course", location: "Ponte Vedra Beach, Florida", venue: "tpc-sawgrass" },
  { name: "Valspar Championship", course: "Innisbrook, Copperhead Course", location: "Palm Harbor, Florida" },
  { name: "Texas Children's Houston Open", course: "Memorial Park Golf Course", location: "Houston, Texas" },
  { name: "Valero Texas Open", course: "TPC San Antonio", location: "San Antonio, Texas" },
  { name: "The Masters", course: "Augusta National Golf Club", location: "Augusta, Georgia", venue: "augusta-national", major: true },
  { name: "RBC Heritage", course: "Harbour Town Golf Links", location: "Hilton Head, South Carolina", venue: "harbour-town" },
  { name: "Zurich Classic of New Orleans", course: "TPC Louisiana", location: "Avondale, Louisiana" },
  { name: "Truist Championship", course: "Quail Hollow Club", location: "Charlotte, North Carolina", venue: "quail-hollow" },
  { name: "PGA Championship", course: "Aronimink Golf Club", location: "Newtown Square, Pennsylvania", venue: "aronimink", major: true },
  { name: "Charles Schwab Challenge", course: "Colonial Country Club", location: "Fort Worth, Texas", venue: "colonial" },
  { name: "The Memorial Tournament", course: "Muirfield Village Golf Club", location: "Dublin, Ohio", venue: "muirfield-village" },
  { name: "RBC Canadian Open", course: "A rotating host", location: "Canada" },
  { name: "U.S. Open", course: "Shinnecock Hills Golf Club", location: "Southampton, New York", venue: "shinnecock-hills", major: true },
  { name: "Travelers Championship", course: "TPC River Highlands", location: "Cromwell, Connecticut", venue: "tpc-river-highlands" },
  { name: "Rocket Classic", course: "Detroit Golf Club", location: "Detroit, Michigan" },
  { name: "John Deere Classic", course: "TPC Deere Run", location: "Silvis, Illinois" },
  { name: "Genesis Scottish Open", course: "The Renaissance Club", location: "North Berwick, Scotland" },
  { name: "The Open Championship", course: "Royal Birkdale", location: "Southport, England", venue: "royal-birkdale", major: true },
  { name: "3M Open", course: "TPC Twin Cities", location: "Blaine, Minnesota" },
  { name: "Wyndham Championship", course: "Sedgefield Country Club", location: "Greensboro, North Carolina" },
  { name: "FedEx St. Jude Championship", course: "TPC Southwind", location: "Memphis, Tennessee" },
  { name: "BMW Championship", course: "A rotating host", location: "United States" },
  { name: "Tour Championship", course: "East Lake Golf Club", location: "Atlanta, Georgia", venue: "east-lake" },
  { name: "Procore Championship", course: "Silverado Resort", location: "Napa, California" },
  { name: "Sanderson Farms Championship", course: "Country Club of Jackson", location: "Jackson, Mississippi" },
  { name: "Shriners Children's Open", course: "TPC Summerlin", location: "Las Vegas, Nevada" },
  { name: "World Wide Technology Championship", course: "El Cardonal at Diamante", location: "Los Cabos, Mexico" },
  { name: "Butterfield Bermuda Championship", course: "Port Royal Golf Course", location: "Southampton, Bermuda" },
  { name: "The RSM Classic", course: "Sea Island Golf Club", location: "St Simons Island, Georgia" },
  { name: "Hero World Challenge", course: "Albany Golf Course", location: "New Providence, Bahamas" },
  { name: "The Diet Golf Invitational", course: "Your own patch", location: "Wherever you are" },
];

/** Week number from an ISO week key, e.g. "2026-W38" → 38. */
function weekNumber(weekKey: string): number {
  const match = /^\d{4}-W(\d{2})$/.exec(weekKey);
  if (!match) throw new Error(`Invalid week key: ${weekKey}`);
  return Number(match[1]);
}

/**
 * Builds the week-to-event table: pinned events claim their week first, then
 * the rest fill the gaps in season order, cycling if the year is longer than
 * the list.
 */
function buildSchedule(): Map<number, Tournament> {
  const schedule = new Map<number, Tournament>();
  const unpinned: Tournament[] = [];

  for (const tournament of TOURNAMENTS) {
    if (tournament.isoWeek && !schedule.has(tournament.isoWeek)) {
      schedule.set(tournament.isoWeek, tournament);
    } else {
      unpinned.push(tournament);
    }
  }

  let next = 0;
  for (let week = 1; week <= 53; week++) {
    if (schedule.has(week)) continue;
    if (unpinned.length === 0) break;
    schedule.set(week, unpinned[next % unpinned.length]);
    next += 1;
  }

  return schedule;
}

const SCHEDULE = buildSchedule();

export function tournamentForWeek(weekKey: string): Tournament {
  return SCHEDULE.get(weekNumber(weekKey)) ?? TOURNAMENTS[TOURNAMENTS.length - 1];
}
