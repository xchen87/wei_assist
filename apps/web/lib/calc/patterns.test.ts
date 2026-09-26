import { describe, expect, it } from "vitest";
import { alertAdjustment, inferPatterns, orderSlots, type AlertRuleValue } from "./patterns";

const at = (s: string) => new Date(s);
const meeting = (s: string, status = "held") => ({ startsAt: at(s), status });

describe("inferPatterns — booking", () => {
  it("needs five meetings, then reports days with a real share and the top start hours", () => {
    const few = inferPatterns({ meetings: [meeting("2026-09-22T10:00:00Z")], households: [], alerts: [] });
    expect(few.find((p) => p.key === "booking.weekdays")).toBeUndefined();

    const meetings = [
      meeting("2026-09-22T10:00:00Z"), // Tue
      meeting("2026-09-22T14:00:00Z"), // Tue
      meeting("2026-09-24T10:00:00Z"), // Thu
      meeting("2026-09-29T10:00:00Z"), // Tue
      meeting("2026-10-01T14:00:00Z"), // Thu
      meeting("2026-10-06T11:00:00Z", "confirmed"), // Tue
      meeting("2026-09-25T09:30:00Z", "cancelled"), // Fri, ignored
    ];
    const out = inferPatterns({ meetings, households: [], alerts: [] });
    expect(out.find((p) => p.key === "booking.weekdays")).toMatchObject({ value: { days: [2, 4] }, sampleSize: 6 });
    expect(out.find((p) => p.key === "booking.hours")).toMatchObject({ value: { startHours: [10, 14] } });
  });
});

describe("inferPatterns — cadence and alert rules", () => {
  it("measures on-time share per segment and classifies rule tendencies", () => {
    const out = inferPatterns({
      meetings: [],
      households: [
        { segment: "Premier", reviewStatus: "scheduled" },
        { segment: "Premier", reviewStatus: "scheduled" },
        { segment: "Premier", reviewStatus: "overdue" },
        { segment: "Core", reviewStatus: "due" },
      ],
      alerts: [
        { ruleKey: "cash", title: "Cash", status: "dismissed", hasTask: false },
        { ruleKey: "cash", title: "Cash", status: "dismissed", hasTask: false },
        { ruleKey: "cash", title: "Cash", status: "dismissed", hasTask: false },
        { ruleKey: "cash", title: "Cash", status: "open", hasTask: false },
        { ruleKey: "drift", title: "Drift", status: "acknowledged", hasTask: false },
        { ruleKey: "drift", title: "Drift", status: "open", hasTask: true },
        { ruleKey: "drift", title: "Drift", status: "open", hasTask: true },
        { ruleKey: "rmd", title: "RMD", status: "open", hasTask: false },
        { ruleKey: "mixed", title: "Mixed", status: "dismissed", hasTask: false },
        { ruleKey: "mixed", title: "Mixed", status: "dismissed", hasTask: false },
        { ruleKey: "mixed", title: "Mixed", status: "acknowledged", hasTask: false },
        { ruleKey: "mixed", title: "Mixed", status: "acknowledged", hasTask: false },
      ],
    });
    expect(out.find((p) => p.key === "cadence.Premier")).toMatchObject({ value: { onTimePct: 67, households: 3 } });
    expect(out.find((p) => p.key === "cadence.Core")).toMatchObject({ value: { onTimePct: 0 } });
    expect(out.find((p) => p.key === "alert-rule.cash")).toMatchObject({ value: { tendency: "dismisses", dismissed: 3, open: 1 } });
    expect(out.find((p) => p.key === "alert-rule.drift")).toMatchObject({ value: { tendency: "acts", actedOn: 3 } });
    expect(out.find((p) => p.key === "alert-rule.rmd")).toMatchObject({ value: { tendency: "none" }, evidence: "1 raised, none acted on or dismissed yet" });
    expect(out.find((p) => p.key === "alert-rule.mixed")).toMatchObject({ value: { tendency: "mixed" } });
  });
});

describe("orderSlots", () => {
  it("puts preferred day and hour first, then preferred day, keeping order inside each group and dropping nothing", () => {
    const slots = [
      { startsAt: at("2026-09-28T09:00:00Z") }, // Mon
      { startsAt: at("2026-09-29T09:00:00Z") }, // Tue, off-hour
      { startsAt: at("2026-09-29T10:00:00Z") }, // Tue, preferred hour
      { startsAt: at("2026-09-30T14:00:00Z") }, // Wed
      { startsAt: at("2026-10-01T10:00:00Z") }, // Thu, preferred hour
    ];
    const ordered = orderSlots(slots, { days: [2, 4], startHours: [10] });
    expect(ordered.map((s) => s.startsAt.toISOString().slice(5, 13))).toEqual(["09-29T10", "10-01T10", "09-29T09", "09-28T09", "09-30T14"]);
    expect(ordered).toHaveLength(slots.length);
  });
});

describe("alertAdjustment", () => {
  const dismisses: AlertRuleValue = { kind: "alert-rule", ruleKey: "cash", title: "Cash", actedOn: 0, dismissed: 4, open: 1, tendency: "dismisses", muted: false };
  it("nudges a dismissed rule down and says why, mutes further, and never touches a high-severity line", () => {
    expect(alertAdjustment(dismisses, "medium")).toMatchObject({ delta: -15 });
    expect(alertAdjustment({ ...dismisses, muted: true }, "low")).toMatchObject({ delta: -25 });
    expect(alertAdjustment(dismisses, "high")).toBeNull();
    expect(alertAdjustment({ ...dismisses, muted: true }, "high")).toBeNull();
    expect(alertAdjustment({ ...dismisses, tendency: "acts" }, "medium")).toBeNull();
    expect(alertAdjustment(undefined, "low")).toBeNull();
  });
});
