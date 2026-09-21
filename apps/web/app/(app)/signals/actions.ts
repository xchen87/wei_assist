"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@meridian/db";
import { rerunLatest, runScenario } from "@/lib/signals/run";

/** "Run now" and the per-alert controls. Running a scenario is a write
 * with an external effect, so it stays a deliberate button press — the
 * assistant can read alerts but cannot fire the engine (CLAUDE.md §9
 * rule 3). */
export async function runScenarioAction(indicatorKey: string, toValue: number, note: string) {
  const result = await runScenario({ indicatorKey, toValue, note });
  revalidatePath("/signals");
  revalidatePath("/today");
  revalidatePath("/clients");
  return result;
}

export async function rerunAction(indicatorKey: string) {
  const result = await rerunLatest(indicatorKey);
  revalidatePath("/signals");
  revalidatePath("/today");
  return result;
}

export async function setAlertStatus(alertId: string, status: "acknowledged" | "dismissed") {
  const alert = await prisma.alert.update({
    where: { id: alertId },
    data: { status },
    select: { householdId: true },
  });
  revalidatePath("/signals");
  revalidatePath("/today");
  revalidatePath(`/clients/${alert.householdId}`);
}
