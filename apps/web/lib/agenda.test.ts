import { describe, expect, it } from "vitest";
import { calendarDaysBetween, compareByDue, dayHeading, describeDue, utcDayStart } from "./agenda";

const fmt = (d: Date) => d.toISOString().slice(0, 10);
// 23:30 UTC on the 25th — late enough that a local-time implementation
// west of UTC would already call it the 26th.
const now = new Date("2026-09-25T23:30:00Z");

describe("calendarDaysBetween", () => {
  it("counts UTC calendar days, not 24-hour spans", () => {
    expect(calendarDaysBetween(now, new Date("2026-09-26T00:10:00Z"))).toBe(1);
    expect(calendarDaysBetween(now, new Date("2026-09-25T01:00:00Z"))).toBe(0);
    expect(calendarDaysBetween(now, new Date("2026-09-22T12:00:00Z"))).toBe(-3);
  });
  it("utcDayStart strips the time", () => {
    expect(utcDayStart(now).toISOString()).toBe("2026-09-25T00:00:00.000Z");
  });
});

describe("describeDue", () => {
  it("treats a missing due date as its own state, never overdue", () => {
    expect(describeDue(null, now, fmt)).toEqual({ text: "No due date", tone: "neutral", overdue: false, days: null });
  });
  it("is overdue only from the next calendar day", () => {
    expect(describeDue(new Date("2026-09-25T08:00:00Z"), now, fmt)).toMatchObject({ text: "Due today", tone: "brass", overdue: false });
    expect(describeDue(new Date("2026-09-24T23:59:00Z"), now, fmt)).toMatchObject({ text: "1d overdue", tone: "loss", overdue: true });
    expect(describeDue(new Date("2026-09-13T00:00:00Z"), now, fmt)).toMatchObject({ text: "12d overdue", tone: "loss" });
  });
  it("names tomorrow, then falls back to a date", () => {
    expect(describeDue(new Date("2026-09-26T09:00:00Z"), now, fmt)).toMatchObject({ text: "Due tomorrow", tone: "brass" });
    expect(describeDue(new Date("2026-10-14T09:00:00Z"), now, fmt)).toMatchObject({ text: "Due 2026-10-14", tone: "neutral" });
  });
});

describe("compareByDue", () => {
  it("orders overdue first, then by date, then undated, with priority breaking ties", () => {
    const rows = [
      { id: "undated-low", dueAt: null, priority: "low" },
      { id: "later", dueAt: new Date("2026-10-01T00:00:00Z"), priority: "normal" },
      { id: "undated-high", dueAt: null, priority: "high" },
      { id: "overdue", dueAt: new Date("2026-09-20T00:00:00Z"), priority: "low" },
      { id: "today-high", dueAt: new Date("2026-09-25T00:00:00Z"), priority: "high" },
      { id: "today-normal", dueAt: new Date("2026-09-25T00:00:00Z"), priority: "normal" },
    ];
    expect([...rows].sort(compareByDue).map((r) => r.id)).toEqual([
      "overdue",
      "today-high",
      "today-normal",
      "later",
      "undated-high",
      "undated-low",
    ]);
  });
});

describe("dayHeading", () => {
  it("says Today and Tomorrow, then dates", () => {
    expect(dayHeading(new Date("2026-09-25T10:00:00Z"), now, fmt)).toBe("Today");
    expect(dayHeading(new Date("2026-09-26T10:00:00Z"), now, fmt)).toBe("Tomorrow");
    expect(dayHeading(new Date("2026-09-28T10:00:00Z"), now, fmt)).toBe("2026-09-28");
  });
});
