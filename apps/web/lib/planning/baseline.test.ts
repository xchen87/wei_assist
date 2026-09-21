import { describe, expect, it } from "vitest";
import { applyScenario, buildBaseline, seedFor, type ScenarioRecord } from "./baseline";
import { FIXTURE_MEMBERS, fixtureHousehold } from "./fixtures";

const baseline = buildBaseline(fixtureHousehold());
const primary = baseline.members[0]!;
const spouse = baseline.members[1]!;

/** Null everywhere means "inherit"; each test overrides just the field
 * it is about. */
const scenario = (over: Partial<ScenarioRecord> = {}): ScenarioRecord => ({
  retirementSpendingCents: null,
  realReturnPct: null,
  volatilityPct: null,
  inflationPct: null,
  spendingShiftPct: null,
  spendingShiftAge: null,
  survivorSpendingPct: null,
  healthcareAnnualCents: null,
  healthcareFromAge: null,
  effectiveTaxRatePct: null,
  oneTimeInflowCents: null,
  oneTimeInflowYear: null,
  oneTimeInflowLabel: null,
  legacyTargetCents: null,
  endAge: null,
  goals: [],
  members: [],
  ...over,
});

const memberDelta = (memberId: string, over: Partial<ScenarioRecord["members"][number]> = {}) => ({
  memberId,
  retirementAge: null,
  planToAge: null,
  ssClaimAge: null,
  ssMonthlyBenefitCents: null,
  annualSavingsCents: null,
  savingsGrowthPct: null,
  partTimeIncomeCents: null,
  partTimeThroughAge: null,
  pensionMonthlyCents: null,
  pensionStartAge: null,
  pensionHasCola: null,
  ...over,
});

describe("buildBaseline", () => {
  it("excludes dependents — they do not retire or claim", () => {
    expect(baseline.members.map((m) => m.role)).toEqual(["Primary", "Spouse"]);
  });

  it("orders members primary first, then spouse", () => {
    expect(primary.name).toBe("Ada Fixture");
    expect(spouse.name).toBe("Bo Fixture");
  });

  /** The bug this exists to stop coming back: members were ordered by age
   * and then handed the household's `...Primary` / `...Spouse` columns by
   * position. In this fixture — as in the Whitakers, where it was found —
   * the primary is the *younger* of the two, so sorting by age gave the
   * spouse the primary's retirement age and vice versa. */
  it("assigns retirement and claim ages by role, never by position or age", () => {
    expect(primary.currentAge).toBeLessThan(spouse.currentAge);
    expect(primary.retirementAge).toBe(62);
    expect(primary.ssClaimAge).toBe(66);
    expect(spouse.retirementAge).toBe(66);
    expect(spouse.ssClaimAge).toBe(64);
  });

  it("falls back to the primary's ages when the household has no spouse figures", () => {
    const solo = buildBaseline(
      fixtureHousehold({ retirementAgeSpouse: null, ssClaimAgeSpouse: null }),
    );
    expect(solo.members[1]!.retirementAge).toBe(solo.members[0]!.retirementAge);
    expect(solo.members[1]!.ssClaimAge).toBe(solo.members[0]!.ssClaimAge);
  });

  it("splits household savings across working members, and says so on the page", () => {
    expect(primary.annualSavingsCents).toBe(2_100_000);
    expect(spouse.annualSavingsCents).toBe(2_100_000);
  });

  it("converts bigint cents to number at this boundary", () => {
    expect(typeof baseline.portfolioCents).toBe("number");
    expect(baseline.portfolioCents).toBe(790_000_000);
    expect(baseline.annualRetirementSpendingCents).toBe(3_000_000 * 12);
  });

  it("carries a goal with no cost through as uncosted rather than zero", () => {
    const boat = baseline.goals.find((g) => g.name === "Someday boat")!;
    expect(boat.targetCents).toBeNull();
    expect(boat.yearsAway).toBeNull();
  });

  it("turns an intake horizon band into years", () => {
    expect(baseline.goals.find((g) => g.name === "Tuition")!.yearsAway).toBe(5);
  });

  it("gives a household with no adult members an empty planner list", () => {
    const childrenOnly = buildBaseline(
      fixtureHousehold({
        members: [{ id: "x", name: "Cy Fixture", role: "Dependent", age: 19 }],
      }),
    );
    expect(childrenOnly.members).toEqual([]);
    expect(childrenOnly.portfolioCents).toBe(790_000_000);
  });
});

