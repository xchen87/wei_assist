// Every date in this app is a calendar date (a review date, a contact
// date), never a timezone-relative instant. Stored/parsed as UTC midnight,
// so formatting MUST pin timeZone: "UTC" — otherwise a server running
// west of UTC (this sandbox is America/Denver) silently renders one day
// early, e.g. "2026-10-03" -> "October 2, 2026". Caught by inspecting real
// rendered output, not by type-checking.
const SHORT: Intl.DateTimeFormatOptions = { month: "short", day: "numeric", timeZone: "UTC" };
const SHORT_YEAR: Intl.DateTimeFormatOptions = { month: "short", day: "numeric", year: "numeric", timeZone: "UTC" };
const LONG_YEAR: Intl.DateTimeFormatOptions = { month: "long", day: "numeric", year: "numeric", timeZone: "UTC" };
const MONTH_YEAR: Intl.DateTimeFormatOptions = { month: "long", year: "numeric", timeZone: "UTC" };

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

/** "September 2026" — for report cover pages ("Prepared for the ... review"). */
export function formatMonthYear(date: Date | string): string {
  const d = typeof date === "string" ? new Date(date) : date;
  return new Intl.DateTimeFormat("en-US", MONTH_YEAR).format(d);
}

export function daysUntil(date: Date | string, now: Date = new Date()): number {
  const d = typeof date === "string" ? new Date(date) : date;
  return Math.round((d.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
}

/** "4d" for recent, "61d" for overdue-style day counts already computed elsewhere. */
export function formatDaysAgo(days: number): string {
  return `${days}d`;
}

/** "8:02 AM" — for the few timestamps in the app (activity events) that are
 * a real moment, not a pure calendar date. Still UTC-pinned so it doesn't
 * shift with server timezone, same reasoning as SHORT/LONG_YEAR above. */
export function formatTime(date: Date | string): string {
  const d = typeof date === "string" ? new Date(date) : date;
  return new Intl.DateTimeFormat("en-US", { hour: "numeric", minute: "2-digit", timeZone: "UTC" }).format(d);
}

/** "turns 53 in 12 days" — the operational half of a birthday, with no year
 * in it. CLAUDE.md §11 masks dates of birth; §5's Milestones widget still
 * wants birthdays surfaced, and this is the part that serves that job
 * without rendering the PII. Same UTC pinning as everything else here: a
 * birthday is a calendar date, not an instant.
 *
 * Returns null when the birthday isn't near. The roster shows the full
 * date anyway, so "turns 68 on Dec 25" three months out is just the same
 * date twice — this line is a nudge, and it should only appear when there
 * is something to do about it.
 *
 * Feb 29 birthdays resolve to Mar 1 in non-leap years, which is the common
 * convention and good enough for a reminder. */
export function formatNextBirthday(birthDate: Date | string, now: Date = new Date()): string | null {
  const dob = typeof birthDate === "string" ? new Date(birthDate) : birthDate;
  const todayUtc = Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate());

  let next = Date.UTC(now.getUTCFullYear(), dob.getUTCMonth(), dob.getUTCDate());
  if (next < todayUtc) {
    next = Date.UTC(now.getUTCFullYear() + 1, dob.getUTCMonth(), dob.getUTCDate());
  }

  const days = Math.round((next - todayUtc) / (1000 * 60 * 60 * 24));
  const turning = new Date(next).getUTCFullYear() - dob.getUTCFullYear();

  if (days === 0) return `turns ${turning} today`;
  if (days === 1) return `turns ${turning} tomorrow`;
  if (days <= 60) return `turns ${turning} in ${days} days`;
  return null;
}
