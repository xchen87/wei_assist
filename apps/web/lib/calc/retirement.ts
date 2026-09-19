/**
 * A simplified Monte Carlo-style retirement projection: many simulated
 * paths of annual real (inflation-adjusted) returns, contributions before
 * retirement, withdrawals after, aggregated into percentile bands at a few
 * checkpoint ages. Deterministic given the same seed, so the same household
 * always renders the same fan chart. Pure, no I/O — see CLAUDE.md §3.
 *
 * This is illustrative planning math, not a production actuarial model —
 * no mortality tables, tax-aware withdrawal ordering, or Social Security
 * timing optimization. Good enough to demonstrate the shape of the chart
 * catalog entry (CLAUDE.md §8) against real per-household inputs instead of
 * hardcoded pixel positions.
 */

export type RetirementProjectionInput = {
  currentAge: number;
  retirementAge: number;
  endAge?: number; // default 95, matches design/Retirement.dc.html
  currentPortfolioCents: number;
  annualContributionCents: number; // applied while age <= retirementAge
  annualSpendingCents: number; // today's dollars; applied while age > retirementAge
  expectedRealReturnPct?: number; // default 5 — already net of inflation
  volatilityPct?: number; // default 11
  seed: number;
  paths?: number; // default 400
  checkpoints?: number; // default 6, matches design's tick count
};

export type RetirementProjectionResult = {
  ages: number[];
  p10: number[];
  p25: number[];
  median: number[];
  p75: number[];
  p90: number[];
  successProbabilityPct: number; // % of paths that never hit zero by endAge
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
  const idx = Math.min(sortedAscending.length - 1, Math.max(0, Math.round((p / 100) * (sortedAscending.length - 1))));
  return sortedAscending[idx]!;
}

export function projectRetirement(input: RetirementProjectionInput): RetirementProjectionResult {
  const endAge = input.endAge ?? 95;
  const expectedRealReturnPct = input.expectedRealReturnPct ?? 5;
  const volatilityPct = input.volatilityPct ?? 11;
  const paths = input.paths ?? 400;
  const checkpointCount = input.checkpoints ?? 6;
  const totalYears = endAge - input.currentAge;
  const rand = mulberry32(input.seed);

  const ages: number[] = [];
  for (let i = 0; i < checkpointCount; i++) {
    ages.push(Math.round(input.currentAge + (totalYears * i) / (checkpointCount - 1)));
  }
  ages[ages.length - 1] = endAge;

  const valuesAtCheckpoint: number[][] = ages.map(() => []);
  let successCount = 0;

  for (let p = 0; p < paths; p++) {
    let value = input.currentPortfolioCents;
    let failed = false;
    let checkpointIdx = 0;
    while (checkpointIdx < ages.length && ages[checkpointIdx] === input.currentAge) {
      valuesAtCheckpoint[checkpointIdx]!.push(value);
      checkpointIdx++;
    }

    for (let age = input.currentAge + 1; age <= endAge; age++) {
      const r = expectedRealReturnPct / 100 + (volatilityPct / 100) * gaussian(rand);
      value = value * (1 + r) + (age <= input.retirementAge ? input.annualContributionCents : -input.annualSpendingCents);
      if (value <= 0) {
        value = 0;
        failed = true;
      }
      while (checkpointIdx < ages.length && ages[checkpointIdx] === age) {
        valuesAtCheckpoint[checkpointIdx]!.push(value);
        checkpointIdx++;
      }
    }
    if (!failed) successCount++;
  }

  const sorted = valuesAtCheckpoint.map((vs) => [...vs].sort((a, b) => a - b));

  return {
    ages,
    p10: sorted.map((vs) => percentile(vs, 10)),
    p25: sorted.map((vs) => percentile(vs, 25)),
    median: sorted.map((vs) => percentile(vs, 50)),
    p75: sorted.map((vs) => percentile(vs, 75)),
    p90: sorted.map((vs) => percentile(vs, 90)),
    successProbabilityPct: Math.round((successCount / paths) * 100),
  };
}
