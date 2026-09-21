import { describe, expect, it } from "vitest";
import { comparePlans } from "./compare";
import { buildBaseline, type HouseholdBaseline } from "./baseline";
import { FIXTURE_SEED, fixtureHousehold } from "./fixtures";

const baseline = buildBaseline(fixtureHousehold());
const compare = (scenario: HouseholdBaseline) => comparePlans(baseline, scenario, FIXTURE_SEED);

const laterRetirement: HouseholdBaseline = {
  ...baseline,
  members: baseline.members.map((m, i) => (i === 0 ? { ...m, retirementAge: m.retirementAge + 4 } : m)),
};

describe("comparePlans", () => {
  it("reports no change when the scenario is the plan of record", () => {
    const same = compare(baseline);
    expect(same.totalPts).toBe(0);
    expect(same.planPts).toBe(0);
    expect(same.marketPts).toBe(0);
    expect(same.changes).toEqual([]);
    expect(same.likeForLike).toBe(true);
  });

  it("attributes a plan change to the plan", () => {
    const result = compare(laterRetirement);
    expect(result.planPts).toBeGreaterThan(0);
    expect(result.marketPts).toBe(0);
    expect(result.totalPts).toBe(result.planPts);
    expect(result.changes.join(" ")).toContain("retires at");
  });

  /** The decomposition is the point of the whole module: a household whose
   * probability fell has a right to know whether the plan did it or the
   * assumption did. */
  it("splits a mixed scenario into plan and yardstick", () => {
    const mixed: HouseholdBaseline = { ...laterRetirement, realReturnPct: baseline.realReturnPct - 2 };
    const result = compare(mixed);

    expect(result.planPts).toBeGreaterThan(0);
    expect(result.marketPts).toBeLessThan(0);
    expect(result.planPts + result.marketPts).toBe(result.totalPts);
  });

  it("names the assumption that moved, and says the test is no longer like for like", () => {
    const result = compare({ ...baseline, realReturnPct: 7, volatilityPct: 15 });
    expect(result.likeForLike).toBe(false);
    expect(result.assumptionChanges.map((a) => a.label)).toEqual(["Real return", "Volatility"]);
    expect(result.assumptionChanges[0]).toMatchObject({ from: baseline.realReturnPct, to: 7 });
    // Nothing about the household changed, so the plan side is flat.
    expect(result.planPts).toBe(0);
  });

  it("is like for like whenever the market assumptions are untouched", () => {
    expect(compare(laterRetirement).likeForLike).toBe(true);
    expect(compare(laterRetirement).assumptionChanges).toEqual([]);
  });

  /** Changing only an assumption must not be attributed to the plan, which
   * is the failure mode this decomposition exists to prevent. */
  it("never charges a yardstick change to the plan", () => {
    for (const patch of [
      { realReturnPct: 2 },
      { volatilityPct: 20 },
      { inflationPct: 4 },
    ] as Partial<HouseholdBaseline>[]) {
      expect(compare({ ...baseline, ...patch }).planPts).toBe(0);
    }
  });

  it("reports the money deltas against the plan of record", () => {
    const result = compare(laterRetirement);
    expect(result.medianDeltaCents).toBe(result.full.medianEndingCents - result.record.medianEndingCents);
    expect(result.medianDeltaCents).toBeGreaterThan(0);
  });

  it("tracks whether each goal is at risk before and after", () => {
    const strained: HouseholdBaseline = {
      ...baseline,
      portfolioCents: 1_000_000,
      goals: baseline.goals.map((g) => (g.targetCents === null ? g : { ...g, targetCents: 90_000_00 })),
    };
    const result = compare(strained);
    const tuition = result.goals.find((g) => g.name === "Tuition")!;
    expect(tuition.atRiskBefore).toBe(false);
    expect(tuition.atRiskAfter).toBe(true);
  });

  it("carries a goal with no cost through without inventing one", () => {
    const boat = compare(baseline).goals.find((g) => g.name === "Someday boat")!;
    expect(boat.targetCents).toBeNull();
    expect(boat.yearsAway).toBeNull();
    expect(boat.atRiskAfter).toBe(false);
  });

  it("projects both sides under one set of market conditions", () => {
    // planOnly must ignore the scenario's own assumptions entirely.
    const result = compare({ ...baseline, realReturnPct: 9, volatilityPct: 3 });
    const recordAgain = comparePlans(baseline, baseline, FIXTURE_SEED).record;
    expect(result.planOnly).toEqual(recordAgain);
  });
});
