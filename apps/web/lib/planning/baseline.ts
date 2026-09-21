import { centsToNumber } from "@/lib/format/money";
import { yearsFromHorizon, type ScenarioGoal, type ScenarioMember } from "@/lib/calc/planning";

/** Turning the plan of record into scenario inputs.
 *
 * The household stores retirement and claim ages as `...Primary` and
 * `...Spouse` columns, which is the shape the seeded data came in; this is
 * where that becomes a per-member list. Anything the record doesn't hold —
 * a Social Security estimate, a pension, a per-member savings split — is
 * stated here once rather than guessed in three places.
 *
 * Every lever the record has nothing to say about starts at a value that
 * changes nothing: no pension, no part-time work, no tax drag, no survivor
 * reduction, no legacy target. A default that moved the projection would
 * be this file inventing a financial assumption on the advisor's behalf
 * (CLAUDE.md §13), and the advisor would have no way to tell. */

export type HouseholdBaseline = {
  members: ScenarioMember[];
  portfolioCents: number;
  annualRetirementSpendingCents: number;
  goals: ScenarioGoal[];
  realReturnPct: number;
  volatilityPct: number;
  inflationPct: number;
  spendingShiftPct: number;
  spendingShiftAge: number | null;
  survivorSpendingPct: number;
  healthcareAnnualCents: number;
  healthcareFromAge: number | null;
  effectiveTaxRatePct: number;
  oneTimeInflowCents: number;
  oneTimeInflowYear: number;
  oneTimeInflowLabel: string | null;
  legacyTargetCents: number;
  endAge: number;
};

/** Primary first, then spouse, then anyone else — the order the record
 * stores their figures in, and the order an advisor reads them. */
function roleRank(role: string): number {
  if (role === "Primary") return 0;
  if (role === "Spouse") return 1;
  return 2;
}

const DEFAULT_REAL_RETURN_PCT = 5;
const DEFAULT_END_AGE = 95;
/** Carried over from the projection's previous fixed value, so adding the
 * lever leaves every existing baseline exactly where it was. */
const DEFAULT_VOLATILITY_PCT = 11;

