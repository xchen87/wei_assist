/**
 * Scenario projection: what happens to a household's plan when its people
 * make different choices.
 *
 * The difference from lib/calc/retirement.ts — which this replaces for the
 * Planning section and keeps for the Retirement view — is that this one is
 * *per member*. Two people in one household retire in different years,
 * claim Social Security in different years, take different pensions and
 * live to different ages, and the household's outcome is the interaction
 * of those, not an average of them. A single "retirement age" cannot
 * express "she goes at 62, he works to 67", which is the first question
 * any couple asks.
 *
 * Pure, no I/O (CLAUDE.md §3), deterministic given a seed.
 *
 * ## Everything is in today's dollars
 *
 * Returns are real (after inflation) and spending is a real figure, so no
 * inflation path is needed for the portfolio. The one place inflation
 * genuinely matters is income that does *not* adjust: a level pension
 * loses purchasing power every year it is paid. `inflationPct` exists for
 * exactly that and nothing else, which is why it defaults to 0 — a rate
 * this app picked on the advisor's behalf would be an invented financial
 * figure (§13). Social Security is treated as keeping pace, since its
 * COLA is statutory.
 *
 * ## What is an input rather than a calculation
 *
 * Social Security benefits, pension amounts and part-time earnings are all
 * entered by the advisor. Each depends on a record this app does not hold
 * — an earnings history, a plan document, an employment agreement — and
 * deriving one would be inventing a figure. Every new lever added here
 * defaults to a value that changes nothing, so turning a lever on is
 * always the advisor's decision, never this module's.
 *
 * Illustrative, like every projection here: real returns are a single
 * mean-and-volatility draw, there is no mortality table (longevity is a
 * stated plan-to age), no tax-aware withdrawal ordering and no sequence of
 * account types — the effective tax rate is a single number applied to
 * portfolio withdrawals.
 */

