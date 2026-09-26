import { prisma } from "@meridian/db";
import { PromptZone } from "@/components/widgets/prompt-zone";
import { AgendaWidget } from "@/components/widgets/agenda-widget";
import { TasksWidget } from "@/components/widgets/tasks-widget";
import { AlertsWidget } from "@/components/widgets/alerts-widget";
import { PipelineWidget } from "@/components/widgets/pipeline-widget";
import { MarketsWidget } from "@/components/widgets/markets-widget";
import { BookWidget } from "@/components/widgets/book-widget";
import { ReviewsWidget } from "@/components/widgets/reviews-widget";
import { MilestonesWidget } from "@/components/widgets/milestones-widget";
import { BRIEF_PROMPT, BriefWidget } from "@/components/widgets/brief-widget";
import { loadBrief } from "@/lib/brief";
import { upcomingMilestones } from "@/lib/calc/brief";
import { RecentsWidget } from "@/components/widgets/recents-widget";
import { NotesWidget } from "@/components/widgets/notes-widget";
import { formatPercent } from "@/lib/format/percent";
import { centsToNumber } from "@/lib/format/money";
import { formatShortDate, formatTime } from "@/lib/format/date";
import { DAY_MS, compareByDue, dayHeading, describeDue, readinessTone, utcDayStart } from "@/lib/agenda";
import { bySeverity } from "@/lib/calc/signals";
import { WidgetGrid } from "@/components/widgets/widget-grid";
import { DEFAULT_LAYOUT, sanitizeLayout, type WidgetId } from "@/components/widgets/catalog";
import { CURRENT_ADVISOR_NAME } from "@/lib/current-advisor";

/** Matches the "At risk" saved view's own threshold on the Clients page —
 * see clients-table.tsx's DRIFT_ALERT_THRESHOLD. */
const DRIFT_ALERT_THRESHOLD = 4;

export const dynamic = "force-dynamic";

