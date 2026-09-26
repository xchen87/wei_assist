import { describe, expect, it } from "vitest";
import { conflictWith, findFreeSlots, overlaps, type SlotOptions } from "./slots";

const at = (s: string) => new Date(s);
const base: SlotOptions = {
  durationMin: 60,
  from: at("2026-09-28T00:00:00Z"), // a Monday
  to: at("2026-10-03T00:00:00Z"),
  workingHours: { startHour: 9, endHour: 12 },
  weekdays: [1, 2, 3, 4, 5],
  stepMin: 30,
  limit: 100,
};
const iso = (i: { startsAt: Date; endsAt: Date }) => `${i.startsAt.toISOString().slice(0, 16)}–${i.endsAt.toISOString().slice(11, 16)}`;

describe("overlaps / conflictWith", () => {
  it("treats touching intervals as free", () => {
    const a = { startsAt: at("2026-09-28T09:00:00Z"), endsAt: at("2026-09-28T10:00:00Z") };
    const b = { startsAt: at("2026-09-28T10:00:00Z"), endsAt: at("2026-09-28T11:00:00Z") };
    expect(overlaps(a, b)).toBe(false);
    expect(conflictWith(a, [b])).toBeNull();
    expect(conflictWith({ startsAt: at("2026-09-28T09:30:00Z"), endsAt: at("2026-09-28T10:30:00Z") }, [b])).toBe(b);
  });
});

describe("findFreeSlots", () => {
  it("fills an empty day on the step grid inside working hours", () => {
    const slots = findFreeSlots([], { ...base, to: at("2026-09-29T00:00:00Z") });
    expect(slots.map(iso)).toEqual([
      "2026-09-28T09:00–10:00",
      "2026-09-28T09:30–10:30",
      "2026-09-28T10:00–11:00",
      "2026-09-28T10:30–11:30",
      "2026-09-28T11:00–12:00",
    ]);
  });
  it("steps around busy blocks", () => {
    const busy = [{ startsAt: at("2026-09-28T09:30:00Z"), endsAt: at("2026-09-28T10:30:00Z") }];
    const slots = findFreeSlots(busy, { ...base, to: at("2026-09-29T00:00:00Z") });
    expect(slots.map(iso)).toEqual(["2026-09-28T10:30–11:30", "2026-09-28T11:00–12:00"]);
  });
  it("skips weekends and starts no earlier than `from`", () => {
    const slots = findFreeSlots([], { ...base, from: at("2026-10-02T10:15:00Z"), to: at("2026-10-06T00:00:00Z"), limit: 3 });
    // Fri Oct 2 from 10:30, then Mon Oct 5.
    expect(slots.map(iso)).toEqual(["2026-10-02T10:30–11:30", "2026-10-02T11:00–12:00", "2026-10-05T09:00–10:00"]);
  });
  it("honours the limit and a duration longer than the window returns nothing", () => {
    expect(findFreeSlots([], { ...base, limit: 2 })).toHaveLength(2);
    expect(findFreeSlots([], { ...base, durationMin: 240 })).toEqual([]);
  });
});
