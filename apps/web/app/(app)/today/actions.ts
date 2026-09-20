"use server";

import { prisma } from "@meridian/db";
import { CURRENT_ADVISOR_NAME } from "@/lib/current-advisor";
import { sanitizeLayout, type WidgetPlacement } from "@/components/widgets/catalog";

/** Layout is saved on drop, not on a Save button — the grid has no "unsaved"
 * state to lose, and an advisor who drags a widget and navigates away should
 * find it where they left it.
 *
 * Every write goes through sanitizeLayout on the server too: the client
 * already clamps, but a layout arriving over the wire is input, and a bad
 * one would wedge the dashboard for that advisor on every subsequent load. */
export async function saveDashboardLayout(layout: WidgetPlacement[]) {
  const clean = sanitizeLayout(layout);
  if (!clean) return;

  const advisor = await prisma.advisor.findFirst({ where: { name: CURRENT_ADVISOR_NAME } });
  if (!advisor) return;

  const layoutJson = JSON.stringify(clean);
  await prisma.dashboardLayout.upsert({
    where: { advisorId: advisor.id },
    create: { advisorId: advisor.id, layoutJson },
    update: { layoutJson },
  });
}

/** Reset drops the row rather than writing the default into it, so an
 * advisor who resets keeps following the default if it ever changes. */
export async function resetDashboardLayout() {
  const advisor = await prisma.advisor.findFirst({ where: { name: CURRENT_ADVISOR_NAME } });
  if (!advisor) return;
  await prisma.dashboardLayout.deleteMany({ where: { advisorId: advisor.id } });
}
