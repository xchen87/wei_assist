// Every date in this app is a calendar date (a review date, a contact
// date), never a timezone-relative instant. Stored/parsed as UTC midnight,
// so formatting MUST pin timeZone: "UTC" — otherwise a server running
// west of UTC (this sandbox is America/Denver) silently renders one day
// early, e.g. "2026-10-03" -> "October 2, 2026". Caught by inspecting real
// rendered output, not by type-checking.
const SHORT: Intl.DateTimeFormatOptions = { month: "short", day: "numeric", timeZone: "UTC" };
const SHORT_YEAR: Intl.DateTimeFormatOptions = { month: "short", day: "numeric", year: "numeric", timeZone: "UTC" };
const LONG_YEAR: Intl.DateTimeFormatOptions = { month: "long", day: "numeric", year: "numeric", timeZone: "UTC" };

export function formatShortDate(date: Date | string): string {
  const d = typeof date === "string" ? new Date(date) : date;
  return new Intl.DateTimeFormat("en-US", SHORT).format(d);
}

export function formatDate(date: Date | string): string {
  const d = typeof date === "string" ? new Date(date) : date;
  return new Intl.DateTimeFormat("en-US", SHORT_YEAR).format(d);
}

export function formatLongDate(date: Date | string): string {
  const d = typeof date === "string" ? new Date(date) : date;
  return new Intl.DateTimeFormat("en-US", LONG_YEAR).format(d);
}

export function daysUntil(date: Date | string, now: Date = new Date()): number {
  const d = typeof date === "string" ? new Date(date) : date;
  return Math.round((d.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
}

/** "4d" for recent, "61d" for overdue-style day counts already computed elsewhere. */
export function formatDaysAgo(days: number): string {
  return `${days}d`;
}