export function buildBaseline(household: {
  netWorthCents: bigint | number;
  savingsCents: bigint | number;
  monthlySpendingNeedCents: bigint | number;
  retirementAgePrimary: number;
  retirementAgeSpouse: number | null;
  ssClaimAgePrimary: number;
  ssClaimAgeSpouse: number | null;
  members: { id: string; name: string; role: string; age: number }[];
  goals: { id: string; name: string; targetCents: bigint | number | null; horizonLabel: string | null; priority: string }[];
}): HouseholdBaseline {
  // Role, not position: the household stores retirement and claim ages as
  // "...Primary" and "...Spouse" columns, and ordering members any other
  // way — by age, say — hands the primary's retirement age to the spouse.
  // The Whitakers caught this: Tom is the older of the two but Karen is
  // the primary, so sorting by age gave Tom her retirement age.
  const planners = household.members
    .filter((m) => m.role !== "Dependent")
    .sort((a, b) => roleRank(a.role) - roleRank(b.role));

  // Household savings is one figure on the record; until per-member savings
  // is captured (intake collects it, the seeded households predate that),
  // split it evenly across the people still working. Stated on the page so
  // nobody reads it as a measured number.
  const savings = centsToNumber(household.savingsCents);
  const perMemberSavings = planners.length > 0 ? Math.round(savings / planners.length) : 0;

  const members: ScenarioMember[] = planners.map((m) => {
    const retirementAge =
      m.role === "Spouse"
        ? household.retirementAgeSpouse ?? household.retirementAgePrimary
        : household.retirementAgePrimary;
    return {
      id: m.id,
      name: m.name,
      role: m.role,
      currentAge: m.age,
      retirementAge,
      planToAge: DEFAULT_END_AGE,
      ssClaimAge:
        m.role === "Spouse"
          ? household.ssClaimAgeSpouse ?? household.ssClaimAgePrimary
          : household.ssClaimAgePrimary,
      // Not on file: a benefit depends on an earnings record this app does
      // not hold (§13). The advisor enters the SSA estimate as a lever.
      ssMonthlyBenefitCents: 0,
      annualSavingsCents: perMemberSavings,
      savingsGrowthPct: 0,
      // No phased retirement and no pension until the advisor says so. The
      // through-age and start-age sit at the retirement age so that turning
      // either lever on needs one figure, not two.
      partTimeIncomeCents: 0,
      partTimeThroughAge: retirementAge,
      pensionMonthlyCents: 0,
      pensionStartAge: retirementAge,
      pensionHasCola: false,
    };
  });

  return {
    members,
    portfolioCents: centsToNumber(household.netWorthCents),
    annualRetirementSpendingCents: centsToNumber(household.monthlySpendingNeedCents) * 12,
    goals: household.goals.map((g) => ({
      id: g.id,
      name: g.name,
      targetCents: g.targetCents === null ? null : centsToNumber(g.targetCents),
      yearsAway: yearsFromHorizon(g.horizonLabel),
      priority: g.priority,
    })),
    realReturnPct: DEFAULT_REAL_RETURN_PCT,
    volatilityPct: DEFAULT_VOLATILITY_PCT,
    inflationPct: 0,
    spendingShiftPct: 0,
    spendingShiftAge: null,
    survivorSpendingPct: 100,
    healthcareAnnualCents: 0,
    healthcareFromAge: null,
    effectiveTaxRatePct: 0,
    oneTimeInflowCents: 0,
    oneTimeInflowYear: 0,
    oneTimeInflowLabel: null,
    legacyTargetCents: 0,
    endAge: DEFAULT_END_AGE,
  };
}

export type ScenarioRecord = {
  retirementSpendingCents: bigint | number | null;
  realReturnPct: number | null;
  volatilityPct: number | null;
  inflationPct: number | null;
  spendingShiftPct: number | null;
  spendingShiftAge: number | null;
  survivorSpendingPct: number | null;
  healthcareAnnualCents: bigint | number | null;
  healthcareFromAge: number | null;
  effectiveTaxRatePct: number | null;
  oneTimeInflowCents: bigint | number | null;
  oneTimeInflowYear: number | null;
  oneTimeInflowLabel: string | null;
  legacyTargetCents: bigint | number | null;
  endAge: number | null;
  goals: {
    goalId: string;
    targetCents: bigint | number | null;
    yearsAway: number | null;
    included: boolean | null;
  }[];
  members: {
    memberId: string;
    retirementAge: number | null;
    planToAge: number | null;
    ssClaimAge: number | null;
    ssMonthlyBenefitCents: bigint | number | null;
    annualSavingsCents: bigint | number | null;
    savingsGrowthPct: number | null;
    partTimeIncomeCents: bigint | number | null;
    partTimeThroughAge: number | null;
    pensionMonthlyCents: bigint | number | null;
    pensionStartAge: number | null;
    pensionHasCola: boolean | null;
  }[];
};

const cents = (v: bigint | number | null, fallback: number) =>
  v === null ? fallback : centsToNumber(v);

/** A saved scenario stores only its deltas; this lays them over the
 * baseline. Null means "inherit", which is what keeps a saved scenario
 * meaningful after the underlying plan is updated. */
