import { describe, expect, it } from "vitest";
import { projectScenario, yearsFromHorizon, type ScenarioMember } from "./planning";
import { buildBaseline, type HouseholdBaseline } from "@/lib/planning/baseline";
import { FIXTURE_SEED, fixtureHousehold } from "@/lib/planning/fixtures";

const baseline = buildBaseline(fixtureHousehold());
const run = (plan: HouseholdBaseline) => projectScenario({ ...plan, seed: FIXTURE_SEED });
const base = run(baseline);

/** Levers are graded on the median ending value rather than the rounded
 * probability: a lever worth a few thousand dollars a year is real
 * arithmetic that a 0–99 integer cannot show. A legacy target is the one
 * exception — it changes what counts as success without moving a dollar —
 * so the probability is the fallback. */
function direction(plan: HouseholdBaseline): "up" | "down" | "same" {
  const r = run(plan);
  const dm = r.medianEndingCents - base.medianEndingCents;
  if (dm !== 0) return dm > 0 ? "up" : "down";
  const dp = r.successProbabilityPct - base.successProbabilityPct;
  return dp > 0 ? "up" : dp < 0 ? "down" : "same";
}

const withPrimary = (patch: Partial<ScenarioMember>): HouseholdBaseline => ({
  ...baseline,
  members: baseline.members.map((m, i) => (i === 0 ? { ...m, ...patch } : m)),
});

const primary = baseline.members[0]!;

describe("projectScenario — the fixture plan of record", () => {
  it("projects a household with two planners and excludes the dependent", () => {
    expect(baseline.members.map((m) => m.name)).toEqual(["Ada Fixture", "Bo Fixture"]);
  });

  it("is deterministic for a given seed", () => {
    expect(run(baseline)).toEqual(run(baseline));
  });

  it("draws a different plan for a different seed", () => {
    const other = projectScenario({ ...baseline, seed: FIXTURE_SEED + 1 });
    expect(other.median).not.toEqual(base.median);
  });

  it("starts drawing when the first planner retires, not the last", () => {
    // Ada retires at 62 and is 58; Bo retires at 66 and is 60.
    expect(base.firstRetirementYear).toBe(4);
  });
});

/** The rule D-025 rests on: a lever nobody has touched must not move the
 * answer. If one of these fails, the application has started making a
 * financial assumption on the advisor's behalf (CLAUDE.md §13). */
describe("neutral defaults", () => {
  it("assumes no pension, no part-time work and no savings step-up", () => {
    for (const m of baseline.members) {
      expect(m.pensionMonthlyCents).toBe(0);
      expect(m.partTimeIncomeCents).toBe(0);
      expect(m.savingsGrowthPct).toBe(0);
      expect(m.ssMonthlyBenefitCents).toBe(0);
      // Parked on the retirement age, which is how "not set yet" is said.
      expect(m.pensionStartAge).toBe(m.retirementAge);
      expect(m.partTimeThroughAge).toBe(m.retirementAge);
    }
  });

  it("assumes no tax drag, no survivor reduction, no care cost, no legacy", () => {
    expect(baseline.effectiveTaxRatePct).toBe(0);
    expect(baseline.survivorSpendingPct).toBe(100);
    expect(baseline.healthcareAnnualCents).toBe(0);
    expect(baseline.healthcareFromAge).toBeNull();
    expect(baseline.legacyTargetCents).toBe(0);
    expect(baseline.oneTimeInflowCents).toBe(0);
    expect(baseline.inflationPct).toBe(0);
    expect(baseline.spendingShiftPct).toBe(0);
    expect(baseline.spendingShiftAge).toBeNull();
  });

  it("leaves the projection untouched when every neutral lever is restated", () => {
    expect(
      run({
        ...baseline,
        inflationPct: 0,
        spendingShiftPct: 0,
        spendingShiftAge: null,
        survivorSpendingPct: 100,
        healthcareAnnualCents: 0,
        healthcareFromAge: null,
        effectiveTaxRatePct: 0,
        oneTimeInflowCents: 0,
        legacyTargetCents: 0,
        members: baseline.members.map((m) => ({
          ...m,
          savingsGrowthPct: 0,
          partTimeIncomeCents: 0,
          pensionMonthlyCents: 0,
        })),
      }),
    ).toEqual(base);
  });

  it("ignores a care cost with no age, and an age with no cost", () => {
    expect(run({ ...baseline, healthcareAnnualCents: 9_000_000 })).toEqual(base);
    expect(run({ ...baseline, healthcareFromAge: 85 })).toEqual(base);
  });

  it("ignores a spending shift with no age, and an age with no shift", () => {
    expect(run({ ...baseline, spendingShiftPct: -20 })).toEqual(base);
    expect(run({ ...baseline, spendingShiftAge: 80 })).toEqual(base);
  });

  it("ignores an inflow with no amount", () => {
    expect(run({ ...baseline, oneTimeInflowYear: 5 })).toEqual(base);
  });
});

