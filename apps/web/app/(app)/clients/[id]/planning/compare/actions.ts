"use server";

import { prisma } from "@meridian/db";
import { revalidatePath } from "next/cache";
import { LEVER_BY_KEY } from "@/lib/planning/adjustments";

/**
 * Applying a suggestion the advisor accepted.
 *
 * The assistant proposes; this is the confirmation half (CLAUDE.md §9
 * rule 3). It writes onto the scenario, never onto the plan of record —
 * a suggestion is something to test, and the record only changes when the
 * advisor changes it themselves.
 *
 * The lever catalogue is re-checked here rather than trusted from the
 * client: the card came from a model, went through a browser, and is
 * about to become a database write.
 */
export async function applyAdjustment(
  householdId: string,
  scenarioId: string,
  levers: { key: string; memberName: string | null; value: number }[],
): Promise<{ applied: number; refused: string[] }> {
  const scenario = await prisma.planScenario.findFirst({
    where: { id: scenarioId, householdId },
    include: { household: { include: { members: true } } },
  });
  if (!scenario) return { applied: 0, refused: ["That scenario is no longer on file."] };

  const refused: string[] = [];
  let applied = 0;

  for (const lever of levers) {
    const spec = LEVER_BY_KEY.get(lever.key);
    if (!spec) {
      refused.push(`${lever.key} is not a lever on this plan.`);
      continue;
    }
    // storedValue arrived already converted; re-check the range in the
    // unit the advisor saw it in.
    const natural = spec.unit === "dollars" ? lever.value / 100 : lever.value;
    if (!Number.isFinite(natural) || natural < spec.min || natural > spec.max) {
      refused.push(`${spec.label} is out of range.`);
      continue;
    }

    if (spec.scope === "household") {
      const column = spec.unit === "dollars" ? BigInt(Math.round(lever.value)) : lever.value;
      await prisma.planScenario.update({
        where: { id: scenarioId },
        data: { [spec.key]: column },
      });
      applied += 1;
      continue;
    }

    const member = scenario.household.members.find(
      (m) =>
        m.name.toLowerCase() === (lever.memberName ?? "").toLowerCase() ||
        m.name.toLowerCase().split(" ")[0] === (lever.memberName ?? "").toLowerCase().split(" ")[0],
    );
    if (!member) {
      refused.push(`No one called "${lever.memberName}" is in this household.`);
      continue;
    }

    const column = spec.unit === "dollars" ? BigInt(Math.round(lever.value)) : lever.value;
    await prisma.planScenarioMember.upsert({
      where: { scenarioId_memberId: { scenarioId, memberId: member.id } },
      create: { scenarioId, memberId: member.id, [spec.key]: column },
      update: { [spec.key]: column },
    });
    applied += 1;
  }

  revalidatePath(`/clients/${householdId}/planning/compare`);
  revalidatePath(`/clients/${householdId}/planning`);
  return { applied, refused };
}
