/** Shapes and validation for the assistant's scheduling proposals
 * (M-assist item 4, D-036). Pure: the tool runners and the confirmation
 * actions both validate through here, so what the model may propose and
 * what the advisor may confirm are the same rules, checked twice — once
 * when proposed, once when the edited card comes back. */

export type ProposalSubject = { type: "household" | "prospect"; id: string; name: string };

export type MeetingProposal = {
  kind: "meeting";
  subject: ProposalSubject;
  meetingKind: string;
  title: string;
  /** ISO instants, UTC (D-034's fixture convention). */
  startsAt: string;
  endsAt: string;
  location: string | null;
  /** A drafted note to the household, in the advisor's voice. Filed, never sent. */
  note: string | null;
  /** Why the assistant is proposing this — shown on the card. */
  reason: string;
};

export type TaskProposal = {
  kind: "task";
  subject: ProposalSubject | null;
  title: string;
  detail: string | null;
  /** YYYY-MM-DD or null. */
  dueAt: string | null;
  priority: "high" | "normal" | "low";
  reason: string;
  alertId: string | null;
  insightId: string | null;
};

export const MEETING_KINDS = ["Review", "Check-in", "Planning", "Discovery", "Proposal", "Signing", "Internal"] as const;
export const LOCATIONS = ["Video", "Office", "Phone"] as const;
export const PRIORITIES = ["high", "normal", "low"] as const;
export const DURATION_MIN = 15;
export const DURATION_MAX = 240;
export const NOTE_MAX = 1200;
export const TITLE_MAX = 120;

export type Parsed<T> = { ok: true; value: T } | { ok: false; error: string };

export type MeetingFields = {
  meetingKind: (typeof MEETING_KINDS)[number];
  startsAt: Date;
  endsAt: Date;
  location: (typeof LOCATIONS)[number] | null;
  note: string | null;
  title: string | null;
  reason: string;
};

/** Validates the time and shape of a meeting. The subject is resolved by
 * the caller, which has the database; this has the rules. */
export function parseMeetingFields(
  input: { kind?: unknown; starts_at?: unknown; duration_min?: unknown; location?: unknown; note?: unknown; title?: unknown; reason?: unknown },
  now: Date,
): Parsed<MeetingFields> {
  const kind = MEETING_KINDS.find((k) => k === input.kind);
  if (!kind) return { ok: false, error: `kind must be one of ${MEETING_KINDS.join(", ")}.` };

  const startsAt = parseInstant(input.starts_at);
  if (startsAt === null) return { ok: false, error: "starts_at must be an ISO 8601 instant, e.g. 2026-09-29T14:00:00Z." };
  if (startsAt === "offset") return { ok: false, error: "starts_at carries a time-zone offset. Pass the starts_at string exactly as find_meeting_slots returned it, ending in Z; do not convert it." };
  if (startsAt.getTime() <= now.getTime()) return { ok: false, error: "starts_at is in the past." };

  const duration = typeof input.duration_min === "number" && Number.isFinite(input.duration_min) ? Math.round(input.duration_min) : 60;
  if (duration < DURATION_MIN || duration > DURATION_MAX) return { ok: false, error: `duration_min must be between ${DURATION_MIN} and ${DURATION_MAX}.` };

  const location = input.location === undefined || input.location === null ? null : LOCATIONS.find((l) => l === input.location);
  if (location === undefined) return { ok: false, error: `location must be one of ${LOCATIONS.join(", ")}, or omitted.` };

  const note = optionalText(input.note, NOTE_MAX);
  if (note.ok === false) return { ok: false, error: `note ${note.error}` };
  const title = optionalText(input.title, TITLE_MAX);
  if (title.ok === false) return { ok: false, error: `title ${title.error}` };
  const reason = optionalText(input.reason, 400);
  if (reason.ok === false) return { ok: false, error: `reason ${reason.error}` };
  if (!reason.value) return { ok: false, error: "reason is required: say why this meeting, in one sentence." };

  return {
    ok: true,
    value: {
      meetingKind: kind,
      startsAt,
      endsAt: new Date(startsAt.getTime() + duration * 60_000),
      location,
      note: note.value,
      title: title.value,
      reason: reason.value,
    },
  };
}

