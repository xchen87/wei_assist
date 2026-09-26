import { describe, expect, it } from "vitest";
import { buildBrief, countBySeverity, upcomingMilestones, type BriefInput } from "./brief";

const now = new Date("2026-09-25T15:00:00Z");
const fmt = (d: Date) => d.toISOString().slice(0, 10);
const daysFromNow = (n: number) => new Date(now.getTime() + n * 86_400_000);

function member(id: string, name: string, birthDate: string | null) {
  return { id, name, role: "Primary", birthDate: birthDate ? new Date(birthDate) : null };
}

const base: BriefInput = {
  now,
  households: [],
  alerts: [],
  prospects: [],
  openTasks: [],
  meetingsToday: [],
  driftThresholdPct: 4,
  sectionHref: (id, section) => (section ? `/clients/${id}/${section}` : `/clients/${id}`),
  formatDate: fmt,
};

const household = (over: Partial<BriefInput["households"][number]> = {}) => ({
  id: "h1",
  name: "Ramirez Household",
  segment: "Core",
  reviewStatus: "scheduled",
  nextReviewDate: daysFromNow(20),
  lastContactDays: 10,
  planHealthPct: 85,
  driftPct: 1,
  hasReviewBooked: true,
  members: [],
  ...over,
});

describe("buildBrief ranking", () => {
  it("orders the bands: meeting prep, high alert, overdue review, overdue task, stalled prospect, milestone", () => {
    const items = buildBrief({
      ...base,
      households: [
        household({ id: "h1", name: "A", reviewStatus: "overdue", nextReviewDate: daysFromNow(-40), hasReviewBooked: false }),
        household({ id: "h2", name: "B", members: [member("m1", "Bea", "1961-10-10")] }), // turns 65 in 15 days
        household({ id: "h3", name: "C", planHealthPct: 50 }),
      ],
      alerts: [{ id: "a1", ruleKey: "r", householdId: "h2", householdName: "B", severity: "high", title: "Cash drag", rationale: "9% cash", suggestedAction: "Review", section: "allocation" }],
      prospects: [{ id: "p1", name: "P", stage: "Proposal", daysInStage: 27, stalled: true, estValueLabel: "$1.6M", hasMeetingBooked: false }],
      openTasks: [{ id: "t1", title: "Send IPS", dueAt: daysFromNow(-16), priority: "normal", householdId: "h1", prospectId: null, subject: "A" }],
      meetingsToday: [{ id: "mt1", title: "C — review", startsAt: now, timeLabel: "3:00 PM", householdId: "h3", householdName: "C", planHealthPct: 50 }],
    });
    expect(items.map((i) => i.kind)).toEqual(["meeting-prep", "alert", "review-unbooked", "task-overdue", "prospect-stalled", "milestone"]);
    expect(items[2]).toMatchObject({ score: 60 + 40 / 3, severity: "high", title: "Review 40d overdue, nothing booked" });
    expect(items[3]).toMatchObject({ score: 66, href: "/tasks?due=overdue" });
    expect(items[4]).toMatchObject({ score: 45 + 13.5, severity: "medium" });
    expect(items[5]).toMatchObject({ title: "Bea turns 65 in 15 days", score: 25, href: "/clients/h2/household" });
  });

  it("bands overlap at the edges: a month-stalled prospect outranks a task a few days late", () => {
    const items = buildBrief({
      ...base,
      prospects: [{ id: "p1", name: "P", stage: "Proposal", daysInStage: 30, stalled: true, estValueLabel: "$1M", hasMeetingBooked: false }],
      openTasks: [{ id: "t1", title: "T", dueAt: daysFromNow(-2), priority: "normal", householdId: null, prospectId: null, subject: "Own" }],
    });
    expect(items.map((i) => [i.kind, i.score])).toEqual([
      ["prospect-stalled", 60],
      ["task-overdue", 52],
    ]);
  });

  it("a medium alert outranks any overdue review, and a 90-day overdue review caps below a high alert", () => {
    const items = buildBrief({
      ...base,
      households: [household({ reviewStatus: "overdue", nextReviewDate: daysFromNow(-200), hasReviewBooked: false })],
      alerts: [{ id: "a1", ruleKey: "r", householdId: "h1", householdName: "Ramirez Household", severity: "medium", title: "T", rationale: "R", suggestedAction: "S", section: null }],
    });
    expect(items.map((i) => [i.kind, i.score])).toEqual([
      ["alert", 70],
      ["review-unbooked", 90],
    ].sort((a, b) => (b[1] as number) - (a[1] as number)));
    expect(items[0]!.kind).toBe("review-unbooked"); // 90 > 70: half a year overdue does beat a medium signal
  });

  it("skips a due review that already has a meeting booked, and a meeting today the plan is ready for", () => {
    const items = buildBrief({
      ...base,
      households: [household({ reviewStatus: "due", hasReviewBooked: true })],
      meetingsToday: [{ id: "mt1", title: "ready", startsAt: now, timeLabel: "9:00 AM", householdId: "h1", householdName: "Ramirez Household", planHealthPct: 85 }],
    });
    expect(items).toEqual([]);
  });

  it("reports drift only where no signal already covers the household", () => {
    const items = buildBrief({
      ...base,
      households: [household({ id: "h1", name: "A", driftPct: 5 }), household({ id: "h2", name: "B", driftPct: 6 })],
      alerts: [{ id: "a1", ruleKey: "r", householdId: "h1", householdName: "A", severity: "low", title: "Drift widened", rationale: "R", suggestedAction: "S", section: "allocation" }],
    });
    expect(items.map((i) => `${i.kind}:${i.subject}`)).toEqual(["alert:A", "drift:B"]);
  });

  it("ignores tasks with no due date and tasks due today; a high-priority overdue task scores higher", () => {
    const items = buildBrief({
      ...base,
      openTasks: [
        { id: "t0", title: "undated", dueAt: null, priority: "high", householdId: null, prospectId: null, subject: "Own" },
        { id: "t1", title: "today", dueAt: daysFromNow(0), priority: "high", householdId: null, prospectId: null, subject: "Own" },
        { id: "t2", title: "normal", dueAt: daysFromNow(-3), priority: "normal", householdId: null, prospectId: null, subject: "Own" },
        { id: "t3", title: "high", dueAt: daysFromNow(-3), priority: "high", householdId: null, prospectId: null, subject: "Own" },
      ],
    });
    expect(items.map((i) => [i.title, i.score])).toEqual([
      ["high", 58],
      ["normal", 53],
    ]);
  });

  it("counts by severity", () => {
    expect(countBySeverity([{ severity: "high" }, { severity: "low" }, { severity: "low" }] as never)).toEqual({ high: 1, medium: 0, low: 2 });
  });
});

