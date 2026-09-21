import { projectScenario, type ScenarioResult } from "@/lib/calc/planning";
import type { HouseholdBaseline } from "./baseline";
import { describeChanges } from "./describe";

/**
 * Comparing a scenario with the plan of record, under one set of market
 * conditions.
 *
 * The whole difficulty is that a scenario can change two different kinds
 * of thing, and mixing them makes the answer useless. Retiring two years
 * later is a change to the *plan*. Assuming a 3% real return instead of
 * 5% is a change to the *yardstick* — it would move the number with the
 * plan untouched, and a household whose probability fell nine points has
 * a right to know which of those did it.
 *
 * So the comparison is decomposed. Both plans are first projected under
 * the plan of record's market assumptions, which is what "given the same
 * market conditions" has to mean; that difference is the plan's doing.
 * Then the scenario's own market assumptions are applied, and that second
 * difference is the yardstick's. They sum to the total, and the page
 * reports all three.
 *
 * Pure, no I/O (CLAUDE.md §3).
 */

/** The levers that describe the world rather than the household. */
const MARKET_ASSUMPTION_KEYS = ["realReturnPct", "volatilityPct", "inflationPct"] as const;

export type AssumptionChange = {
  key: (typeof MARKET_ASSUMPTION_KEYS)[number];
  label: string;
  from: number;
  to: number;
};

export type GoalImpact = {
  id: string;
  name: string;
  /** null when the goal has no cost or no horizon on file. */
  targetCents: number | null;
  yearsAway: number | null;
  atRiskBefore: boolean;
  atRiskAfter: boolean;
};

export type PlanComparison = {
  /** The plan of record, at its own assumptions. */
  record: ScenarioResult;
  /** The scenario's plan changes, at the record's market assumptions. */
  planOnly: ScenarioResult;
  /** The scenario exactly as the advisor left it. */
  full: ScenarioResult;

  /** Points of success probability, decomposed. planPts + marketPts = totalPts. */
  planPts: number;
  marketPts: number;
  totalPts: number;

  /** What the scenario changes, in the advisor's words. */
  changes: string[];
  /** Market-assumption changes, listed separately because they move the
   * yardstick rather than the plan. Empty for a like-for-like test. */
  assumptionChanges: AssumptionChange[];
  /** True when the scenario leaves the market assumptions alone, so the
   * headline number is a clean read on the plan changes. */
  likeForLike: boolean;

  goals: GoalImpact[];
  medianDeltaCents: number;
  p10DeltaCents: number;
};

const ASSUMPTION_LABEL: Record<(typeof MARKET_ASSUMPTION_KEYS)[number], string> = {
  realReturnPct: "Real return",
  volatilityPct: "Volatility",
  inflationPct: "Inflation",
};

export function comparePlans(
  baseline: HouseholdBaseline,
  scenario: HouseholdBaseline,
  seed: number,
): PlanComparison {
  const record = projectScenario({ ...baseline, seed });

  // The scenario's plan changes, judged against the record's yardstick.
  const planOnly = projectScenario({
    ...scenario,
    realReturnPct: baseline.realReturnPct,
    volatilityPct: baseline.volatilityPct,
    inflationPct: baseline.inflationPct,
    seed,
  });

  const full = projectScenario({ ...scenario, seed });

  const assumptionChanges: AssumptionChange[] = MARKET_ASSUMPTION_KEYS.filter(
    (key) => scenario[key] !== baseline[key],
  ).map((key) => ({
    key,
    label: ASSUMPTION_LABEL[key],
    from: baseline[key],
    to: scenario[key],
  }));

  const goals: GoalImpact[] = scenario.goals.map((goal) => {
    const before = baseline.goals.find((g) => g.id === goal.id);
    return {
      id: goal.id,
      name: goal.name,
      targetCents: goal.targetCents,
      yearsAway: goal.yearsAway,
      atRiskBefore: record.goalsAtRisk.includes(before?.name ?? goal.name),
      atRiskAfter: full.goalsAtRisk.includes(goal.name),
    };
  });

  return {
    record,
    planOnly,
    full,
    planPts: planOnly.successProbabilityPct - record.successProbabilityPct,
    marketPts: full.successProbabilityPct - planOnly.successProbabilityPct,
    totalPts: full.successProbabilityPct - record.successProbabilityPct,
    changes: describeChanges(baseline, scenario),
    assumptionChanges,
    likeForLike: assumptionChanges.length === 0,
    goals,
    medianDeltaCents: full.medianEndingCents - record.medianEndingCents,
    p10DeltaCents: full.p10EndingCents - record.p10EndingCents,
  };
}
