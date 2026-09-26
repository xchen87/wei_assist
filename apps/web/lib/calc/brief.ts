/** The daily brief: what needs the advisor's attention today, ranked, with
 * the reason for each line in that record's own figures (M-assist item 3,
 * D-035).
 *
 * Pure, like the rest of lib/calc. The Today widget and the assistant's
 * get_agenda tool both call this with the same inputs, so "what should I do
 * first?" gets one answer whether it is read or asked.
 *
 * Ranking is a plain score per line, set out in SCORE below so it can be
 * read and argued with. The order of the bands is the order an advisor
 * would triage in: a meeting in a few hours they are not ready for, then
 * signals the engine raised with a stated reason, then reviews the record
 * says are owed with nothing booked, then work past its date, then a
 * prospect going cold, then a milestone approaching. Inside a band, the
 * more overdue or the more severe, the higher — and the bands overlap at
 * their edges on purpose: a prospect stalled for a month outranks a task
 * a few days late, and a review half a year overdue outranks a medium
 * signal. Nothing here suppresses a line: the brief reorders, it never
 * hides. */

import { calendarDaysBetween, utcDayStart } from "@/lib/agenda";

export type BriefKind =
  | "meeting-prep"
  | "alert"
  | "review-unbooked"
  | "task-overdue"
  | "prospect-stalled"
  | "drift"
  | "milestone";

export type BriefSeverity = "high" | "medium" | "low";

export type BriefItem = {
  /** Stable across renders: `${kind}:${recordId}`. */
  id: string;
  kind: BriefKind;
  score: number;
  severity: BriefSeverity;
  /** Who this is about. */
  subject: string;
  householdId: string | null;
  prospectId: string | null;
  /** What, in one line. */
  title: string;
  /** Why it is on the list, in the record's own figures. */
  why: string;
  /** A prompt to consider, never an instruction (CLAUDE.md §9 rule 4). */
  nextStep: string;
  /** Where to act on it. */
  href: string;
  /** The record this line came from, for the assistant's citation. */
  recordId: string;
  recordLabel: string;
};

export type BriefHousehold = {
  id: string;
  name: string;
  segment: string;
  reviewStatus: string;
  nextReviewDate: Date;
  lastContactDays: number;
  planHealthPct: number;
  driftPct: number;
  /** A future Review meeting exists (confirmed or proposed). */
  hasReviewBooked: boolean;
  members: BriefMember[];
};

export type BriefMember = {
  id: string;
  name: string;
  role: string;
  birthDate: Date | null;
};

export type BriefAlert = {
  id: string;
  householdId: string;
  householdName: string;
  severity: string;
  title: string;
  rationale: string;
  suggestedAction: string;
  section: string | null;
};

export type BriefProspect = {
  id: string;
  name: string;
  stage: string;
  daysInStage: number;
  stalled: boolean;
  estValueLabel: string;
  hasMeetingBooked: boolean;
};

export type BriefTask = {
  id: string;
  title: string;
  dueAt: Date | null;
  priority: string;
  householdId: string | null;
  prospectId: string | null;
  subject: string;
};

export type BriefMeeting = {
  id: string;
  title: string;
  startsAt: Date;
  timeLabel: string;
  householdId: string | null;
  householdName: string | null;
  planHealthPct: number | null;
};

export type BriefInput = {
  now: Date;
  households: BriefHousehold[];
  alerts: BriefAlert[];
  prospects: BriefProspect[];
  openTasks: BriefTask[];
  meetingsToday: BriefMeeting[];
  driftThresholdPct: number;
  sectionHref: (householdId: string, section: string | null) => string;
  formatDate: (d: Date) => string;
};

/** The bands, and what moves a line within one. Every number is a rank,
 * not a measurement. */
export const SCORE = {
  meetingPrep: 95,
  alert: { high: 90, medium: 70, low: 50 } as Record<string, number>,
  reviewOverdueBase: 60,
  reviewOverduePerDay: 1 / 3, // 90 days overdue adds 30
  reviewOverdueCap: 90,
  reviewDue: 55,
  taskOverdueBase: 50,
  taskOverduePerDay: 1, // capped at 30 days
  taskOverdueCap: 30,
  taskHighPriority: 5,
  prospectStalledBase: 45,
  prospectStalledPerDay: 1 / 2, // capped at 40 days
  prospectStalledCap: 40,
  drift: 35,
  milestoneBase: 40, // minus the days until it, so nearer is higher
  birthday: 30,
} as const;

const PLAN_READY_PCT = 80;
const MILESTONE_WINDOW_DAYS = 30;
const BIRTHDAY_WINDOW_DAYS = 7;

