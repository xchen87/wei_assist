import { prisma } from "@meridian/db";
import { buildBrief, type BriefItem } from "@/lib/calc/brief";
import { DAY_MS, utcDayStart } from "@/lib/agenda";
import { CURRENT_ADVISOR_NAME } from "@/lib/current-advisor";
import { formatShortDate, formatTime } from "@/lib/format/date";
import { formatMoney } from "@/lib/format/money";
import { sectionPathFromName } from "@/lib/sections";
import { loadPatterns } from "@/lib/patterns";

/** The same threshold the Clients list's "At risk" view and Today's inline
 * alerts use (clients-table.tsx). */
export const DRIFT_ALERT_THRESHOLD = 4;

/** Loads the signed-in advisor's book and hands it to the pure ranker.
 * One loader for the Today widget and the get_agenda tool, so both see the
 * same list in the same order. Scope is the advisor's own households,
 * prospects, tasks and meetings — a brief is personal. */
export async function loadBrief(now: Date = new Date()): Promise<{ items: BriefItem[]; scope: { households: number } }> {
  const todayStart = utcDayStart(now);
  const tomorrowStart = new Date(todayStart.getTime() + DAY_MS);
  const mine = { advisor: { name: CURRENT_ADVISOR_NAME } };

  const advisor = await prisma.advisor.findFirst({ where: mine.advisor, select: { id: true } });
  const [households, alerts, prospects, openTasks, meetingsToday, patterns] = await Promise.all([
    prisma.household.findMany({
      where: mine,
      select: {
        id: true,
        name: true,
        segment: true,
        reviewStatus: true,
        nextReviewDate: true,
        lastContactDays: true,
        planHealthPct: true,
        driftPct: true,
        members: { select: { id: true, name: true, role: true, birthDate: true } },
        meetings: {
          where: { kind: "Review", status: { in: ["confirmed", "proposed"] }, startsAt: { gte: now } },
          select: { id: true },
          take: 1,
        },
      },
    }),
    prisma.alert.findMany({
      where: { status: "open", household: mine },
      select: {
        id: true,
        ruleKey: true,
        householdId: true,
        severity: true,
        title: true,
        rationale: true,
        suggestedAction: true,
        section: true,
        household: { select: { name: true } },
      },
    }),
    prisma.prospect.findMany({
      where: mine,
      select: {
        id: true,
        name: true,
        stage: true,
        daysInStage: true,
        stalled: true,
        estValueCents: true,
        meetings: { where: { status: { in: ["confirmed", "proposed"] }, startsAt: { gte: now } }, select: { id: true }, take: 1 },
      },
    }),
    prisma.task.findMany({
      where: { ...mine, status: "open" },
      select: {
        id: true,
        title: true,
        dueAt: true,
        priority: true,
        householdId: true,
        prospectId: true,
        household: { select: { name: true } },
        prospect: { select: { name: true } },
      },
    }),
    prisma.meeting.findMany({
      where: { ...mine, status: { in: ["confirmed", "proposed"] }, startsAt: { gte: todayStart, lt: tomorrowStart } },
      select: { id: true, title: true, startsAt: true, householdId: true, household: { select: { name: true, planHealthPct: true } } },
      orderBy: { startsAt: "asc" },
    }),
    advisor ? loadPatterns(advisor.id, now) : Promise.resolve(null),
  ]);

  const items = buildBrief({
    now,
    households: households.map((h) => ({
      id: h.id,
      name: h.name,
      segment: h.segment,
      reviewStatus: h.reviewStatus,
      nextReviewDate: h.nextReviewDate,
      lastContactDays: h.lastContactDays,
      planHealthPct: h.planHealthPct,
      driftPct: h.driftPct,
      hasReviewBooked: h.meetings.length > 0,
      members: h.members,
    })),
    alerts: alerts.map((a) => ({
      id: a.id,
      ruleKey: a.ruleKey,
      householdId: a.householdId,
      householdName: a.household.name,
      severity: a.severity,
      title: a.title,
      rationale: a.rationale,
      suggestedAction: a.suggestedAction,
      section: a.section,
    })),
    prospects: prospects.map((p) => ({
      id: p.id,
      name: p.name,
      stage: p.stage,
      daysInStage: p.daysInStage,
      stalled: p.stalled,
      estValueLabel: formatMoney(p.estValueCents, { compact: true }),
      hasMeetingBooked: p.meetings.length > 0,
    })),
    openTasks: openTasks.map((t) => ({
      id: t.id,
      title: t.title,
      dueAt: t.dueAt,
      priority: t.priority,
      householdId: t.householdId,
      prospectId: t.prospectId,
      subject: t.household?.name ?? t.prospect?.name ?? "Your own",
    })),
    meetingsToday: meetingsToday.map((m) => ({
      id: m.id,
      title: m.title,
      startsAt: m.startsAt,
      timeLabel: formatTime(m.startsAt),
      householdId: m.householdId,
      householdName: m.household?.name ?? null,
      planHealthPct: m.household?.planHealthPct ?? null,
    })),
    driftThresholdPct: DRIFT_ALERT_THRESHOLD,
    alertRules: patterns?.alertRules,
    sectionHref: (householdId, section) => (section ? sectionPathFromName(householdId, section) : null) ?? `/clients/${householdId}`,
    formatDate: formatShortDate,
  });

  return { items, scope: { households: households.length } };
}
