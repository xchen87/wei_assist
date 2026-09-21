import { describe, expect, it } from "vitest";
import { buildBaseline, type HouseholdBaseline } from "./baseline";
import { describeChanges } from "./describe";
import { fixtureHousehold } from "./fixtures";

const baseline = buildBaseline(fixtureHousehold());

const withPrimary = (patch: Partial<HouseholdBaseline["members"][number]>): HouseholdBaseline => ({
  ...baseline,
  members: baseline.members.map((m, i) => (i === 0 ? { ...m, ...patch } : m)),
});

describe("describeChanges", () => {
  it("says nothing about a plan that has not been changed", () => {
    expect(describeChanges(baseline, baseline)).toEqual([]);
  });

  it("names the person, by first name, for a per-member change", () => {
    expect(describeChanges(baseline, withPrimary({ retirementAge: 65 }))).toEqual([
      "Ada Fixture".split(" ")[0] + " retires at 65",
    ]);
  });

  it("describes every per-member lever", () => {
    const changed = withPrimary({
      retirementAge: 65,
      ssClaimAge: 70,
      ssMonthlyBenefitCents: 300_000,
      annualSavingsCents: 6_000_000,
      savingsGrowthPct: 3,
      partTimeIncomeCents: 4_000_000,
      partTimeThroughAge: 70,
      pensionMonthlyCents: 200_000,
      pensionStartAge: 65,
      pensionHasCola: true,
    });
    const said = describeChanges(baseline, changed).join(" · ");
    expect(said).toContain("Ada retires at 65");
    expect(said).toContain("Ada claims at 70");
    expect(said).toContain("Ada SS $3K/mo");
    expect(said).toContain("Ada saves $60K/yr");
    expect(said).toContain("Ada steps up 3%/yr");
    expect(said).toContain("Ada part-time $40K/yr to 70");
    expect(said).toContain("Ada pension $2K/mo at 65 with COLA");
  });

  it("describes every household lever", () => {
    const said = describeChanges(baseline, {
      ...baseline,
      annualRetirementSpendingCents: 43_000_000,
      spendingShiftPct: -15,
      spendingShiftAge: 80,
      survivorSpendingPct: 70,
      healthcareAnnualCents: 8_000_000,
      healthcareFromAge: 85,
      realReturnPct: 6,
      volatilityPct: 14,
      inflationPct: 3,
      effectiveTaxRatePct: 18,
      oneTimeInflowCents: 100_000_000,
      oneTimeInflowYear: 5,
      oneTimeInflowLabel: "Sale of the practice",
      legacyTargetCents: 200_000_000,
      endAge: 100,
      members: baseline.members.map((m) => ({ ...m, planToAge: 100 })),
    }).join(" · ");
    expect(said).toContain("spends $430K/yr");
    expect(said).toContain("spending −15% at 80");
    expect(said).toContain("survivor spends 70%");
    expect(said).toContain("care $80K/yr from 85");
    expect(said).toContain("6% real return");
    expect(said).toContain("14% volatility");
    expect(said).toContain("3% inflation");
    expect(said).toContain("18% effective tax");
    expect(said).toContain("Sale of the practice $1.00M in 5 yr");
    expect(said).toContain("leaves $2.00M");
    expect(said).toContain("plan to 100");
  });

  /** Moving the household horizon already reads as "plan to 100"; saying
   * it again per person would be noise, so a member is only called out
   * when their plan-to age differs from the household's. */
  it("does not repeat the household horizon once per member", () => {
    const moved = {
      ...baseline,
      endAge: 100,
      members: baseline.members.map((m) => ({ ...m, planToAge: 100 })),
    };
    expect(describeChanges(baseline, moved)).toEqual(["plan to 100"]);
  });

  it("calls out a member who plans to a different age from the household", () => {
    const said = describeChanges(baseline, withPrimary({ planToAge: 88 }));
    expect(said).toEqual(["Ada plans to 88"]);
  });

  it("stays silent about a lever that is set but switched off", () => {
    // Part-time pay with a through-age at the retirement age earns nothing;
    // a spending shift with no age applies nowhere; an unnamed inflow of
    // zero arrives never.
    expect(
      describeChanges(
        baseline,
        withPrimary({ partTimeIncomeCents: 5_000_000, partTimeThroughAge: baseline.members[0]!.retirementAge }),
      ),
    ).toEqual([]);
    expect(describeChanges(baseline, { ...baseline, spendingShiftPct: -20 })).toEqual([]);
    expect(describeChanges(baseline, { ...baseline, oneTimeInflowYear: 5 })).toEqual([]);
  });

  it("falls back to a generic name for an unlabelled inflow", () => {
    const said = describeChanges(baseline, {
      ...baseline,
      oneTimeInflowCents: 50_000_000,
      oneTimeInflowYear: 3,
    });
    expect(said).toEqual(["one-time inflow $500K in 3 yr"]);
  });
});