describe("applyScenario", () => {
  it("returns the baseline untouched when there is no scenario", () => {
    expect(applyScenario(baseline, null)).toBe(baseline);
  });

  it("inherits every field a scenario leaves null", () => {
    expect(applyScenario(baseline, scenario())).toEqual(baseline);
  });

  it("overlays only the household fields the scenario sets", () => {
    const applied = applyScenario(baseline, scenario({ effectiveTaxRatePct: 18 }));
    expect(applied.effectiveTaxRatePct).toBe(18);
    expect(applied.realReturnPct).toBe(baseline.realReturnPct);
    expect(applied.annualRetirementSpendingCents).toBe(baseline.annualRetirementSpendingCents);
  });

  it("overlays a member's levers without touching the other member", () => {
    const applied = applyScenario(
      baseline,
      scenario({ members: [memberDelta(FIXTURE_MEMBERS.primary, { retirementAge: 65 })] }),
    );
    expect(applied.members[0]!.retirementAge).toBe(65);
    expect(applied.members[1]!).toEqual(spouse);
  });

  it("converts a scenario's bigint cents at the boundary too", () => {
    const applied = applyScenario(
      baseline,
      scenario({
        retirementSpendingCents: 42_000_000n,
        members: [memberDelta(FIXTURE_MEMBERS.primary, { pensionMonthlyCents: 200_000n })],
      }),
    );
    expect(applied.annualRetirementSpendingCents).toBe(42_000_000);
    expect(applied.members[0]!.pensionMonthlyCents).toBe(200_000);
  });

  /** A scenario that moves the household horizon has to move it for every
   * member who hasn't been given one of their own, or "plan to 100" would
   * change the header and nothing in the projection. */
  it("passes a new household plan-to age down to members without their own", () => {
    const applied = applyScenario(baseline, scenario({ endAge: 100 }));
    expect(applied.endAge).toBe(100);
    expect(applied.members.map((m) => m.planToAge)).toEqual([100, 100]);
  });

  it("lets a member's own plan-to age override the household's", () => {
    const applied = applyScenario(
      baseline,
      scenario({
        endAge: 100,
        members: [memberDelta(FIXTURE_MEMBERS.primary, { planToAge: 90 })],
      }),
    );
    expect(applied.members[0]!.planToAge).toBe(90);
    expect(applied.members[1]!.planToAge).toBe(100);
  });

  it("ignores a delta for a member who is no longer in the household", () => {
    const applied = applyScenario(
      baseline,
      scenario({ members: [memberDelta("someone-who-left", { retirementAge: 50 })] }),
    );
    expect(applied.members).toEqual(baseline.members);
  });

  it("does not mutate the baseline it is given", () => {
    const snapshot = JSON.stringify(baseline);
    applyScenario(baseline, scenario({ endAge: 100, realReturnPct: 9 }));
    expect(JSON.stringify(baseline)).toBe(snapshot);
  });
});

describe("seedFor", () => {
  it("is stable for a household, so two scenarios differ by their levers", () => {
    expect(seedFor("household-abc")).toBe(seedFor("household-abc"));
  });

  it("differs between households", () => {
    expect(seedFor("household-abc")).not.toBe(seedFor("household-xyz"));
  });

  it("is a non-negative integer, whatever the id", () => {
    for (const id of ["", "a", "cmuat79f7001q79bomi5yn5lx", "z".repeat(200)]) {
      const seed = seedFor(id);
      expect(Number.isInteger(seed)).toBe(true);
      expect(seed).toBeGreaterThanOrEqual(0);
    }
  });
});
