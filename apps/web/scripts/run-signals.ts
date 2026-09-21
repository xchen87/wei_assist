/**
 * Run a scenario from the command line — what a cron would call, and what
 * a live demo triggers between sentences.
 *
 *   pnpm --filter @meridian/web signals equity_drawdown -12 "Equities down 12% from the high"
 *   pnpm --filter @meridian/web signals --rerun fed_funds_rate
 */
import { rerunLatest, runScenario } from "../lib/signals/run";

async function main() {
  const [first, second, ...rest] = process.argv.slice(2);

  if (!first) {
    console.error("Usage: signals <indicator_key> <new_value> [note]   |   signals --rerun <indicator_key>");
    process.exit(1);
  }

  const result =
    first === "--rerun"
      ? await rerunLatest(second ?? "")
      : await runScenario({
          indicatorKey: first,
          toValue: Number(second),
          note: rest.join(" ") || "Scenario run from the command line",
        });

  if ("error" in result) {
    console.error(result.error);
    process.exit(1);
  }

  console.log(
    `${result.indicator}: ${result.from} → ${result.to}\n` +
      `  ${result.householdsEvaluated} households evaluated\n` +
      `  ${result.householdsAffected} affected\n` +
      `  ${result.alertsCreated} alerts raised`,
  );
}

void main();
