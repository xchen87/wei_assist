import type { Interval } from "@/lib/calc/slots";

/** The calendar adapter interface — the first of the Phase 8 adapter
 * interfaces, built here because M-assist item 4 is its first consumer
 * (D-036). A provider answers two questions: when is this advisor busy,
 * and is the connection healthy. Free-slot search is not the adapter's
 * job; lib/calc/slots.ts does that over whatever busy blocks come back,
 * so Google and Microsoft will not each need their own.
 *
 * Lives in apps/web/lib/integrations until a second consumer or a real
 * provider justifies the packages/integrations workspace CLAUDE.md §3
 * plans for it. */
export type CalendarAdapter = {
  id: string;
  label: string;
  /** "mock" reads Meridian's own meeting rows; real providers name themselves. */
  provider: "mock" | "google" | "microsoft";
  /** Busy blocks for the advisor between `from` and `to`, whatever their source. */
  busy(advisorId: string, from: Date, to: Date): Promise<Interval[]>;
  status(): Promise<CalendarStatus>;
  /** Working hours the slot search assumes for this provider, as UTC
   * fractional hours (D-034's fixture convention) and getUTCDay() values. */
  workingHours: { startHour: number; endHour: number; weekdays: number[] };
};

export type CalendarStatus = {
  connected: boolean;
  lastSyncAt: Date | null;
  detail: string;
};