export function buildBrief(input: BriefInput): BriefItem[] {
  const items: BriefItem[] = [];
  const { now } = input;

  // Meetings today the plan is not ready for.
  for (const m of input.meetingsToday) {
    if (m.householdId === null || m.planHealthPct === null || m.planHealthPct >= PLAN_READY_PCT) continue;
    items.push({
      id: `meeting-prep:${m.id}`,
      kind: "meeting-prep",
      score: SCORE.meetingPrep,
      severity: "high",
      subject: m.householdName ?? m.title,
      householdId: m.householdId,
      prospectId: null,
      title: `Prep before ${m.timeLabel}: ${m.title}`,
      why: `Plan health is ${m.planHealthPct}%, below the ${PLAN_READY_PCT}% the readiness dot calls ready.`,
      nextStep: "Open the Overview and the sections with the lowest completeness before the meeting.",
      href: `/clients/${m.householdId}`,
      recordId: m.id,
      recordLabel: `${m.timeLabel} · ${m.title}`,
    });
  }

  // Signals the engine raised. These already know why.
  const householdsWithAlerts = new Set<string>();
  for (const a of input.alerts) {
    householdsWithAlerts.add(a.householdId);
    const severity: BriefSeverity = a.severity === "high" ? "high" : a.severity === "medium" ? "medium" : "low";
    items.push({
      id: `alert:${a.id}`,
      kind: "alert",
      score: SCORE.alert[a.severity] ?? SCORE.alert.low!,
      severity,
      subject: a.householdName,
      householdId: a.householdId,
      prospectId: null,
      title: a.title,
      why: a.rationale,
      nextStep: a.suggestedAction,
      href: input.sectionHref(a.householdId, a.section),
      recordId: a.id,
      recordLabel: `${a.householdName} · ${a.title}`,
    });
  }

  // Reviews the record says are owed, with nothing on the calendar.
  for (const h of input.households) {
    if (h.hasReviewBooked || (h.reviewStatus !== "overdue" && h.reviewStatus !== "due")) continue;
    const daysPast = -calendarDaysBetween(now, h.nextReviewDate);
    const overdue = h.reviewStatus === "overdue";
    const score = overdue
      ? Math.min(SCORE.reviewOverdueBase + Math.max(daysPast, 0) * SCORE.reviewOverduePerDay, SCORE.reviewOverdueCap)
      : SCORE.reviewDue;
    items.push({
      id: `review-unbooked:${h.id}`,
      kind: "review-unbooked",
      score,
      severity: overdue && daysPast > 30 ? "high" : overdue ? "medium" : "low",
      subject: h.name,
      householdId: h.id,
      prospectId: null,
      title: overdue ? `Review ${daysPast}d overdue, nothing booked` : "Review due, nothing booked",
      why: `Review was due ${input.formatDate(h.nextReviewDate)}; last contact ${h.lastContactDays}d ago; no review on the calendar.`,
      nextStep: "Offer the household two or three times for a review.",
      href: `/clients/${h.id}`,
      recordId: h.id,
      recordLabel: `${h.name} · review ${input.formatDate(h.nextReviewDate)}`,
    });
  }

  // Tasks past their date.
  for (const t of input.openTasks) {
    if (t.dueAt === null) continue;
    const daysOver = -calendarDaysBetween(now, t.dueAt);
    if (daysOver <= 0) continue;
    const score =
      SCORE.taskOverdueBase +
      Math.min(daysOver, SCORE.taskOverdueCap) * SCORE.taskOverduePerDay +
      (t.priority === "high" ? SCORE.taskHighPriority : 0);
    items.push({
      id: `task-overdue:${t.id}`,
      kind: "task-overdue",
      score,
      severity: daysOver > 14 || t.priority === "high" ? "medium" : "low",
      subject: t.subject,
      householdId: t.householdId,
      prospectId: t.prospectId,
      title: t.title,
      why: `Due ${input.formatDate(t.dueAt)}, ${daysOver}d ago${t.priority === "high" ? "; marked high priority" : ""}.`,
      nextStep: "Do it, reschedule it, or drop it — an overdue task that stays overdue stops meaning anything.",
      href: "/tasks?due=overdue",
      recordId: t.id,
      recordLabel: `Task · ${t.title}`,
    });
  }

  // Prospects going cold.
  for (const p of input.prospects) {
    if (!p.stalled) continue;
    const score = SCORE.prospectStalledBase + Math.min(p.daysInStage, SCORE.prospectStalledCap) * SCORE.prospectStalledPerDay;
    items.push({
      id: `prospect-stalled:${p.id}`,
      kind: "prospect-stalled",
      score,
      severity: p.daysInStage > 21 ? "medium" : "low",
      subject: p.name,
      householdId: null,
      prospectId: p.id,
      title: `${p.stage} stalled ${p.daysInStage}d`,
      why: `${p.daysInStage} days at ${p.stage}, ${p.estValueLabel} estimated, ${p.hasMeetingBooked ? "a meeting is booked" : "nothing booked"}.`,
      nextStep: p.hasMeetingBooked ? "Confirm the meeting still stands." : "A short note asking whether the timing still works.",
      href: "/prospects",
      recordId: p.id,
      recordLabel: `${p.name} · ${p.stage}`,
    });
  }

  // Drift past the line, where no signal has already said so.
  for (const h of input.households) {
    if (h.driftPct < input.driftThresholdPct || householdsWithAlerts.has(h.id)) continue;
    items.push({
      id: `drift:${h.id}`,
      kind: "drift",
      score: SCORE.drift,
      severity: "low",
      subject: h.name,
      householdId: h.id,
      prospectId: null,
      title: `Drift ${h.driftPct.toFixed(1)}% from target`,
      why: `Past the ${input.driftThresholdPct}% line the Clients list flags at.`,
      nextStep: "Worth a look at Allocation before the next conversation.",
      href: input.sectionHref(h.id, "allocation"),
      recordId: h.id,
      recordLabel: `${h.name} · drift ${h.driftPct.toFixed(1)}%`,
    });
  }

  // Age-based milestones and birthdays close enough to act on.
  for (const h of input.households) {
    for (const ms of upcomingMilestones(h.members, now, MILESTONE_WINDOW_DAYS, BIRTHDAY_WINDOW_DAYS)) {
      const isBirthday = ms.kind === "birthday";
      items.push({
        id: `milestone:${ms.memberId}:${ms.kind}`,
        kind: "milestone",
        score: isBirthday ? SCORE.birthday : SCORE.milestoneBase - ms.inDays,
        severity: "low",
        subject: h.name,
        householdId: h.id,
        prospectId: null,
        title: isBirthday ? `${ms.memberName} has a birthday ${inDaysLabel(ms.inDays)}` : `${ms.memberName} turns ${ms.age} ${inDaysLabel(ms.inDays)}`,
        why: isBirthday
          ? `Turns ${ms.age} on ${input.formatDate(ms.date)}.`
          : `${ms.age} on ${input.formatDate(ms.date)} — an age-based planning trigger.`,
        nextStep: isBirthday ? "A good moment for a call." : "Worth confirming what changes at this age with the household and their tax adviser.",
        href: `/clients/${h.id}/household`,
        recordId: ms.memberId,
        recordLabel: `${h.name} · ${ms.memberName}`,
      });
    }
  }

  return items.sort((a, b) => b.score - a.score || a.subject.localeCompare(b.subject) || a.title.localeCompare(b.title));
}

