"use server";

import { prisma } from "@meridian/db";
import { revalidatePath } from "next/cache";
import { parseTaskFields, type TaskProposal } from "@/lib/ai/proposals";
import { CURRENT_ADVISOR_NAME } from "@/lib/current-advisor";

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

export type TaskEdits = { title: string; dueAt: string | null; priority: string };

/** The only way a task the assistant proposed reaches the worklist. The
 * card is editable, so the edited fields are validated again here. */
export async function addProposedTask(
  proposal: TaskProposal,
  edits: TaskEdits,
  conversationId: string | null,
): Promise<{ ok: true; taskId: string } | { ok: false; error: string }> {
  const parsed = parseTaskFields({ title: edits.title, detail: proposal.detail ?? undefined, due_at: edits.dueAt ?? undefined, priority: edits.priority, reason: proposal.reason }, new Date());
  if (!parsed.ok) return { ok: false, error: parsed.error };
  const f = parsed.value;

  const advisor = await prisma.advisor.findFirst({ where: { name: CURRENT_ADVISOR_NAME }, select: { id: true } });
  if (!advisor) return { ok: false, error: "No signed-in advisor." };

  if (proposal.subject) {
    const exists =
      proposal.subject.type === "household"
        ? await prisma.household.findUnique({ where: { id: proposal.subject.id }, select: { id: true } })
        : await prisma.prospect.findUnique({ where: { id: proposal.subject.id }, select: { id: true } });
    if (!exists) return { ok: false, error: `That ${proposal.subject.type} no longer exists.` };
  }

  const task = await prisma.task.create({
    data: {
      advisorId: advisor.id,
      householdId: proposal.subject?.type === "household" ? proposal.subject.id : null,
      prospectId: proposal.subject?.type === "prospect" ? proposal.subject.id : null,
      title: f.title,
      detail: f.detail,
      dueAt: f.dueAt,
      priority: f.priority,
      status: "open",
      source: proposal.alertId ? "alert" : proposal.insightId ? "insight" : "assistant",
      alertId: proposal.alertId,
      insightId: proposal.insightId,
    },
    select: { id: true },
  });

  if (conversationId) {
    await prisma.aiToolCall.create({
      data: { conversationId, toolName: "confirm_task", inputJson: JSON.stringify(edits), recordIds: task.id, ok: true, durationMs: 0 },
    });
  }

  revalidatePath("/tasks");
  revalidatePath("/today");
  if (proposal.subject?.type === "household") revalidatePath(`/clients/${proposal.subject.id}`);
  return { ok: true, taskId: task.id };
}