export type TaskFields = {
  title: string;
  detail: string | null;
  dueAt: Date | null;
  priority: (typeof PRIORITIES)[number];
  reason: string;
};

export function parseTaskFields(
  input: { title?: unknown; detail?: unknown; due_at?: unknown; priority?: unknown; reason?: unknown },
  now: Date,
): Parsed<TaskFields> {
  const title = optionalText(input.title, 140);
  if (title.ok === false) return { ok: false, error: `title ${title.error}` };
  if (!title.value) return { ok: false, error: "title is required." };

  const detail = optionalText(input.detail, 600);
  if (detail.ok === false) return { ok: false, error: `detail ${detail.error}` };

  let dueAt: Date | null = null;
  if (input.due_at !== undefined && input.due_at !== null && input.due_at !== "") {
    if (typeof input.due_at !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(input.due_at)) return { ok: false, error: "due_at must be YYYY-MM-DD or omitted." };
    dueAt = new Date(`${input.due_at}T00:00:00Z`);
    if (Number.isNaN(dueAt.getTime())) return { ok: false, error: "due_at is not a real date." };
    const today = Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate());
    if (dueAt.getTime() < today) return { ok: false, error: "due_at is in the past; a new task cannot start overdue." };
  }

  const priority = input.priority === undefined || input.priority === null ? "normal" : PRIORITIES.find((p) => p === input.priority);
  if (!priority) return { ok: false, error: `priority must be one of ${PRIORITIES.join(", ")}.` };

  const reason = optionalText(input.reason, 400);
  if (reason.ok === false) return { ok: false, error: `reason ${reason.error}` };
  if (!reason.value) return { ok: false, error: "reason is required: say why this task, in one sentence." };

  return { ok: true, value: { title: title.value, detail: detail.value, dueAt, priority, reason: reason.value } };
}

/** Parses an ISO 8601 date-time the way this app means it. Times in
 * Meridian are UTC-as-practice-local (D-034), so a string with no zone
 * designator — "2026-09-28T13:00:00" — is read as UTC, never as the
 * server's local zone, which is what `new Date(string)` would do and what
 * turned a 1pm slot into 8pm on a Pacific-time server. An explicit non-UTC
 * offset is refused ("offset") rather than converted: the model has no
 * basis for one, and honouring it would silently move the meeting.
 * Returns null when the string is not a date-time at all. */
export function parseInstant(value: unknown): Date | null | "offset" {
  if (typeof value !== "string") return null;
  const v = value.trim();
  const m = /^(\d{4}-\d{2}-\d{2})(?:[T ](\d{2}:\d{2})(?::(\d{2})(?:\.\d{1,3})?)?)?(Z|z|[+-]\d{2}:?\d{2})?$/.exec(v);
  if (!m) return null;
  const [, date, hm = "00:00", sec = "00", zone] = m;
  if (zone && zone.toUpperCase() !== "Z" && !/^[+-]00:?00$/.test(zone)) return "offset";
  const d = new Date(`${date}T${hm}:${sec}Z`);
  return Number.isNaN(d.getTime()) ? null : d;
}

function optionalText(v: unknown, max: number): { ok: true; value: string | null } | { ok: false; error: string } {
  if (v === undefined || v === null) return { ok: true, value: null };
  if (typeof v !== "string") return { ok: false, error: "must be a string." };
  const t = v.trim();
  if (!t) return { ok: true, value: null };
  if (t.length > max) return { ok: false, error: `is longer than ${max} characters.` };
  return { ok: true, value: t };
}

/** The title a meeting gets when the model did not supply one. */
export function defaultMeetingTitle(subjectName: string, kind: string): string {
  const label: Record<string, string> = {
    Review: "review",
    "Check-in": "check-in call",
    Planning: "planning session",
    Discovery: "discovery meeting",
    Proposal: "proposal walkthrough",
    Signing: "agreement signing",
    Internal: "internal",
  };
  return `${subjectName} — ${label[kind] ?? kind.toLowerCase()}`;
}
