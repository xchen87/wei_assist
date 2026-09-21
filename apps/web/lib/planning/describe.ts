import { formatMoney } from "@/lib/format/money";
import type { HouseholdBaseline } from "./baseline";

/** What a scenario actually changed, in an advisor's words.
 *
 * One implementation for two callers that must never disagree: the chips
 * under the live explorer and the summary column in the saved-scenario
 * table. Deriving both from the same baseline-vs-current comparison also
 * means a lever added to the model shows up in the saved rows without
 * anyone remembering to add it in a second place — the previous version
 * read the scenario record field by field, and every new lever would have
 * been silently missing from the table. */

const firstName = (name: string) => name.split(" ")[0] ?? name;
const money = (cents: number) => formatMoney(cents, { compact: true });
const signed = (n: number) => `${n > 0 ? "+" : "−"}${Math.abs(n)}`;

export function describeChanges(
  baseline: HouseholdBaseline,
  current: HouseholdBaseline,
): string[] {
  const changes: string[] = [];

  for (const member of current.members) {
    const before = baseline.members.find((m) => m.id === member.id);
    if (!before) continue;
    const who = firstName(member.name);

    if (member.retirementAge !== before.retirementAge) {
      changes.push(`${who} retires at ${member.retirementAge}`);
    }
    // Only worth saying when it differs from the household's plan-to age —
    // a scenario that moves the household horizon moves every member with
    // it, and repeating that per person says nothing.
    if (member.planToAge !== current.endAge) {
      changes.push(`${who} plans to ${member.planToAge}`);
    }
    if (member.ssClaimAge !== before.ssClaimAge) {
      changes.push(`${who} claims at ${member.ssClaimAge}`);
    }
    if (member.ssMonthlyBenefitCents !== before.ssMonthlyBenefitCents) {
      changes.push(`${who} SS ${money(member.ssMonthlyBenefitCents)}/mo`);
    }
    if (member.annualSavingsCents !== before.annualSavingsCents) {
      changes.push(`${who} saves ${money(member.annualSavingsCents)}/yr`);
    }
    if (member.savingsGrowthPct !== before.savingsGrowthPct) {
      changes.push(`${who} steps up ${member.savingsGrowthPct}%/yr`);
    }
    if (
      member.partTimeIncomeCents > 0 &&
      member.partTimeThroughAge > member.retirementAge
    ) {
      changes.push(
        `${who} part-time ${money(member.partTimeIncomeCents)}/yr to ${member.partTimeThroughAge}`,
      );
    }
    if (member.pensionMonthlyCents > 0) {
      changes.push(
        `${who} pension ${money(member.pensionMonthlyCents)}/mo at ${member.pensionStartAge}${
          member.pensionHasCola ? " with COLA" : ""
        }`,
      );
    }
  }

  if (current.annualRetirementSpendingCents !== baseline.annualRetirementSpendingCents) {
    changes.push(`spends ${money(current.annualRetirementSpendingCents)}/yr`);
  }
  if (current.spendingShiftAge !== null && current.spendingShiftPct !== 0) {
    changes.push(`spending ${signed(current.spendingShiftPct)}% at ${current.spendingShiftAge}`);
  }
  if (current.survivorSpendingPct !== baseline.survivorSpendingPct) {
    changes.push(`survivor spends ${current.survivorSpendingPct}%`);
  }
  if (current.healthcareFromAge !== null && current.healthcareAnnualCents > 0) {
    changes.push(`care ${money(current.healthcareAnnualCents)}/yr from ${current.healthcareFromAge}`);
  }
  if (current.realReturnPct !== baseline.realReturnPct) {
    changes.push(`${current.realReturnPct}% real return`);
  }
  if (current.volatilityPct !== baseline.volatilityPct) {
    changes.push(`${current.volatilityPct}% volatility`);
  }
  if (current.inflationPct !== baseline.inflationPct) {
    changes.push(`${current.inflationPct}% inflation`);
  }
  if (current.effectiveTaxRatePct !== baseline.effectiveTaxRatePct) {
    changes.push(`${current.effectiveTaxRatePct}% effective tax`);
  }
  if (current.oneTimeInflowCents > 0 && current.oneTimeInflowYear > 0) {
    const label = current.oneTimeInflowLabel?.trim() || "one-time inflow";
    changes.push(`${label} ${money(current.oneTimeInflowCents)} in ${current.oneTimeInflowYear} yr`);
  }
  if (current.legacyTargetCents > 0) {
    changes.push(`leaves ${money(current.legacyTargetCents)}`);
  }
  if (current.endAge !== baseline.endAge) {
    changes.push(`plan to ${current.endAge}`);
  }

  // Goals. A dropped goal is the one change that shows up as an absence,
  // so it is found by looking for what is missing rather than by
  // comparing two rows.
  for (const goal of baseline.goals) {
    const after = current.goals.find((g) => g.id === goal.id);
    if (!after) {
      changes.push(`drops ${goal.name}`);
      continue;
    }
    if (after.targetCents !== goal.targetCents && after.targetCents !== null) {
      changes.push(`${goal.name} ${money(after.targetCents)}`);
    }
    if (after.yearsAway !== goal.yearsAway && after.yearsAway !== null) {
      changes.push(`${goal.name} in ${after.yearsAway} yrs`);
    }
  }

  return changes;
}
