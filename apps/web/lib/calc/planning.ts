/**
 * Scenario projection: what happens to a household's plan when its people
 * make different choices.
 *
 * The difference from lib/calc/retirement.ts — which this replaces for the
 * Planning section and keeps for the Retirement view — is that this one is
 * *per member*. Two people in one household retire in different years,
 * claim Social Security in different years and stop saving in different
 * years, and the household's outcome is the interaction of those, not an
 * average of them. A single "retirement age" cannot express "she goes at
 * 62, he works to 67", which is the first question any couple asks.
 *
 * Pure, no I/O (CLAUDE.md §3), deterministic given a seed.
 *
 * Illustrative, like every projection here: real returns are a single
 * mean-and-volatility draw, there are no mortality tables, no tax-aware
 * withdrawal ordering and no inflation path. Social Security is an *input*
 * — the advisor enters the SSA estimate — because a benefit depends on an
 * earnings record this app does not hold, and deriving one would be
 * inventing a financial figure (§13).
 */

export type ScenarioMember = {
  id: string;
  name: string;
  role: string;
  currentAge: number;
  retirementAge: number;
  ssClaimAge: number;
  /** From the SSA estimate the advisor entered; 0 when not on file. */
  ssMonthlyBenefitCents: number;
  /** What this member adds to the portfolio each year while working. */
  annualSavingsCents: number;
};

export type ScenarioGoal = {
  id: string;
  name: string;
  targetCents: number | null;
  /** Years from now the goal is funded; null when it has no horizon yet. */
  yearsAway: number | null;
  priority: string;
};

export type ScenarioInput = {
  members: ScenarioMember[];
  portfolioCents: number;
  /** Household spending need in retirement, per year, today's dollars. */
  annualRetirementSpendingCents: number;
  goals: ScenarioGoal[];
  realReturnPct: number;
  volatilityPct?: number;
  /** Age of the *oldest* member at the end of the projection. */
  endAge: number;
  seed: number;
  paths?: number;
};

export type ScenarioResult = {
  successProbabilityPct: number;
  /** Years from now, for the horizontal axis. */
  years: number[];
  p10: number[];
  median: number[];
  p90: number[];
  /** Median portfolio at the end, and the worst decile — the number an
   * advisor actually quotes alongside the probability. */
  medianEndingCents: number;
  p10EndingCents: number;
  /** The year the household stops adding and starts drawing. */
  firstRetirementYear: number;
  /** Goals that could not be funded in the median path, by name. */
  goalsAtRisk: string[];
  /** Annual retirement income from entered Social Security estimates. */
  ssIncomeCents: number;
};

