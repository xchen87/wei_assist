"use server";

import { prisma } from "@meridian/db";
import { revalidatePath } from "next/cache";

/** Saving a scenario is a write, so it is a deliberate action — the
 * explorer recomputes locally as levers move and only persists when the
 * advisor decides the scenario is worth keeping.
 *
 * Every field is nullable and null means "inherit from the plan of
 * record". The explorer sends null for any lever still sitting at its
 * baseline, so a scenario records the two things it changed rather than a
 * frozen copy of twenty figures that were never touched. */
export type ScenarioLevers = {
  name: string;
  note: string;
  retirementSpendingCents: number | null;
  realReturnPct: number | null;
  volatilityPct: number | null;
  inflationPct: number | null;
  spendingShiftPct: number | null;
  spendingShiftAge: number | null;
  survivorSpendingPct: number | null;
  healthcareAnnualCents: number | null;
  healthcareFromAge: number | null;
  effectiveTaxRatePct: number | null;
  oneTimeInflowCents: number | null;
  oneTimeInflowYear: number | null;
  oneTimeInflowLabel: string | null;
  legacyTargetCents: number | null;
  endAge: number | null;
  goals: {
    goalId: string;
    targetCents: number | null;
    yearsAway: number | null;
    included: boolean | null;
  }[];
  members: {
    memberId: string;
    retirementAge: number | null;
    planToAge: number | null;
    ssClaimAge: number | null;
    ssMonthlyBenefitCents: number | null;
    annualSavingsCents: number | null;
    savingsGrowthPct: number | null;
    partTimeIncomeCents: number | null;
    partTimeThroughAge: number | null;
    pensionMonthlyCents: number | null;
    pensionStartAge: number | null;
    pensionHasCola: boolean | null;
  }[];
};

/** Money crosses to bigint here, at the database boundary (D-023). */
const toBig = (v: number | null) => (v === null ? null : BigInt(Math.round(v)));

export async function saveScenario(householdId: string, levers: ScenarioLevers) {
  const name = levers.name.trim() || "Untitled scenario";

  const scenario = await prisma.planScenario.create({
    data: {
      householdId,
      name,
      kind: "whatif",
      note: levers.note.trim() || null,
      retirementSpendingCents: toBig(levers.retirementSpendingCents),
      realReturnPct: levers.realReturnPct,
      volatilityPct: levers.volatilityPct,
      inflationPct: levers.inflationPct,
      spendingShiftPct: levers.spendingShiftPct,
      spendingShiftAge: levers.spendingShiftAge,
      survivorSpendingPct: levers.survivorSpendingPct,
      healthcareAnnualCents: toBig(levers.healthcareAnnualCents),
      healthcareFromAge: levers.healthcareFromAge,
      effectiveTaxRatePct: levers.effectiveTaxRatePct,
      oneTimeInflowCents: toBig(levers.oneTimeInflowCents),
      oneTimeInflowYear: levers.oneTimeInflowYear,
      oneTimeInflowLabel: levers.oneTimeInflowLabel?.trim() || null,
      legacyTargetCents: toBig(levers.legacyTargetCents),
      endAge: levers.endAge,
      goals: {
        create: levers.goals.map((g) => ({
          goalId: g.goalId,
          targetCents: toBig(g.targetCents),
          yearsAway: g.yearsAway,
          included: g.included,
        })),
      },
      members: {
        create: levers.members.map((m) => ({
          memberId: m.memberId,
          retirementAge: m.retirementAge,
          planToAge: m.planToAge,
          ssClaimAge: m.ssClaimAge,
          ssMonthlyBenefitCents: toBig(m.ssMonthlyBenefitCents),
          annualSavingsCents: toBig(m.annualSavingsCents),
          savingsGrowthPct: m.savingsGrowthPct,
          partTimeIncomeCents: toBig(m.partTimeIncomeCents),
          partTimeThroughAge: m.partTimeThroughAge,
          pensionMonthlyCents: toBig(m.pensionMonthlyCents),
          pensionStartAge: m.pensionStartAge,
          pensionHasCola: m.pensionHasCola,
        })),
      },
    },
    select: { id: true },
  });

  revalidatePath(`/clients/${householdId}/planning`);
  return scenario.id;
}

/** Marking one scenario as the recommendation demotes any previous one —
 * a plan has one recommendation, or the word means nothing. */
export async function setRecommended(householdId: string, scenarioId: string) {
  await prisma.planScenario.updateMany({
    where: { householdId, kind: "recommended" },
    data: { kind: "whatif" },
  });
  await prisma.planScenario.update({ where: { id: scenarioId }, data: { kind: "recommended" } });
  revalidatePath(`/clients/${householdId}/planning`);
}

export async function deleteScenario(householdId: string, scenarioId: string) {
  await prisma.planScenario.delete({ where: { id: scenarioId } });
  revalidatePath(`/clients/${householdId}/planning`);
}