describe("per-member levers move the plan the way an advisor expects", () => {
  it("working longer helps and leaving earlier hurts", () => {
    expect(direction(withPrimary({ retirementAge: primary.retirementAge + 3 }))).toBe("up");
    expect(direction(withPrimary({ retirementAge: primary.retirementAge - 3 }))).toBe("down");
  });

  // Graded on probability, not the median: see the comparability test
  // below — a longer plan's ending value is measured at a later date.
  it("planning to a later age is harder to fund", () => {
    const longer = run(withPrimary({ planToAge: 105 }));
    expect(longer.successProbabilityPct).toBeLessThan(base.successProbabilityPct);
  });

  it("a Social Security estimate helps once it is on file", () => {
    expect(direction(withPrimary({ ssMonthlyBenefitCents: 300_000 }))).toBe("up");
  });

  it("a pension helps, and starting it earlier helps more", () => {
    const at65 = run(withPrimary({ pensionMonthlyCents: 200_000, pensionStartAge: 65 }));
    const at70 = run(withPrimary({ pensionMonthlyCents: 200_000, pensionStartAge: 70 }));
    expect(at65.medianEndingCents).toBeGreaterThan(base.medianEndingCents);
    expect(at65.medianEndingCents).toBeGreaterThan(at70.medianEndingCents);
  });

  it("phased retirement helps only while the member is actually working it", () => {
    expect(
      direction(withPrimary({ partTimeIncomeCents: 6_000_000, partTimeThroughAge: 70 })),
    ).toBe("up");
    // A through-age at or below the retirement age is how "no part-time
    // work" is expressed, and must do nothing.
    expect(
      run(withPrimary({ partTimeIncomeCents: 6_000_000, partTimeThroughAge: primary.retirementAge })),
    ).toEqual(base);
  });

  it("saving more, and stepping it up, both help", () => {
    expect(direction(withPrimary({ annualSavingsCents: primary.annualSavingsCents * 3 }))).toBe("up");
    expect(direction(withPrimary({ savingsGrowthPct: 5 }))).toBe("up");
  });
});

describe("household levers move the plan the way an advisor expects", () => {
  it("spending more hurts and trimming later-life spending helps", () => {
    expect(
      direction({
        ...baseline,
        annualRetirementSpendingCents: Math.round(baseline.annualRetirementSpendingCents * 1.25),
      }),
    ).toBe("down");
    expect(direction({ ...baseline, spendingShiftPct: -20, spendingShiftAge: 78 })).toBe("up");
  });

  it("a survivor who spends less than the couple did helps", () => {
    expect(direction({ ...baseline, survivorSpendingPct: 70 })).toBe("up");
  });

  it("long-term care hurts", () => {
    expect(direction({ ...baseline, healthcareAnnualCents: 8_000_000, healthcareFromAge: 85 })).toBe("down");
  });

  it("a higher real return helps; more volatility around it hurts", () => {
    expect(direction({ ...baseline, realReturnPct: baseline.realReturnPct + 2 })).toBe("up");
    expect(direction({ ...baseline, volatilityPct: baseline.volatilityPct + 7 })).toBe("down");
  });

  it("tax on withdrawals hurts, and is grossed up rather than netted off", () => {
    const taxed = run({ ...baseline, effectiveTaxRatePct: 22 });
    expect(taxed.medianEndingCents).toBeLessThan(base.medianEndingCents);
  });

  it("clamps a tax rate that would make a withdrawal infinite", () => {
    const absurd = run({ ...baseline, effectiveTaxRatePct: 100 });
    expect(Number.isFinite(absurd.medianEndingCents)).toBe(true);
    expect(absurd.successProbabilityPct).toBeGreaterThanOrEqual(0);
  });

  it("a one-time inflow helps, and sooner helps more", () => {
    const soon = run({ ...baseline, oneTimeInflowCents: 100_000_000, oneTimeInflowYear: 5 });
    const later = run({ ...baseline, oneTimeInflowCents: 100_000_000, oneTimeInflowYear: 25 });
    expect(soon.medianEndingCents).toBeGreaterThan(base.medianEndingCents);
    expect(soon.medianEndingCents).toBeGreaterThan(later.medianEndingCents);
  });

  it("a legacy target lowers the probability without moving a dollar", () => {
    const withLegacy = run({ ...baseline, legacyTargetCents: 500_000_000 });
    expect(withLegacy.medianEndingCents).toBe(base.medianEndingCents);
    expect(withLegacy.successProbabilityPct).toBeLessThan(base.successProbabilityPct);
  });
});

/** Inflation exists in this model for one purpose. If it starts doing
 * anything else, the "everything is in today's dollars" claim on the page
 * has quietly stopped being true. */