function mulberry32(seed: number) {
  let a = seed;
  return function () {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function gaussian(rand: () => number): number {
  const u1 = Math.max(rand(), 1e-9);
  const u2 = rand();
  return Math.sqrt(-2 * Math.log(u1)) * Math.cos(2 * Math.PI * u2);
}

function percentile(sortedAscending: number[], p: number): number {
  if (sortedAscending.length === 0) return 0;
  const idx = Math.min(
    sortedAscending.length - 1,
    Math.max(0, Math.round((p / 100) * (sortedAscending.length - 1))),
  );
  return sortedAscending[idx]!;
}

export function projectScenario(input: ScenarioInput): ScenarioResult {
  const paths = input.paths ?? 400;
  const volatility = input.volatilityPct ?? 11;
  const rand = mulberry32(input.seed);

  // Planning members are the ones whose choices move the plan: dependents
  // don't retire or claim, so they don't appear as levers.
  const planners = input.members.filter((m) => m.role !== "Dependent");
  const oldest = planners.reduce((max, m) => Math.max(max, m.currentAge), 0);
  const horizonYears = Math.max(1, input.endAge - oldest);

  // Years from now, per member, at which each event happens. A member
  // already past their retirement age retires in year 0 rather than in the
  // past, which is what "retired at 62, now 69" means for the projection.
  const retireIn = (m: ScenarioMember) => Math.max(0, m.retirementAge - m.currentAge);
  const claimIn = (m: ScenarioMember) => Math.max(0, m.ssClaimAge - m.currentAge);

  const firstRetirementYear =
    planners.length === 0 ? 0 : Math.min(...planners.map(retireIn));

  const goalDraws = input.goals
    .filter((g) => g.targetCents !== null && g.yearsAway !== null)
    .map((g) => ({ name: g.name, year: g.yearsAway!, cents: g.targetCents! }));

  const checkpoints: number[] = [];
  const step = Math.max(1, Math.round(horizonYears / 5));
  for (let y = 0; y <= horizonYears; y += step) checkpoints.push(y);
  if (checkpoints[checkpoints.length - 1] !== horizonYears) checkpoints.push(horizonYears);

  const atCheckpoint: number[][] = checkpoints.map(() => []);
  const endingValues: number[] = [];
  const goalMisses = new Map<string, number>();
  let successes = 0;

  for (let p = 0; p < paths; p++) {
    let value = input.portfolioCents;
    let survived = true;
    const missedThisPath = new Set<string>();

    for (let year = 0; year <= horizonYears; year++) {
      if (year > 0) {
        const r = input.realReturnPct / 100 + (volatility / 100) * gaussian(rand);
        value *= 1 + r;

        // Contributions from members still working.
        for (const m of planners) {
          if (year <= retireIn(m)) value += m.annualSavingsCents;
        }

        // Once the first member retires the household draws its spending
        // need, net of whatever Social Security has started paying.
        if (year > firstRetirementYear) {
          const ssIncome = planners
            .filter((m) => year >= claimIn(m))
            .reduce((sum, m) => sum + m.ssMonthlyBenefitCents * 12, 0);
          value -= Math.max(0, input.annualRetirementSpendingCents - ssIncome);
        }

        // Goals are funded out of the portfolio in the year they fall due.
        for (const goal of goalDraws) {
          if (goal.year === year) {
            if (value < goal.cents) missedThisPath.add(goal.name);
            value -= goal.cents;
          }
        }

        if (value <= 0) {
          value = 0;
          survived = false;
        }
      }

      const idx = checkpoints.indexOf(year);
      if (idx !== -1) atCheckpoint[idx]!.push(value);
    }

    if (survived) successes++;
    endingValues.push(value);
    for (const name of missedThisPath) goalMisses.set(name, (goalMisses.get(name) ?? 0) + 1);
  }

  const sortedCheckpoints = atCheckpoint.map((vs) => [...vs].sort((a, b) => a - b));
  const sortedEndings = [...endingValues].sort((a, b) => a - b);

  const ssIncomeCents = planners.reduce((sum, m) => sum + m.ssMonthlyBenefitCents * 12, 0);

  return {
    successProbabilityPct: Math.round((successes / paths) * 100),
    years: checkpoints,
    p10: sortedCheckpoints.map((vs) => percentile(vs, 10)),
    median: sortedCheckpoints.map((vs) => percentile(vs, 50)),
    p90: sortedCheckpoints.map((vs) => percentile(vs, 90)),
    medianEndingCents: percentile(sortedEndings, 50),
    p10EndingCents: percentile(sortedEndings, 10),
    firstRetirementYear,
    // A goal is "at risk" when it fails in more than a quarter of paths —
    // one unlucky path missing it is noise, not a finding.
    goalsAtRisk: [...goalMisses.entries()]
      .filter(([, count]) => count / paths > 0.25)
      .map(([name]) => name),
    ssIncomeCents,
  };
}

/** Years from now implied by the horizon bands intake collects. Midpoints,
 * because a band is what the household actually told us. */
export function yearsFromHorizon(horizon: string | null): number | null {
  switch (horizon) {
    case "Under 3 years":
      return 2;
    case "3–7 years":
      return 5;
    case "7–15 years":
      return 11;
    case "15+ years":
      return 18;
    case "Ongoing":
      return null;
    default:
      return null;
  }
}
