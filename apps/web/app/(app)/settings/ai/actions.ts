"use server";

import { prisma } from "@meridian/db";
import { revalidatePath } from "next/cache";
import { CURRENT_ADVISOR_NAME } from "@/lib/current-advisor";
import { recomputePatterns, resetAdvisorPattern, setAdvisorPattern } from "@/lib/patterns";
import type { AlertRuleValue } from "@/lib/calc/patterns";

async function me(): Promise<string | null> {
  const a = await prisma.advisor.findFirst({ where: { name: CURRENT_ADVISOR_NAME }, select: { id: true } });
  return a?.id ?? null;
}

const done = () => {
  revalidatePath("/settings/ai");
  revalidatePath("/today");
};

export async function recomputePatternsAction() {
  const id = await me();
  if (id) await recomputePatterns(id);
  done();
}

export async function setBookingDaysAction(days: number[]) {
  const id = await me();
  if (!id) return;
  const clean = Array.from(new Set(days.filter((d) => Number.isInteger(d) && d >= 0 && d <= 6))).sort();
  await setAdvisorPattern(id, "booking.weekdays", { kind: "weekdays", days: clean, shareByDay: {} }, "days you book");
  done();
}

export async function setBookingHoursAction(startHours: number[]) {
  const id = await me();
  if (!id) return;
  const clean = Array.from(new Set(startHours.filter((h) => Number.isFinite(h) && h >= 0 && h < 24))).sort((a, b) => a - b);
  await setAdvisorPattern(id, "booking.hours", { kind: "hours", startHours: clean, countByHour: {} }, "start times");
  done();
}

/** Mute means "order lower in the brief", never "hide" (D-037). The
 * current counts are carried over so the row still shows its history. */
export async function setAlertRuleMutedAction(current: AlertRuleValue, muted: boolean) {
  const id = await me();
  if (!id) return;
  await setAdvisorPattern(id, `alert-rule.${current.ruleKey}`, { ...current, muted }, muted ? "ordered lower" : "not muted");
  done();
}

export async function resetPatternAction(key: string) {
  const id = await me();
  if (!id) return;
  await resetAdvisorPattern(id, key);
  done();
}
