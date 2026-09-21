/**
 * Directional check on the scenario model: does each lever move the
 * projection the way an advisor would expect, and does the plan of record
 * land where it did before the lever existed?
 *
 *   pnpm --filter @meridian/web check:planning
 *
 * This wants to be a Vitest suite over lib/calc/planning.ts with a fixture
 * household — the runner isn't wired up yet (CLAUDE.md §2 lists it, PROGRESS
 * tracks it), and a check that runs is worth more than one that is waiting
 * on infrastructure. It reads a seeded household rather than a fixture for
 * the same reason, which is also its weakness: reseeding can move the
 * numbers, so it asserts on direction, never on a value.
 */
import { prisma } from "@meridian/db";
import { projectScenario } from "../lib/calc/planning";
import { buildBaseline, seedFor, type HouseholdBaseline } from "../lib/planning/baseline";

async function main() {
  const household = await prisma.household.findFirst({
    where: { name: { contains: "Whitaker" } },
    include: { members: true, goals: true },
  });
  if (!household) throw new Error("no Whitaker household");

  const baseline = buildBaseline(household);
  const seed = seedFor(household.id);
  const run = (b: HouseholdBaseline) => projectScenario({ ...b, seed });
  const base = run(baseline);

  console.log(`household: ${household.name}  members: ${baseline.members.map((m) => `${m.name}(${m.role},${m.currentAge},r${m.retirementAge},ss${m.ssClaimAge})`).join(" ")}`);
  console.log(`BASELINE  ${base.successProbabilityPct}%  median $${Math.round(base.medianEndingCents / 100).toLocaleString()}  firstRetire ${base.firstRetirementYear}`);
  console.log("");

  const m0 = baseline.members[0]!;
  const withMember = (patch: Partial<(typeof baseline.members)[number]>): HouseholdBaseline => ({
    ...baseline,
    members: baseline.members.map((m, i) => (i === 0 ? { ...m, ...patch } : m)),
  });

  const cases: [string, HouseholdBaseline, "up" | "down" | "same"][] = [
    ["retire 3 yrs later", withMember({ retirementAge: m0.retirementAge + 3 }), "up"],
    ["retire 3 yrs earlier", withMember({ retirementAge: m0.retirementAge - 3 }), "down"],
    ["plan to 105 (was 95)", withMember({ planToAge: 105 }), "down"],
    ["SS $3,000/mo", withMember({ ssMonthlyBenefitCents: 300_000 }), "up"],
    ["pension $2,000/mo at 65", withMember({ pensionMonthlyCents: 200_000, pensionStartAge: 65 }), "up"],
    ["part-time $60K to 70", withMember({ partTimeIncomeCents: 6_000_000, partTimeThroughAge: 70 }), "up"],
    ["savings step-up 3%/yr", withMember({ savingsGrowthPct: 3 }), "up"],
    ["spending +25%", { ...baseline, annualRetirementSpendingCents: Math.round(baseline.annualRetirementSpendingCents * 1.25) }, "down"],
    ["spending −20% at 78", { ...baseline, spendingShiftPct: -20, spendingShiftAge: 78 }, "up"],
    ["survivor spends 70%", { ...baseline, survivorSpendingPct: 70 }, "up"],
    ["care $80K/yr from 85", { ...baseline, healthcareAnnualCents: 8_000_000, healthcareFromAge: 85 }, "down"],
    ["real return 7% (was 5)", { ...baseline, realReturnPct: 7 }, "up"],
    ["volatility 18% (was 11)", { ...baseline, volatilityPct: 18 }, "down"],
    ["effective tax 22%", { ...baseline, effectiveTaxRatePct: 22 }, "down"],
    ["inflow $1M in 5 yrs", { ...baseline, oneTimeInflowCents: 100_000_000, oneTimeInflowYear: 5 }, "up"],
    ["legacy target $5M", { ...baseline, legacyTargetCents: 500_000_000 }, "down"],
    ["inflation 3% (no pension)", { ...baseline, inflationPct: 3 }, "same"],
  ];

  let bad = 0;
  for (const [label, input, expect] of cases) {
    const r = run(input);
    const d = r.successProbabilityPct - base.successProbabilityPct;
    // Direction is judged on the median ending value, not the rounded
    // probability: a lever worth a few thousand dollars a year is real
    // arithmetic that a 0-99 integer cannot show.
    const dm = r.medianEndingCents - base.medianEndingCents;
    // A legacy target changes what counts as success without touching a
    // single dollar of the projection, so fall back to the probability
    // when the median is untouched.
    const dir = dm > 0 ? "up" : dm < 0 ? "down" : d > 0 ? "up" : d < 0 ? "down" : "same";
    const ok = expect === "same" ? Math.abs(d) <= 1 : dir === expect;
    if (!ok) bad++;
    console.log(
      `${ok ? "ok  " : "BAD "} ${label.padEnd(30)} ${String(r.successProbabilityPct).padStart(3)}%  ${d >= 0 ? "+" : ""}${d} pts  median ${dm >= 0 ? "+" : "−"}$${Math.abs(Math.round(dm / 100)).toLocaleString()}  (expected ${expect})`,
    );
  }

  // A level pension should lose ground to inflation; a COLA pension shouldn't.
  const level = run(withMember({ pensionMonthlyCents: 200_000, pensionStartAge: 65, pensionHasCola: false, ssMonthlyBenefitCents: 0 }));
  const levelInflated = run({ ...withMember({ pensionMonthlyCents: 200_000, pensionStartAge: 65, pensionHasCola: false }), inflationPct: 3 });
  const colaInflated = run({ ...withMember({ pensionMonthlyCents: 200_000, pensionStartAge: 65, pensionHasCola: true }), inflationPct: 3 });
  console.log("");
  console.log(`level pension, 0% inflation: ${level.successProbabilityPct}%`);
  console.log(`level pension, 3% inflation: ${levelInflated.successProbabilityPct}%  (should be lower)`);
  console.log(`COLA  pension, 3% inflation: ${colaInflated.successProbabilityPct}%  (should match the 0% row)`);
  if (levelInflated.successProbabilityPct > level.successProbabilityPct) bad++;
  if (colaInflated.successProbabilityPct !== level.successProbabilityPct) bad++;

  console.log("");
  console.log(bad === 0 ? "ALL OK" : `${bad} UNEXPECTED`);
  await prisma.$disconnect();
}

main();
