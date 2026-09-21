"use server";

import { prisma } from "@meridian/db";
import { revalidatePath } from "next/cache";

/** Saving a scenario is a write, so it is a deliberate action — the
 * explorer recomputes locally as levers move and only persists when the
 * advisor decides the scenario is worth keeping. */
export type ScenarioLevers = {
  name: string;
  note: string;
  retirementSpendingCents: number | null;
  realReturnPct: number | null;
  members: {
    memberId: string;
    retirementAge: number | null;
    ssClaimAge: number | null;
    ssMonthlyBenefitCents: number | null;
    annualSavingsCents: number | null;
  }[];
};

export async function saveScenario(householdId: string, levers: ScenarioLevers) {
  const name = levers.name.trim() || "Untitled scenario";

  const scenario = await prisma.planScenario.create({
    data: {
      householdId,
      name,
      kind: "whatif",
      note: levers.note.trim() || null,
      retirementSpendingCents:
        levers.retirementSpendingCents === null ? null : BigInt(Math.round(levers.retirementSpendingCents)),
      realReturnPct: levers.realReturnPct,
      members: {
        create: levers.members.map((m) => ({
          memberId: m.memberId,
          retirementAge: m.retirementAge,
          ssClaimAge: m.ssClaimAge,
          ssMonthlyBenefitCents:
            m.ssMonthlyBenefitCents === null ? null : BigInt(Math.round(m.ssMonthlyBenefitCents)),
          annualSavingsCents:
            m.annualSavingsCents === null ? null : BigInt(Math.round(m.annualSavingsCents)),
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
