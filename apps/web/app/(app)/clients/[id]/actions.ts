"use server";

import { prisma } from "@meridian/db";
import { revalidatePath } from "next/cache";

/** Both "Dismiss" and "Accept" resolve an insight the same way for now —
 * dismissals are remembered (CLAUDE.md §6). "Accept" doesn't yet create a
 * follow-up task; there's no Task model in this pass (see PROGRESS.md).
 *
 * Insights render on both the Overview route and the section route they
 * were sourced from, so the caller passes its own pathname and both get
 * revalidated — revalidating only Overview left a dismissed insight
 * showing as still-active on the section page it actually appeared on. */
export async function dismissInsight(insightId: string, sourcePath?: string) {
  const insight = await prisma.insight.update({
    where: { id: insightId },
    data: { dismissed: true },
    select: { householdId: true },
  });
  revalidatePath(`/clients/${insight.householdId}`);
  if (sourcePath) revalidatePath(sourcePath);
}