export function applyScenario(
  baseline: HouseholdBaseline,
  scenario: ScenarioRecord | null,
): HouseholdBaseline {
  if (!scenario) return baseline;

  const byMember = new Map(scenario.members.map((m) => [m.memberId, m]));
  const byGoal = new Map((scenario.goals ?? []).map((g) => [g.goalId, g]));
  // A scenario that moves the household's plan-to age moves it for every
  // member who hasn't been given one of their own — otherwise "plan to
  // 100" would change the header and nothing in the projection.
  const endAge = scenario.endAge ?? baseline.endAge;

  return {
    ...baseline,
    annualRetirementSpendingCents: cents(
      scenario.retirementSpendingCents,
      baseline.annualRetirementSpendingCents,
    ),
    realReturnPct: scenario.realReturnPct ?? baseline.realReturnPct,
    volatilityPct: scenario.volatilityPct ?? baseline.volatilityPct,
    inflationPct: scenario.inflationPct ?? baseline.inflationPct,
    spendingShiftPct: scenario.spendingShiftPct ?? baseline.spendingShiftPct,
    spendingShiftAge: scenario.spendingShiftAge ?? baseline.spendingShiftAge,
    survivorSpendingPct: scenario.survivorSpendingPct ?? baseline.survivorSpendingPct,
    healthcareAnnualCents: cents(scenario.healthcareAnnualCents, baseline.healthcareAnnualCents),
    healthcareFromAge: scenario.healthcareFromAge ?? baseline.healthcareFromAge,
    effectiveTaxRatePct: scenario.effectiveTaxRatePct ?? baseline.effectiveTaxRatePct,
    oneTimeInflowCents: cents(scenario.oneTimeInflowCents, baseline.oneTimeInflowCents),
    oneTimeInflowYear: scenario.oneTimeInflowYear ?? baseline.oneTimeInflowYear,
    oneTimeInflowLabel: scenario.oneTimeInflowLabel ?? baseline.oneTimeInflowLabel,
    legacyTargetCents: cents(scenario.legacyTargetCents, baseline.legacyTargetCents),
    endAge,
    // A goal the scenario drops leaves the list entirely, which is how
    // the projection stops funding it. Testing a plan without a goal is a
    // real question, and deleting the goal to ask it is not an acceptable
    // way to find out.
    goals: baseline.goals
      .filter((g) => byGoal.get(g.id)?.included !== false)
      .map((g) => {
        const adjustment = byGoal.get(g.id);
        if (!adjustment) return g;
        return {
          ...g,
          targetCents:
            adjustment.targetCents === null ? g.targetCents : centsToNumber(adjustment.targetCents),
          yearsAway: adjustment.yearsAway ?? g.yearsAway,
        };
      }),
    members: baseline.members.map((m) => {
      const adjustment = byMember.get(m.id);
      const inherited = { ...m, planToAge: endAge };
      if (!adjustment) return inherited;
      return {
        ...inherited,
        retirementAge: adjustment.retirementAge ?? m.retirementAge,
        planToAge: adjustment.planToAge ?? endAge,
        ssClaimAge: adjustment.ssClaimAge ?? m.ssClaimAge,
        ssMonthlyBenefitCents: cents(adjustment.ssMonthlyBenefitCents, m.ssMonthlyBenefitCents),
        annualSavingsCents: cents(adjustment.annualSavingsCents, m.annualSavingsCents),
        savingsGrowthPct: adjustment.savingsGrowthPct ?? m.savingsGrowthPct,
        partTimeIncomeCents: cents(adjustment.partTimeIncomeCents, m.partTimeIncomeCents),
        partTimeThroughAge: adjustment.partTimeThroughAge ?? m.partTimeThroughAge,
        pensionMonthlyCents: cents(adjustment.pensionMonthlyCents, m.pensionMonthlyCents),
        pensionStartAge: adjustment.pensionStartAge ?? m.pensionStartAge,
        pensionHasCola: adjustment.pensionHasCola ?? m.pensionHasCola,
      };
    }),
  };
}

/** Deterministic per household, so the same plan always produces the same
 * fan — an advisor comparing two scenarios must be seeing the levers
 * change, not the random draw. */
export function seedFor(householdId: string): number {
  let hash = 0;
  for (let i = 0; i < householdId.length; i++) {
    hash = (hash << 5) - hash + householdId.charCodeAt(i);
    hash |= 0;
  }
  return hash >>> 0;
}
