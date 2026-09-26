/** Pure helpers for the calendar and worklist (M-assist item 2). No I/O,
 * no React — the Today widgets, the Schedule page and the Tasks inbox all
 * describe a due date or a meeting the same way because they all call
 * these, and the boundaries (what counts as "today") are tested once.
 *
 * Day arithmetic is on UTC calendar days, matching lib/format/date.ts:
 * every date in the app is pinned to UTC so a server west of UTC does not
 * shift "due today" to "due tomorrow" at 5pm. */

export const DAY_MS = 24 * 60 * 60 * 1000;

export function utcDayStart(d: Date): Date {
  return new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()));
}

/** Whole calendar days from `now` to `date`, negative when in the past. */
export function calendarDaysBetween(now: Date, date: Date): number {
  return Math.round((utcDayStart(date).getTime() - utcDayStart(now).getTime()) / DAY_MS);
}

export type DueTone = "loss" | "brass" | "neutral";

/** How a task's due date should read. Null is a state of its own, not
 * "sometime": a task with no deadline is never overdue. */
export function describeDue(
  dueAt: Date | null,
  now: Date,
  formatDate: (d: Date) => string,
): { text: string; tone: DueTone; overdue: boolean; days: number | null } {
  if (dueAt === null) return { text: "No due date", tone: "neutral", overdue: false, days: null };
  const days = calendarDaysBetween(now, dueAt);
  if (days < 0) return { text: `${-days}d overdue`, tone: "loss", overdue: true, days };
  if (days === 0) return { text: "Due today", tone: "brass", overdue: false, days };
  if (days === 1) return { text: "Due tomorrow", tone: "brass", overdue: false, days };
  return { text: `Due ${formatDate(dueAt)}`, tone: "neutral", overdue: false, days };
}

/** Overdue first (most overdue at the top), then by due date, then tasks
 * with no due date, then high priority before the rest within a tie. */
export function compareByDue(
  a: { dueAt: Date | null; priority: string },
  b: { dueAt: Date | null; priority: string },
): number {
  if (a.dueAt === null && b.dueAt === null) return priorityRank(a.priority) - priorityRank(b.priority);
  if (a.dueAt === null) return 1;
  if (b.dueAt === null) return -1;
  const byDate = a.dueAt.getTime() - b.dueAt.getTime();
  return byDate !== 0 ? byDate : priorityRank(a.priority) - priorityRank(b.priority);
}

function priorityRank(p: string): number {
  return p === "high" ? 0 : p === "normal" ? 1 : 2;
}

export type ReadinessTone = "gain" | "brass" | "loss";

/** The prep-readiness dot next to a household meeting (CLAUDE.md §5):
 * how complete the plan is going into the room. Same thresholds the
 * Schedule page has always used. */
export function readinessTone(planHealthPct: number): ReadinessTone {
  if (planHealthPct >= 80) return "gain";
  if (planHealthPct >= 60) return "brass";
  return "loss";
}

/** "Today", "Tomorrow", or a formatted date for grouping meetings by day. */
export function dayHeading(date: Date, now: Date, formatDate: (d: Date) => string): string {
  const days = calendarDaysBetween(now, date);
  if (days === 0) return "Today";
  if (days === 1) return "Tomorrow";
  return formatDate(date);
}
