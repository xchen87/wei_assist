/** Free-slot search over a set of busy intervals. Pure: the calendar
 * adapter supplies the busy blocks (lib/integrations/calendar.ts) and this
 * decides where a meeting of a given length fits inside working hours.
 *
 * UTC throughout, matching the Meeting model's fixture convention (D-034):
 * the practice's local hours are treated as UTC hours until a real
 * calendar adapter writes true instants. */

import { DAY_MS, utcDayStart } from "@/lib/agenda";

export type Interval = { startsAt: Date; endsAt: Date };

export type SlotOptions = {
  durationMin: number;
  /** Earliest acceptable start. Slots before it are skipped. */
  from: Date;
  /** Search stops at the start of this day. */
  to: Date;
  /** Working hours as fractional UTC hours, e.g. 9 and 17. */
  workingHours: { startHour: number; endHour: number };
  /** getUTCDay() values, 1–5 for Monday to Friday. */
  weekdays: number[];
  /** Candidate starts are aligned to this grid, e.g. 30. */
  stepMin: number;
  limit: number;
};

export function overlaps(a: Interval, b: Interval): boolean {
  return a.startsAt.getTime() < b.endsAt.getTime() && b.startsAt.getTime() < a.endsAt.getTime();
}

/** The first busy block a candidate collides with, or null. */
export function conflictWith(candidate: Interval, busy: Interval[]): Interval | null {
  return busy.find((b) => overlaps(candidate, b)) ?? null;
}

export function findFreeSlots(busy: Interval[], opts: SlotOptions): Interval[] {
  const out: Interval[] = [];
  const durationMs = opts.durationMin * 60_000;
  const stepMs = opts.stepMin * 60_000;
  const dayStartMs = opts.workingHours.startHour * 3_600_000;
  const dayEndMs = opts.workingHours.endHour * 3_600_000;

  for (let day = utcDayStart(opts.from); day.getTime() < opts.to.getTime(); day = new Date(day.getTime() + DAY_MS)) {
    if (!opts.weekdays.includes(day.getUTCDay())) continue;
    for (let t = day.getTime() + dayStartMs; t + durationMs <= day.getTime() + dayEndMs; t += stepMs) {
      if (t < opts.from.getTime()) continue;
      const candidate = { startsAt: new Date(t), endsAt: new Date(t + durationMs) };
      if (conflictWith(candidate, busy)) continue;
      out.push(candidate);
      if (out.length >= opts.limit) return out;
    }
  }
  return out;
}
