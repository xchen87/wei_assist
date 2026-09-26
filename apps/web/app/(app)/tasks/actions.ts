"use server";

import { prisma } from "@meridian/db";
import { revalidatePath } from "next/cache";

/** Mark a task done, or reopen one. Completing a household task also
 * writes the TaskCompleted entry on its Activity timeline — the timeline is
 * the household's history and a task closing is part of it. Reopening does
 * not remove that entry: the log is append-only (CLAUDE.md §10), and "was
 * marked done, then reopened" is itself true. */
export async function setTaskStatus(taskId: string, status: "open" | "done", sourcePath?: string) {
  const now = new Date();
  const task = await prisma.task.update({
    where: { id: taskId },
    data: { status, completedAt: status === "done" ? now : null },
    select: { householdId: true, title: true },
  });
  if (status === "done" && task.householdId) {
    await prisma.activityEvent.create({
      data: { householdId: task.householdId, kind: "TaskCompleted", label: task.title, detail: null, occurredAt: now },
    });
  }
  revalidatePath("/tasks");
  revalidatePath("/today");
  if (task.householdId) {
    revalidatePath(`/clients/${task.householdId}`);
    revalidatePath(`/clients/${task.householdId}/activity`);
  }
  if (sourcePath) revalidatePath(sourcePath);
}