export type ScenarioMember = {
  id: string;
  name: string;
  role: string;
  currentAge: number;
  retirementAge: number;
  /** Age this member's plan runs to. Per member, because a couple's
   * outcome depends on which of them the portfolio has to outlast. */
  planToAge: number;
  ssClaimAge: number;
  /** From the SSA estimate the advisor entered; 0 when not on file. */
  ssMonthlyBenefitCents: number;
  /** What this member adds to the portfolio each year while working. */
  annualSavingsCents: number;
  /** Real step-up in contributions per year, in percent. 0 means savings
   * hold their purchasing power, which is the neutral assumption. */
  savingsGrowthPct: number;
  /** Phased retirement: earnings after this member's retirement age.
   * 0, or a through-age at or below the retirement age, means none. */
  partTimeIncomeCents: number;
  partTimeThroughAge: number;
  /** Defined-benefit income the advisor entered, and when it starts. */
  pensionMonthlyCents: number;
  pensionStartAge: number;
  /** Whether the pension adjusts for inflation. A level pension is eroded
   * at `inflationPct`; Social Security is not, its COLA being statutory. */
  pensionHasCola: boolean;
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

  // Market assumptions.
  realReturnPct: number;
  volatilityPct: number;
  /** Only erodes level (non-COLA) income. See the note at the top. */
  inflationPct: number;

  // Spending shape.
  /** Retirement spending rarely holds flat for thirty years. A shift of
   * -15 at age 78 is the "spend less later" case an advisor tests; a
   * positive shift is the opposite. 0 leaves spending flat. */
  spendingShiftPct: number;
  /** Household-clock age the shift takes effect; null means no shift. */
  spendingShiftAge: number | null;
  /** What the household spends once only one member is left, as a percent
   * of joint spending. 100 — no reduction — is the neutral default; a
   * survivor percentage is the advisor's assumption to state. */
  survivorSpendingPct: number;
  /** A health or long-term-care cost, per year, from a stated age. */
  healthcareAnnualCents: number;
  healthcareFromAge: number | null;

  // Tax and one-off events.
  /** Applied to portfolio withdrawals only — the draw is grossed up so the
   * household nets its spending. Guaranteed income is assumed to be stated
   * net, since its taxation depends on facts this app doesn't hold. */
  effectiveTaxRatePct: number;
  /** An inheritance, business sale or downsize the advisor is testing. */
  oneTimeInflowCents: number;
  oneTimeInflowYear: number;
  /** Success requires ending at or above this, not merely above zero. */
  legacyTargetCents: number;

  /** Fallback plan-to age, and what the page reports as the horizon. */
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
  /** Annual retirement income the household does not have to draw for,
   * split by where it comes from. Both at full entitlement. */
  ssIncomeCents: number;
  pensionIncomeCents: number;
  partTimeIncomeCents: number;
  /** Where the money runs out when it runs out: the median number of years
   * from now across depleting paths. Null when no path depletes. Years
   * rather than an age, because with per-member plan-to ages there is no
   * single age to quote — the caller names whose it is. */
  medianDepletionYear: number | null;
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
  const volatility = input.volatilityPct;
  const rand = mulberry32(input.seed);

  // Planning members are the ones whose choices move the plan: dependents
  // don't retire or claim, so they don't appear as levers.
  const planners = input.members.filter((m) => m.role !== "Dependent");
  const oldest = planners.reduce((max, m) => Math.max(max, m.currentAge), 0);

  // The plan runs until the last member's plan-to age. The "household
  // clock" is the oldest member's age, which is what the spending-shift
  // and healthcare ages are read against — an advisor saying "spending
  // drops at 80" means the household's 80, not each member's.
  const horizonYears = Math.max(
    1,
    planners.length === 0
      ? input.endAge - oldest
      : Math.max(...planners.map((m) => m.planToAge - m.currentAge)),
  );

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

  // A tax rate at or above 100% would make any withdrawal infinite; clamp
  // rather than produce an Infinity that renders as a blank cell.
  const taxRate = Math.min(0.95, Math.max(0, input.effectiveTaxRatePct / 100));
  const inflation = Math.max(0, input.inflationPct / 100);

  const checkpoints: number[] = [];
  const step = Math.max(1, Math.round(horizonYears / 8));
  for (let y = 0; y <= horizonYears; y += step) checkpoints.push(y);
  if (checkpoints[checkpoints.length - 1] !== horizonYears) checkpoints.push(horizonYears);

  const atCheckpoint: number[][] = checkpoints.map(() => []);
  const endingValues: number[] = [];
  const depletionYears: number[] = [];
  const goalMisses = new Map<string, number>();
  let successes = 0;

  for (let p = 0; p < paths; p++) {
    let value = input.portfolioCents;
    let survived = true;
    let depletedAtYear: number | null = null;
    const missedThisPath = new Set<string>();

    for (let year = 0; year <= horizonYears; year++) {
      if (year > 0) {
        const r = input.realReturnPct / 100 + (volatility / 100) * gaussian(rand);
        value *= 1 + r;

        const alive = planners.filter((m) => m.currentAge + year <= m.planToAge);

        // Contributions from members still working, stepped up by however
        // much the advisor expects the household to add over time.
        for (const m of alive) {
          if (year <= retireIn(m)) {
            value += m.annualSavingsCents * Math.pow(1 + m.savingsGrowthPct / 100, year);
          }
        }

        // Income that arrives whether or not the portfolio performs.
        let income = 0;
        for (const m of alive) {
          const age = m.currentAge + year;
          if (year >= claimIn(m)) income += m.ssMonthlyBenefitCents * 12;
          if (m.pensionMonthlyCents > 0 && age >= m.pensionStartAge) {
            const annual = m.pensionMonthlyCents * 12;
            // A level pension is worth less every year it is paid; a COLA
            // pension holds, like the real-terms figures around it.
            income += m.pensionHasCola
              ? annual
              : annual * Math.pow(1 - inflation, age - m.pensionStartAge);
          }
          if (
            year > retireIn(m) &&
            m.partTimeIncomeCents > 0 &&
            age <= m.partTimeThroughAge
          ) {
            income += m.partTimeIncomeCents;
          }
        }

        // Once the first member retires the household draws its spending
        // need, net of the income above.
        let need = 0;
        if (year > firstRetirementYear && alive.length > 0) {
          const householdAge = oldest + year;
          need = input.annualRetirementSpendingCents;
          if (input.spendingShiftAge !== null && householdAge >= input.spendingShiftAge) {
            need *= 1 + input.spendingShiftPct / 100;
          }
          if (alive.length < planners.length) need *= input.survivorSpendingPct / 100;
          if (input.healthcareFromAge !== null && householdAge >= input.healthcareFromAge) {
            need += input.healthcareAnnualCents;
          }
        }

        // Guaranteed income covers the need first. A shortfall is drawn
        // from the portfolio and grossed up for tax; a surplus is saved.
        const net = need - income;
        value -= net > 0 ? net / (1 - taxRate) : net;

        if (input.oneTimeInflowCents > 0 && year === input.oneTimeInflowYear) {
          value += input.oneTimeInflowCents;
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
          if (survived) depletedAtYear = year;
          survived = false;
        }
      }

      const idx = checkpoints.indexOf(year);
      if (idx !== -1) atCheckpoint[idx]!.push(value);
    }

    // Success is outliving the money *and* clearing whatever the household
    // means to leave behind. With no legacy target the second test is the
    // same as the first, which is the plain "didn't run out" reading.
    if (survived && value >= input.legacyTargetCents) successes++;
    endingValues.push(value);
    if (depletedAtYear !== null) depletionYears.push(depletedAtYear);
    for (const name of missedThisPath) goalMisses.set(name, (goalMisses.get(name) ?? 0) + 1);
  }

  const sortedCheckpoints = atCheckpoint.map((vs) => [...vs].sort((a, b) => a - b));
  const sortedEndings = [...endingValues].sort((a, b) => a - b);
  const sortedDepletions = [...depletionYears].sort((a, b) => a - b);

  const ssIncomeCents = planners.reduce((sum, m) => sum + m.ssMonthlyBenefitCents * 12, 0);
  const pensionIncomeCents = planners.reduce((sum, m) => sum + m.pensionMonthlyCents * 12, 0);
  const partTimeIncomeCents = planners.reduce(
    (sum, m) => sum + (m.partTimeThroughAge > m.retirementAge ? m.partTimeIncomeCents : 0),
    0,
  );

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
    pensionIncomeCents,
    partTimeIncomeCents,
    medianDepletionYear:
      sortedDepletions.length === 0 ? null : percentile(sortedDepletions, 50),
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
