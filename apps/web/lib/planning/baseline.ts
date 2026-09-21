import { centsToNumber } from "@/lib/format/money";
import { yearsFromHorizon, type ScenarioGoal, type ScenarioMember } from "@/lib/calc/planning";

/** Turning the plan of record into scenario inputs.
 *
 * The household stores retirement and claim ages as `...Primary` and
 * `...Spouse` columns, which is the shape the seeded data came in; this is
 * where that becomes a per-member list. Anything the record doesn't hold —
 * a Social Security estimate, a per-member savings split — is stated here
 * once rather than guessed in three places. */

export type HouseholdBaseline = {
  members: ScenarioMember[];
  portfolioCents: number;
  annualRetirementSpendingCents: number;
  goals: ScenarioGoal[];
  realReturnPct: number;
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

  const members: ScenarioMember[] = planners.map((m) => ({
    id: m.id,
    name: m.name,
    role: m.role,
    currentAge: m.age,
    retirementAge:
      m.role === "Spouse"
        ? household.retirementAgeSpouse ?? household.retirementAgePrimary
        : household.retirementAgePrimary,
    ssClaimAge:
      m.role === "Spouse"
        ? household.ssClaimAgeSpouse ?? household.ssClaimAgePrimary
        : household.ssClaimAgePrimary,
    // Not on file: a benefit depends on an earnings record this app does
    // not hold (§13). The advisor enters the SSA estimate as a lever.
    ssMonthlyBenefitCents: 0,
    annualSavingsCents: perMemberSavings,
  }));

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
    endAge: DEFAULT_END_AGE,
  };
}

/** A saved scenario stores only its deltas; this lays them over the
 * baseline. Null means "inherit", which is what keeps a saved scenario
 * meaningful after the underlying plan is updated. */
export function applyScenario(
  baseline: HouseholdBaseline,
  scenario: {
    retirementSpendingCents: bigint | number | null;
    realReturnPct: number | null;
    endAge: number | null;
    members: {
      memberId: string;
      retirementAge: number | null;
      ssClaimAge: number | null;
      ssMonthlyBenefitCents: bigint | number | null;
      annualSavingsCents: bigint | number | null;
    }[];
  } | null,
): HouseholdBaseline {
  if (!scenario) return baseline;

  const byMember = new Map(scenario.members.map((m) => [m.memberId, m]));

  return {
    ...baseline,
    portfolioCents: baseline.portfolioCents,
    annualRetirementSpendingCents:
      scenario.retirementSpendingCents === null
        ? baseline.annualRetirementSpendingCents
        : centsToNumber(scenario.retirementSpendingCents),
    realReturnPct: scenario.realReturnPct ?? baseline.realReturnPct,
    endAge: scenario.endAge ?? baseline.endAge,
    members: baseline.members.map((m) => {
      const adjustment = byMember.get(m.id);
      if (!adjustment) return m;
      return {
        ...m,
        retirementAge: adjustment.retirementAge ?? m.retirementAge,
        ssClaimAge: adjustment.ssClaimAge ?? m.ssClaimAge,
        ssMonthlyBenefitCents:
          adjustment.ssMonthlyBenefitCents === null
            ? m.ssMonthlyBenefitCents
            : centsToNumber(adjustment.ssMonthlyBenefitCents),
        annualSavingsCents:
          adjustment.annualSavingsCents === null
            ? m.annualSavingsCents
            : centsToNumber(adjustment.annualSavingsCents),
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
