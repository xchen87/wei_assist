"use server";

import { prisma } from "@meridian/db";
import { revalidatePath } from "next/cache";
import { conflictWith } from "@/lib/calc/slots";
import { calendar } from "@/lib/integrations";
import { parseMeetingFields, type MeetingProposal } from "@/lib/ai/proposals";
import { CURRENT_ADVISOR_NAME } from "@/lib/current-advisor";

export type MeetingEdits = {
  /** ISO instant, as the card's datetime field produced it. */
  startsAt: string;
  durationMin: number;
  location: string | null;
  note: string | null;
};

/** The only way a meeting the assistant proposed reaches the calendar
 * (CLAUDE.md §9 rule 3). Re-validates everything the tool validated,
 * because the card is editable and the edited values are input again. A
 * drafted outreach note is filed on the household's timeline as a note —
 * filed, never sent. The confirmation is logged as a tool call on the
 * conversation so the interaction log shows both the proposal and what
 * the advisor did with it (§9 rule 5). */
export async function bookProposedMeeting(
  proposal: MeetingProposal,
  edits: MeetingEdits,
  conversationId: string | null,
): Promise<{ ok: true; meetingId: string } | { ok: false; error: string }> {
  const now = new Date();
  const parsed = parseMeetingFields(
    { kind: proposal.meetingKind, starts_at: edits.startsAt, duration_min: edits.durationMin, location: edits.location ?? undefined, note: edits.note ?? undefined, title: proposal.title, reason: proposal.reason },
    now,
  );
  if (!parsed.ok) return { ok: false, error: parsed.error };
  const f = parsed.value;

  const advisor = await prisma.advisor.findFirst({ where: { name: CURRENT_ADVISOR_NAME }, select: { id: true } });
  if (!advisor) return { ok: false, error: "No signed-in advisor." };

  const subjectExists =
    proposal.subject.type === "household"
      ? await prisma.household.findUnique({ where: { id: proposal.subject.id }, select: { id: true } })
      : await prisma.prospect.findUnique({ where: { id: proposal.subject.id }, select: { id: true } });
  if (!subjectExists) return { ok: false, error: `That ${proposal.subject.type} no longer exists.` };

  const busy = await calendar.busy(advisor.id, f.startsAt, f.endsAt);
  const clash = conflictWith({ startsAt: f.startsAt, endsAt: f.endsAt }, busy);
  if (clash) return { ok: false, error: "That time now collides with something already booked. Pick another." };

  const meeting = await prisma.meeting.create({
    data: {
      advisorId: advisor.id,
      householdId: proposal.subject.type === "household" ? proposal.subject.id : null,
      prospectId: proposal.subject.type === "prospect" ? proposal.subject.id : null,
      kind: f.meetingKind,
      title: f.title ?? proposal.title,
      startsAt: f.startsAt,
      endsAt: f.endsAt,
      location: f.location,
      status: "confirmed",
      source: "assistant",
      notes: proposal.reason,
    },
    select: { id: true },
  });

  if (f.note && proposal.subject.type === "household") {
    await prisma.activityEvent.create({
      data: {
        householdId: proposal.subject.id,
        kind: "Note",
        label: `Draft outreach for ${f.title ?? proposal.title} (not sent)`,
        detail: f.note,
        occurredAt: now,
      },
    });
  }

  if (conversationId) {
    await prisma.aiToolCall.create({
      data: { conversationId, toolName: "confirm_meeting", inputJson: JSON.stringify(edits), recordIds: meeting.id, ok: true, durationMs: 0 },
    });
  }

  revalidatePath("/schedule");
  revalidatePath("/today");
  if (proposal.subject.type === "household") {
    revalidatePath(`/clients/${proposal.subject.id}`);
    revalidatePath(`/clients/${proposal.subject.id}/activity`);
  } else {
    revalidatePath("/prospects");
  }
  return { ok: true, meetingId: meeting.id };
}
