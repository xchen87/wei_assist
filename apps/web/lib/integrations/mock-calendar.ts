import { prisma } from "@meridian/db";
import type { CalendarAdapter } from "./calendar";

/** The sandbox provider: busy means "a Meeting row exists". It knows
 * nothing an external calendar would add — personal appointments, other
 * firms' invites — and its status says so, so the Integrations page never
 * reads as connected to anything it is not. */
export const mockCalendar: CalendarAdapter = {
  id: "mock-calendar",
  label: "Meridian meeting records",
  provider: "mock",
  workingHours: { startHour: 9, endHour: 17, weekdays: [1, 2, 3, 4, 5] },

  async busy(advisorId, from, to) {
    const rows = await prisma.meeting.findMany({
      where: { advisorId, status: { in: ["confirmed", "proposed"] }, startsAt: { lt: to }, endsAt: { gt: from } },
      select: { startsAt: true, endsAt: true },
      orderBy: { startsAt: "asc" },
    });
    return rows;
  },

  async status() {
    const count = await prisma.meeting.count({ where: { status: { in: ["confirmed", "proposed"] } } });
    return {
      connected: false,
      lastSyncAt: null,
      detail: `Mock provider reading ${count} of the firm's own meeting rows. Nothing outside Meridian is visible to it.`,
    };
  },
};
