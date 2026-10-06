/**
 * Date helpers. Everything the game cares about is a calendar day, so dates are
 * handled as plain `YYYY-MM-DD` strings to keep them free of timezone and DST
 * drift. The one place a timezone matters is deciding what "today" is, which is
 * resolved against APP_TIMEZONE.
 */

export const APP_TIMEZONE = process.env.APP_TIMEZONE || "Europe/London";

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

/** The current calendar date in the app's timezone, as `YYYY-MM-DD`. */
export function today(now: Date = new Date(), timeZone: string = APP_TIMEZONE): string {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(now);
}

/**
 * Minutes since local midnight, which is what decides whether a checkpoint has
 * come around yet. h23 so midnight is 0 rather than 24.
 */
export function minutesNow(now: Date = new Date(), timeZone: string = APP_TIMEZONE): number {
  const parts = new Intl.DateTimeFormat("en-GB", {
    timeZone,
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
  }).formatToParts(now);
  const value = (type: string) => Number(parts.find((part) => part.type === type)?.value ?? 0);
  return value("hour") * 60 + value("minute");
}

function parse(date: string): Date {
  if (!DATE_RE.test(date)) throw new Error(`Invalid date: ${date}`);
  const d = new Date(`${date}T00:00:00.000Z`);
  if (Number.isNaN(d.getTime())) throw new Error(`Invalid date: ${date}`);
  return d;
}

export function isValidDate(date: string): boolean {
  return DATE_RE.test(date) && !Number.isNaN(new Date(`${date}T00:00:00.000Z`).getTime());
}

function format(d: Date): string {
  return d.toISOString().slice(0, 10);
}

export function addDays(date: string, days: number): string {
  const d = parse(date);
  d.setUTCDate(d.getUTCDate() + days);
  return format(d);
}

/** 0 = Monday … 6 = Sunday, matching the Diet Golf hole order. */
export function dayIndex(date: string): number {
  return (parse(date).getUTCDay() + 6) % 7;
}

/** The Monday that starts the week containing `date`. */
export function mondayOf(date: string): string {
  return addDays(date, -dayIndex(date));
}

export function daysBetween(from: string, to: string): number {
  return Math.round((parse(to).getTime() - parse(from).getTime()) / 86_400_000);
}

/**
 * ISO-8601 week key, e.g. `2026-W38`. Weeks run Monday to Sunday and the week
 * key is what ties a player's round to a course.
 */
export function weekKey(date: string): string {
  // ISO weeks are numbered by the Thursday they contain.
  const thursday = parse(date);
  thursday.setUTCDate(thursday.getUTCDate() + 3 - ((thursday.getUTCDay() + 6) % 7));
  const isoYear = thursday.getUTCFullYear();
  const week =
    Math.floor((thursday.getTime() - firstMonday(isoYear).getTime()) / (7 * 86_400_000)) + 1;
  return `${isoYear}-W${String(week).padStart(2, "0")}`;
}

/** Monday of ISO week 1 — the week that contains 4 January. */
function firstMonday(isoYear: number): Date {
  const jan4 = new Date(Date.UTC(isoYear, 0, 4));
  jan4.setUTCDate(jan4.getUTCDate() - ((jan4.getUTCDay() + 6) % 7));
  return jan4;
}

/** The Monday that starts the week identified by `key` (`YYYY-Www`). */
export function weekStart(key: string): string {
  const match = /^(\d{4})-W(\d{2})$/.exec(key);
  if (!match) throw new Error(`Invalid week key: ${key}`);
  const [, year, week] = match;
  const monday = firstMonday(Number(year));
  monday.setUTCDate(monday.getUTCDate() + (Number(week) - 1) * 7);
  return format(monday);
}

export function isValidWeekKey(key: string): boolean {
  if (!/^\d{4}-W\d{2}$/.test(key)) return false;
  try {
    return weekKey(weekStart(key)) === key;
  } catch {
    return false;
  }
}

export function shiftWeek(key: string, weeks: number): string {
  return weekKey(addDays(weekStart(key), weeks * 7));
}

const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
const WEEKDAYS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

/**
 * Dates are formatted by hand rather than through Intl. These strings are
 * rendered on the server and again in the browser during hydration, and the two
 * runtimes ship different ICU data — Node says "Sept" where Chrome says "Sep".
 */
export function prettyDate(date: string): string {
  const d = parse(date);
  return `${WEEKDAYS[dayIndex(date)]}, ${d.getUTCDate()} ${MONTHS[d.getUTCMonth()]}`;
}

/** e.g. "14 – 20 Sep 2026", dropping whatever the two ends have in common. */
export function prettyWeekRange(key: string): string {
  const start = parse(weekStart(key));
  const end = parse(addDays(weekStart(key), 6));

  const sameMonth = start.getUTCMonth() === end.getUTCMonth();
  const sameYear = start.getUTCFullYear() === end.getUTCFullYear();

  const left = sameMonth && sameYear
    ? `${start.getUTCDate()}`
    : `${start.getUTCDate()} ${MONTHS[start.getUTCMonth()]}${sameYear ? "" : ` ${start.getUTCFullYear()}`}`;

  return `${left} – ${end.getUTCDate()} ${MONTHS[end.getUTCMonth()]} ${end.getUTCFullYear()}`;
}
