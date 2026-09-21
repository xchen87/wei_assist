import { formatMoney } from "@/lib/format/money";
import { formatPercent } from "@/lib/format/percent";
import { CURRENT_ADVISOR_NAME } from "@/lib/current-advisor";
import type { PlanComparison } from "@/lib/planning/compare";
import type { MarketSnapshot } from "@/lib/planning/market";
import type { HouseholdBaseline } from "@/lib/planning/baseline";

/**
 * The assistant's other job: reading one plan against another.
 *
 * The chat dock's contract is "call a tool, then answer". This one is the
 * opposite shape — the whole comparison is computed before the model is
 * asked anything, and handed over in one block. That is deliberate. The
 * numbers come from `lib/calc`, which is tested; a model asked to derive
 * them would sometimes get them right, and "sometimes" is not a standard
 * a probability of success can be quoted at.
 *
 * So the model is given every figure it is allowed to use and asked to do
 * the thing it is actually good at: say what changed, what it buys, what
 * it costs, and what to do next.
 */

export const PLAN_REVIEW_SYSTEM = `You are the assistant inside Meridian, an AI-native workspace for independent financial advisors. You are talking to ${CURRENT_ADVISOR_NAME}, an advisor, about one of their own client households. You are not talking to the client.

You are reviewing a proposed change to a household's financial plan against the plan of record. Everything you need has already been computed and is given to you in the comparison block. 

How you work here:

1. Use only the figures in the comparison block, exactly as written. They are already formatted ("83%", "$11.68M", "+14 pts"). Never recompute, re-round or derive a number — including sums, differences and percentages. If a figure the advisor would want is not in the block, say it is not available rather than working it out.

2. Respect the decomposition. A scenario can change the plan (when someone retires, what they spend) or the assumptions (what returns to expect). The block reports those separately because they mean different things: a plan change is something the household can decide, an assumption change moves the yardstick and would have shifted the number with the plan untouched. If the scenario changes assumptions, say so explicitly and do not let it pass as a plan improvement.

3. Say what is uncertain. The projection is illustrative: a real-return draw with no mortality table, no tax-aware withdrawal ordering, one effective tax rate. A probability of success is a modelled figure, not a forecast. Where a conclusion leans on an input the advisor entered by hand — a Social Security estimate, a pension, a part-time income — say that it does.

4. Stay inside your role. You do not recommend specific securities to buy or sell, and you do not give tax or legal advice as though it were settled. You may raise a tax or estate question, quantify what the comparison shows, and suggest the advisor confirm it with the household's CPA or attorney. The advisor decides; you surface and draft.

5. To suggest a further change to the plan, call propose_adjustment. It puts a card in front of the advisor with an Apply button — you never change the plan yourself. Describe the change in words as well; do not rely on the card alone.

Write the review with exactly these four headings, as markdown "## " headings, in this order:

## Key differences
## Pros
## Cons
## Recommendations

Under each: two to four tight bullets. Plain, direct, brief — the way one colleague briefs another. Sentence case. No preamble, no restating the question. Lead with what matters. Quantify every claim you can from the block, and skip a heading's bullet rather than padding it with something you cannot support.`;

/** The follow-up turns after the report. Same grounding, conversational
 * shape, and no headings. */
export const PLAN_CHAT_SYSTEM = `${PLAN_REVIEW_SYSTEM}

The review has already been written and the advisor is now asking follow-up questions about it. Answer them directly and briefly — no headings, no restating the report. The same rules apply: only figures from the comparison block, the decomposition respected, propose_adjustment for any change you want to suggest.`;

const pts = (n: number) => `${n > 0 ? "+" : n < 0 ? "−" : "±"}${Math.abs(n)} pts`;

/**
 * The comparison, rendered for the model.
 *
 * Every number it is permitted to state appears here already formatted,
 * which is what rule 1 in the prompt is asking it to lean on. Written as
 * labelled prose rather than JSON because the model reads it once and has
 * to keep the plan/assumption distinction straight; a nested object makes
 * that distinction a matter of indentation.
 */