describe("inflation erodes level income and nothing else", () => {
  const pension = { pensionMonthlyCents: 200_000, pensionStartAge: 65 };

  it("does nothing to a household with no pension", () => {
    expect(run({ ...baseline, inflationPct: 3 })).toEqual(base);
  });

  it("erodes a pension without a COLA", () => {
    const level = run(withPrimary({ ...pension, pensionHasCola: false }));
    const eroded = run({ ...withPrimary({ ...pension, pensionHasCola: false }), inflationPct: 3 });
    expect(eroded.medianEndingCents).toBeLessThan(level.medianEndingCents);
  });

  it("leaves a pension with a COLA alone", () => {
    const level = run(withPrimary({ ...pension, pensionHasCola: false }));
    const cola = run({ ...withPrimary({ ...pension, pensionHasCola: true }), inflationPct: 3 });
    expect(cola.medianEndingCents).toBe(level.medianEndingCents);
  });
});

/** A trap worth keeping a test on. Extending the horizon lowers the
 * probability — more years to fund — while *raising* the median ending
 * value, because that value is measured at the end of a longer plan. The
 * two are not contradictory and the second is not a bug; it is the reason
 * an ending value can only be compared between scenarios that end on the
 * same date, which is why the UI labels the figure "median at plan end"
 * rather than implying a common yardstick. */
describe("ending values are only comparable within one horizon", () => {
  it("falls in probability and rises in median as the plan runs longer", () => {
    const longer = run(withPrimary({ planToAge: 105 }));
    expect(longer.successProbabilityPct).toBeLessThan(base.successProbabilityPct);
    expect(longer.medianEndingCents).toBeGreaterThan(base.medianEndingCents);
  });

  it("lowers the probability monotonically as the horizon extends", () => {
    const probabilities = [85, 95, 105].map(
      (planToAge) => run(withPrimary({ planToAge })).successProbabilityPct,
    );
    expect(probabilities[0]!).toBeGreaterThanOrEqual(probabilities[1]!);
    expect(probabilities[1]!).toBeGreaterThanOrEqual(probabilities[2]!);
  });
});

describe("edge cases", () => {
  it("returns an empty projection for a household with no planners", () => {
    const empty = run({ ...baseline, members: [] });
    expect(empty.firstRetirementYear).toBe(0);
    expect(empty.ssIncomeCents).toBe(0);
    expect(empty.years.length).toBeGreaterThan(0);
  });

  it("survives a zero portfolio without producing NaN", () => {
    const broke = run({ ...baseline, portfolioCents: 0 });
    expect(Number.isFinite(broke.medianEndingCents)).toBe(true);
    expect(broke.successProbabilityPct).toBe(0);
    expect(broke.medianDepletionYear).not.toBeNull();
  });

  it("survives negative net worth", () => {
    const underwater = run({ ...baseline, portfolioCents: -50_000_000 });
    expect(Number.isFinite(underwater.medianEndingCents)).toBe(true);
    expect(underwater.successProbabilityPct).toBe(0);
  });

  it("retires a member already past their retirement age in year zero", () => {
    const retired = run(withPrimary({ currentAge: 69, retirementAge: 62 }));
    expect(retired.firstRetirementYear).toBe(0);
  });

  it("reports no depletion age when no path runs out", () => {
    const comfortable = run({ ...baseline, portfolioCents: 10_000_000_000, annualRetirementSpendingCents: 1_000_000 });
    expect(comfortable.medianDepletionYear).toBeNull();
    expect(comfortable.successProbabilityPct).toBe(100);
  });

  it("funds only goals that have both a cost and a horizon", () => {
    // The fixture's "Someday boat" has neither, so it can never be at risk.
    expect(base.goalsAtRisk).not.toContain("Someday boat");
  });

  it("flags a goal the plan cannot fund", () => {
    const unfundable = run({
      ...baseline,
      portfolioCents: 1_000_000,
      goals: [{ id: "g", name: "Tuition", targetCents: 90_000_000, yearsAway: 3, priority: "High" }],
    });
    expect(unfundable.goalsAtRisk).toContain("Tuition");
  });
});

describe("yearsFromHorizon", () => {
  it("maps intake's bands to their midpoints", () => {
    expect(yearsFromHorizon("Under 3 years")).toBe(2);
    expect(yearsFromHorizon("3–7 years")).toBe(5);
    expect(yearsFromHorizon("7–15 years")).toBe(11);
    expect(yearsFromHorizon("15+ years")).toBe(18);
  });

  it("has no year for an ongoing goal, or one with no horizon on file", () => {
    expect(yearsFromHorizon("Ongoing")).toBeNull();
    expect(yearsFromHorizon(null)).toBeNull();
    expect(yearsFromHorizon("something else")).toBeNull();
  });
});
