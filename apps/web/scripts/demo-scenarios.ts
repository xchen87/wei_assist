/**
 * The scenarios a fresh demo opens with, run after seeding.
 *
 * Two, deliberately: one market move and one policy change, so the board
 * shows the engine's range without pre-empting the scenarios worth running
 * live in front of an advisor (the rate move and the estate threshold are
 * the two that land best when they watch them happen).
 */
import { prisma } from "@meridian/db";
import { runScenario } from "../lib/signals/run";

const OPENING_SCENARIOS = [
  {
    indicatorKey: "equity_drawdown",
    toValue: -14,
    note: "Simulated: US equities 14% off the high",
  },
  {
    indicatorKey: "rmd_age",
    toValue: 75,
    note: "Simulated: required distribution age moves to 75",
  },
];

async function main() {
  for (const scenario of OPENING_SCENARIOS) {
    const result = await runScenario(scenario);
    if ("error" in result) {
      console.error(`  ${scenario.indicatorKey}: ${result.error}`);
      continue;
    }
    console.log(
      `  ${result.indicator}: ${result.from} → ${result.to} — ${result.householdsAffected}/${result.householdsEvaluated} households, ${result.alertsCreated} alerts`,
    );
  }

  const [households, prospects, indicators, alerts, advisors] = await Promise.all([
    prisma.household.count(),
    prisma.prospect.count(),
    prisma.indicator.count(),
    prisma.alert.count({ where: { status: "open" } }),
    prisma.advisor.count(),
  ]);

  console.log(
    `\nDemo ready: ${households} households across ${advisors} advisors, ${prospects} prospects, ` +
      `${indicators} watched indicators, ${alerts} open alerts.\n` +
      `Run another scenario live from /signals, or with:\n` +
      `  pnpm --filter @meridian/web signals fed_funds_rate 5.0 "Policy rate up 75bp"`,
  );
  await prisma.$disconnect();
}

void main();