export default async function TodayPage() {
  const now = new Date();
  const todayStart = utcDayStart(now);
  const dayAfterTomorrow = new Date(todayStart.getTime() + 2 * DAY_MS);
  // The signed-in advisor's own calendar and worklist. Every other widget
  // reads the whole book; these two are personal by nature.
  const me = { advisor: { name: CURRENT_ADVISOR_NAME } };
  const meetingInclude = {
    household: { select: { id: true, name: true, planHealthPct: true } },
    prospect: { select: { id: true, name: true } },
  } as const;

  const [households, prospects, meetings, nextMeeting, openTasks, openAlerts, savedLayout, brief, members] = await Promise.all([
    prisma.household.findMany({ orderBy: { nextReviewDate: "asc" } }),
    prisma.prospect.findMany(),
    prisma.meeting.findMany({
      where: { ...me, status: { in: ["confirmed", "proposed"] }, startsAt: { gte: todayStart, lt: dayAfterTomorrow } },
      include: meetingInclude,
      orderBy: { startsAt: "asc" },
    }),
    prisma.meeting.findFirst({
      where: { ...me, status: { in: ["confirmed", "proposed"] }, startsAt: { gte: dayAfterTomorrow } },
      include: meetingInclude,
      orderBy: { startsAt: "asc" },
    }),
    prisma.task.findMany({
      where: { ...me, status: "open" },
      include: { household: { select: { id: true, name: true } }, prospect: { select: { name: true } } },
    }),
    // The advisor's own arrangement, if they've made one. A row that fails
    // to parse falls back to the default rather than breaking the page.
    prisma.alert.findMany({
      where: { status: "open" },
      include: { household: { select: { id: true, name: true } } },
      orderBy: { createdAt: "desc" },
    }),
    prisma.dashboardLayout.findFirst({
      where: { advisor: { name: CURRENT_ADVISOR_NAME } },
      select: { layoutJson: true },
    }),
    loadBrief(now),
    prisma.member.findMany({
      where: { birthDate: { not: null } },
      select: { id: true, name: true, role: true, birthDate: true, household: { select: { id: true, name: true } } },
    }),
  ]);

  // Birthdays in the next 30 days and age triggers in the next 60, from
  // real dates of birth, soonest first.
  const milestones = members
    .flatMap((m) =>
      upcomingMilestones([m], now, 60, 30).map((ms) => ({
        id: `${ms.memberId}:${ms.kind}`,
        href: `/clients/${m.household.id}/household`,
        householdName: m.household.name,
        inDays: ms.inDays,
        trigger: ms.kind === "age-trigger",
        text:
          ms.kind === "age-trigger"
            ? `${ms.memberName} turns ${ms.age} ${ms.inDays === 0 ? "today" : ms.inDays === 1 ? "tomorrow" : `in ${ms.inDays} days`}`
            : `${ms.memberName}'s birthday ${ms.inDays === 0 ? "today" : ms.inDays === 1 ? "tomorrow" : `in ${ms.inDays} days`}`,
      })),
    )
    .sort((a, b) => a.inDays - b.inDays)
    .slice(0, 8);

  let layout = DEFAULT_LAYOUT;
  if (savedLayout) {
    try {
      const parsed = sanitizeLayout(JSON.parse(savedLayout.layoutJson));
      if (parsed && parsed.length > 0) layout = parsed;
    } catch {
      // Keep the default; a corrupt row shouldn't cost the advisor Today.
    }
  }

  const agenda = meetings.map((m) => ({
    id: m.id,
    href: m.household ? `/clients/${m.household.id}` : "/prospects",
    day: dayHeading(m.startsAt, now, formatShortDate),
    time: formatTime(m.startsAt),
    title: m.title,
    kind: m.kind,
    tone: m.household ? readinessTone(m.household.planHealthPct) : ("pine" as const),
  }));
  const nextUp = nextMeeting
    ? {
        href: nextMeeting.household ? `/clients/${nextMeeting.household.id}` : "/prospects",
        when: `${formatShortDate(nextMeeting.startsAt)} at ${formatTime(nextMeeting.startsAt)}`,
        title: nextMeeting.title,
      }
    : null;

  const TASKS_SHOWN = 6;
  const tasks = [...openTasks]
    .sort(compareByDue)
    .slice(0, TASKS_SHOWN)
    .map((t) => ({
      id: t.id,
      subject: t.household?.name ?? t.prospect?.name ?? "Your own",
      href: t.household ? `/clients/${t.household.id}` : t.prospect ? "/prospects" : null,
      title: t.title,
      due: describeDue(t.dueAt, now, formatShortDate),
    }));

  // Signals the engine raised come first: those know which household and
  // why. The inline drift and overdue conditions fill the rest of the card
  // so it still says something useful before any scenario has been run.
  const alerts = [
    ...[...openAlerts].sort(bySeverity).map((a) => ({
      id: a.id,
      householdId: a.household.id,
      householdName: a.household.name,
      severity: a.severity,
      title: a.title,
      source: "Signals",
    })),
    ...households
      .filter((h) => h.driftPct >= DRIFT_ALERT_THRESHOLD || h.reviewStatus === "overdue")
      .map((h) => ({
        id: `inline-${h.id}`,
        householdId: h.id,
        householdName: h.name,
        severity: h.driftPct >= DRIFT_ALERT_THRESHOLD ? "medium" : "low",
        title:
          h.driftPct >= DRIFT_ALERT_THRESHOLD
            ? `Drift ${formatPercent(h.driftPct)} over target`
            : "Review overdue",
        source: "Clients list",
      })),
  ].slice(0, 6);

  const overdue = households
    .filter((h) => h.reviewStatus === "overdue")
    .map((h) => ({ id: h.id, name: h.name, daysOver: h.lastContactDays }));

  const pipelineCounts = prospects.reduce<Record<string, number>>((acc, p) => {
    acc[p.stage] = (acc[p.stage] ?? 0) + 1;
    return acc;
  }, {});

  // Suggestion chips, built from this book rather than hardcoded
  // (CLAUDE.md §5). Each one names something that is actually true right
  // now — the household whose review is next, the households that really
  // have drifted, the one that is most overdue — so a chip never invites a
  // question the data can't answer.
  const nextReview = households.find((h) => h.reviewStatus !== "overdue");
  const mostOverdue = households
    .filter((h) => h.reviewStatus === "overdue")
    .sort((a, b) => b.lastContactDays - a.lastContactDays)[0];
  const drifted = households.filter((h) => h.driftPct >= DRIFT_ALERT_THRESHOLD);
  const worstPlanHealth = [...households].sort((a, b) => a.planHealthPct - b.planHealthPct)[0];

  // "the The Whitakers" — household names carry their own article when they
  // have one, so don't add a second.
  const article = (name: string) => (/^the\s/i.test(name) ? "" : "the ");

  const chips = [
    brief.items.length > 0 ? BRIEF_PROMPT : null,
    nextReview
      ? `Prep me for ${article(nextReview.name)}${nextReview.name} review on ${formatShortDate(nextReview.nextReviewDate)}`
      : null,
    mostOverdue ? `What should I raise with ${mostOverdue.name}?` : null,
    drifted.length > 0
      ? `Which ${drifted.length === 1 ? "household has" : `${drifted.length} households have`} drifted past ${formatPercent(DRIFT_ALERT_THRESHOLD, 0)}?`
      : null,
    worstPlanHealth ? `What's missing from ${article(worstPlanHealth.name)}${worstPlanHealth.name} plan?` : null,
  ]
    .filter((c): c is string => c !== null)
    .slice(0, 3);

  const totalAum = households.reduce((sum, h) => sum + centsToNumber(h.aumCents), 0);
  const monthlyFlow = Math.round(
    households.reduce((sum, h) => sum + centsToNumber(h.balanceContributionsCents), 0) / 12,
  );

  // Widgets are rendered here, on the server, from the one query block
  // above — the grid places them but never fetches for them. Ten client
  // fetches is what CLAUDE.md §5's widget contract eventually wants (each
  // widget owning its data, so one failure is one card); that refactor is
  // still open, and doing it here would have meant rewriting every widget
  // to make them draggable.
  const panels: Partial<Record<WidgetId, React.ReactNode>> = {
    brief: <BriefWidget items={brief.items} shown={6} />,
    agenda: <AgendaWidget items={agenda} nextUp={nextUp} />,
    tasks: <TasksWidget items={tasks} openCount={openTasks.length} />,
    alerts: <AlertsWidget items={alerts} />,
    pipeline: <PipelineWidget counts={pipelineCounts} />,
    markets: <MarketsWidget />,
    book: <BookWidget aumCents={totalAum} monthlyFlowCents={monthlyFlow} />,
    reviews: <ReviewsWidget items={overdue} />,
    milestones: <MilestonesWidget items={milestones} />,
    recents: <RecentsWidget items={households.slice(0, 3).map((h) => ({ id: h.id, name: h.name }))} />,
    notes: <NotesWidget />,
  };

  return (
    <div className="mx-auto max-w-[1100px] px-10 pb-12 pt-14">
      <PromptZone advisorFirstName={CURRENT_ADVISOR_NAME.split(" ")[0]!} chips={chips} />
      <WidgetGrid panels={panels} initialLayout={layout} />
    </div>
  );
}