describe("upcomingMilestones", () => {
  it("finds the half-birthday trigger at 59.5", () => {
    // Born 1967-03-30: 59.5 falls on 2026-09-30, five days out.
    const ms = upcomingMilestones([member("m", "Sam", "1967-03-30")], now, 30, 7);
    expect(ms).toEqual([{ memberId: "m", memberName: "Sam", kind: "age-trigger", age: 59.5, date: new Date("2026-09-30T00:00:00Z"), inDays: 5 }]);
  });
  it("reports 73 once, as a trigger, not also as a birthday", () => {
    const ms = upcomingMilestones([member("m", "Ada", "1953-09-28")], now, 30, 7);
    expect(ms.map((m) => m.kind)).toEqual(["age-trigger"]);
    expect(ms[0]).toMatchObject({ age: 73, inDays: 3 });
  });
  it("reports a plain birthday inside the window and nothing outside it", () => {
    expect(upcomingMilestones([member("m", "Kai", "1980-09-27")], now, 30, 7)).toMatchObject([{ kind: "birthday", age: 46, inDays: 2 }]);
    expect(upcomingMilestones([member("m", "Kai", "1980-10-27")], now, 30, 7)).toEqual([]);
    expect(upcomingMilestones([member("m", "None", null)], now, 30, 7)).toEqual([]);
  });
  it("does not report a trigger that already passed", () => {
    expect(upcomingMilestones([member("m", "Old", "1961-09-01")], now, 30, 7)).toEqual([]); // turned 65 on Sep 1
  });
});

describe("buildBrief with advisor patterns", () => {
  it("orders a habitually dismissed medium alert a little lower, with the reason on the line, and leaves high alone", () => {
    const rule = { kind: "alert-rule" as const, ruleKey: "cash", title: "Cash", actedOn: 0, dismissed: 4, open: 1, tendency: "dismisses" as const, muted: false };
    const items = buildBrief({
      ...base,
      alerts: [
        { id: "a1", ruleKey: "cash", householdId: "h1", householdName: "A", severity: "medium", title: "Cash", rationale: "R", suggestedAction: "S", section: null },
        { id: "a2", ruleKey: "cash", householdId: "h2", householdName: "B", severity: "high", title: "Cash", rationale: "R", suggestedAction: "S", section: null },
      ],
      alertRules: { cash: rule },
    });
    expect(items.map((i) => [i.subject, i.score, i.adjustment !== undefined])).toEqual([
      ["B", 90, false],
      ["A", 55, true],
    ]);
    expect(items[1]!.adjustment).toContain("dismissed this rule 4 of 4 times");
  });
});
