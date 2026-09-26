import { mockCalendar } from "./mock-calendar";
import type { CalendarAdapter } from "./calendar";

/** The one place that decides which provider is live. Swapping in Google or
 * Microsoft (Phase 8) is a change here plus credentials in Settings, not a
 * change to the tools or pages that ask for busy time. */
export const calendar: CalendarAdapter = mockCalendar;

export type { CalendarAdapter, CalendarStatus } from "./calendar";