// ---------------------------------------------------------------------------
// Milestones

export type Milestone = {
  memberId: string;
  memberName: string;
  kind: "birthday" | "age-trigger";
  age: number;
  date: Date;
  inDays: number;
};

/** The age-based triggers CLAUDE.md §5 names for the Milestones widget.
 * Ages only — what each one means is for the advisor and the household's
 * tax adviser to say, not this file (§13). 59.5 is the half-birthday. */
export const AGE_TRIGGERS = [59.5, 65, 73] as const;

/** Birthdays inside `birthdayWindowDays` and age triggers inside
 * `triggerWindowDays`, soonest first. A trigger that is also a birthday
 * (65, 73) is reported once, as the trigger. */
export function upcomingMilestones(
  members: BriefMember[],
  now: Date,
  triggerWindowDays: number,
  birthdayWindowDays: number,
): Milestone[] {
  const today = utcDayStart(now);
  const out: Milestone[] = [];
  for (const m of members) {
    if (!m.birthDate) continue;
    const dob = m.birthDate;
    const triggerDates = new Set<number>();

    for (const age of AGE_TRIGGERS) {
      const date = addYears(dob, age);
      const inDays = calendarDaysBetween(today, date);
      if (inDays < 0 || inDays > triggerWindowDays) continue;
      triggerDates.add(utcDayStart(date).getTime());
      out.push({ memberId: m.id, memberName: m.name, kind: "age-trigger", age, date, inDays });
    }

    const next = nextBirthday(dob, today);
    const inDays = calendarDaysBetween(today, next.date);
    if (inDays <= birthdayWindowDays && !triggerDates.has(utcDayStart(next.date).getTime())) {
      out.push({ memberId: m.id, memberName: m.name, kind: "birthday", age: next.turning, date: next.date, inDays });
    }
  }
  return out.sort((a, b) => a.inDays - b.inDays);
}

/** dob + whole or half years, on UTC calendar days. Feb 29 resolves to
 * Mar 1 in a non-leap year, the usual convention. */
function addYears(dob: Date, years: number): Date {
  const whole = Math.floor(years);
  const half = years - whole >= 0.5;
  const d = new Date(Date.UTC(dob.getUTCFullYear() + whole, dob.getUTCMonth() + (half ? 6 : 0), dob.getUTCDate()));
  return d;
}

function nextBirthday(dob: Date, today: Date): { date: Date; turning: number } {
  let year = today.getUTCFullYear();
  let date = new Date(Date.UTC(year, dob.getUTCMonth(), dob.getUTCDate()));
  if (date.getTime() < today.getTime()) {
    year += 1;
    date = new Date(Date.UTC(year, dob.getUTCMonth(), dob.getUTCDate()));
  }
  return { date, turning: year - dob.getUTCFullYear() };
}

function inDaysLabel(days: number): string {
  if (days === 0) return "today";
  if (days === 1) return "tomorrow";
  return `in ${days} days`;
}

/** For the Today widget's "N more" line and the tool's summary. */
export function countBySeverity(items: BriefItem[]): Record<BriefSeverity, number> {
  const out: Record<BriefSeverity, number> = { high: 0, medium: 0, low: 0 };
  for (const i of items) out[i.severity] += 1;
  return out;
}