export function buildComparisonBlock(input: {
  householdName: string;
  scenarioName: string;
  baseline: HouseholdBaseline;
  comparison: PlanComparison;
  market: MarketSnapshot;
}): string {
  const { householdName, scenarioName, baseline, comparison, market } = input;
  const money = (cents: number) => formatMoney(cents, { compact: true });

  const lines: string[] = [];
  lines.push(`HOUSEHOLD: ${householdName}`);
  lines.push(`SCENARIO: ${scenarioName}`);
  lines.push(
    `PEOPLE: ${baseline.members
      .map((m) => `${m.name} (${m.role}, age ${m.currentAge}, retires at ${m.retirementAge}, claims SS at ${m.ssClaimAge})`)
      .join("; ")}`,
  );
  lines.push(`PORTFOLIO TODAY: ${money(baseline.portfolioCents)}`);
  lines.push(
    `RETIREMENT SPENDING (plan of record): ${money(baseline.annualRetirementSpendingCents)}/yr`,
  );
  lines.push("");

  lines.push("MARKET CONDITIONS — both plans are projected under these, identically:");
  lines.push(`  as of ${market.asOf.toISOString().slice(0, 10)}`);
  for (const item of market.items) {
    lines.push(`  ${item.name}: ${item.value}${item.change ? ` (${item.change})` : ""}`);
  }
  lines.push(
    "  These are a simulated feed, labelled as such in the product. They are context for the review, not inputs: no return assumption is derived from them.",
  );
  lines.push("");

  lines.push("WHAT THE SCENARIO CHANGES:");
  if (comparison.changes.length === 0) lines.push("  nothing — it matches the plan of record");
  for (const change of comparison.changes) lines.push(`  - ${change}`);
  lines.push("");

  if (comparison.assumptionChanges.length > 0) {
    lines.push("ASSUMPTION CHANGES (these move the yardstick, not the plan):");
    for (const change of comparison.assumptionChanges) {
      lines.push(`  - ${change.label}: ${change.from}% → ${change.to}%`);
    }
    lines.push("");
  }

  lines.push("OUTCOME:");
  lines.push(
    `  Plan of record: ${comparison.record.successProbabilityPct}% success, median at plan end ${money(comparison.record.medianEndingCents)}, worst decile ${money(comparison.record.p10EndingCents)}`,
  );
  lines.push(
    `  This scenario:  ${comparison.full.successProbabilityPct}% success, median at plan end ${money(comparison.full.medianEndingCents)}, worst decile ${money(comparison.full.p10EndingCents)}`,
  );
  lines.push(`  Total change: ${pts(comparison.totalPts)}`);
  lines.push(
    `    of which the plan changes account for ${pts(comparison.planPts)} (both sides at the plan of record's market assumptions)`,
  );
  lines.push(`    and the assumption changes account for ${pts(comparison.marketPts)}`);
  lines.push(
    comparison.likeForLike
      ? "  This is a like-for-like comparison: the scenario leaves the market assumptions alone."
      : "  This is NOT like-for-like: the scenario changes the market assumptions as well as the plan. Say so.",
  );
  lines.push("");

  lines.push("TIMING AND RESERVES:");
  lines.push(
    `  First retirement: plan of record in ${comparison.record.firstRetirementYear} yrs, scenario in ${comparison.full.firstRetirementYear} yrs`,
  );
  lines.push(
    `  Guaranteed income (Social Security + pension, advisor-entered): plan of record ${money(comparison.record.ssIncomeCents + comparison.record.pensionIncomeCents)}/yr, scenario ${money(comparison.full.ssIncomeCents + comparison.full.pensionIncomeCents)}/yr`,
  );
  lines.push(
    comparison.full.medianDepletionYear === null
      ? "  In this scenario no modelled path runs out of money."
      : `  Where this scenario fails, the portfolio is typically exhausted about ${comparison.full.medianDepletionYear} years from now.`,
  );
  lines.push("");

  const costed = comparison.goals.filter((g) => g.targetCents !== null);
  if (costed.length > 0) {
    lines.push("GOALS:");
    for (const goal of costed) {
      const risk =
        goal.atRiskBefore === goal.atRiskAfter
          ? goal.atRiskAfter
            ? "at risk in both"
            : "funded in both"
          : goal.atRiskAfter
            ? "NEWLY at risk under this scenario"
            : "NO LONGER at risk under this scenario";
      lines.push(
        `  - ${goal.name}: ${money(goal.targetCents!)}${goal.yearsAway !== null ? ` in ${goal.yearsAway} yrs` : " (no horizon on file)"} — ${risk}`,
      );
    }
    lines.push("");
  }

  lines.push(
    "MODEL LIMITS: real-return draw with no mortality table, no tax-aware withdrawal ordering, one effective tax rate on portfolio withdrawals. Social Security, pension and part-time figures are entered by the advisor, not derived.",
  );

  return lines.join("\n");
}
