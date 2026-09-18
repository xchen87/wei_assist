"use server";

import { prisma } from "@meridian/db";
import { revalidatePath } from "next/cache";

/** Both "Dismiss" and "Accept" resolve an insight the same way for now —
 * dismissals are remembered (CLAUDE.md §6). "Accept" doesn't yet create a
 * follow-up task; there's no Task model in this pass (see PROGRESS.md). */
export async function dismissInsight(insightId: string) {
  const insight = await prisma.insight.update({
    where: { id: insightId },
    data: { dismissed: true },
    select: { householdId: true },
  });
  revalidatePath(`/clients/${insight.householdId}`);
}
