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
import { RecentsWidget } from "@/components/widgets/recents-widget";
import { NotesWidget } from "@/components/widgets/notes-widget";
import { formatPercent } from "@/lib/format/percent";
import { formatShortDate } from "@/lib/format/date";
import { WidgetGrid } from "@/components/widgets/widget-grid";
import { DEFAULT_LAYOUT, sanitizeLayout, type WidgetId } from "@/components/widgets/catalog";
import { CURRENT_ADVISOR_NAME } from "@/lib/current-advisor";

/** Matches the "At risk" saved view's own threshold on the Clients page —
 * see clients-table.tsx's DRIFT_ALERT_THRESHOLD. */
const DRIFT_ALERT_THRESHOLD = 4;

export const dynamic = "force-dynamic";

export default async function TodayPage() {
  const [households, prospects, openInsights, savedLayout] = await Promise.all([
    prisma.household.findMany({ orderBy: { nextReviewDate: "asc" } }),
    prisma.prospect.findMany(),
    prisma.insight.findMany({
      where: { dismissed: false },
      include: { household: { select: { name: true } } },
      take: 3,
    }),
    // The advisor's own arrangement, if they've made one. A row that fails
    // to parse falls back to the default rather than breaking the page.
    prisma.dashboardLayout.findFirst({
      where: { advisor: { name: CURRENT_ADVISOR_NAME } },
      select: { layoutJson: true },
    }),
  ]);

  let layout = DEFAULT_LAYOUT;
  if (savedLayout) {
    try {
      const parsed = sanitizeLayout(JSON.parse(savedLayout.layoutJson));
      if (parsed && parsed.length > 0) layout = parsed;
    } catch {
      // Keep the default; a corrupt row shouldn't cost the advisor Today.
    }
  }

  const agenda = households.slice(0, 3).map((h) => ({
    id: h.id,
    name: h.name,
    date: h.nextReviewDate,
    readiness: (h.planHealthPct >= 80 ? "ready" : h.planHealthPct >= 60 ? "partial" : "not-started") as
      | "ready"
      | "partial"
      | "not-started",
  }));

  const alerts = households
    .filter((h) => h.driftPct >= DRIFT_ALERT_THRESHOLD || h.reviewStatus === "overdue")
    .slice(0, 4)
    .map((h) => ({
      id: h.id,
      householdId: h.id,
      text:
        h.driftPct >= DRIFT_ALERT_THRESHOLD
          ? `Drift ${formatPercent(h.driftPct)} over target — ${h.name}`
          : `Review overdue — ${h.name}`,
    }));

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

  const totalAum = households.reduce((sum, h) => sum + h.aumCents, 0);
  const monthlyFlow = Math.round(households.reduce((sum, h) => sum + h.balanceContributionsCents, 0) / 12);

  // Widgets are rendered here, on the server, from the one query block
  // above — the grid places them but never fetches for them. Ten client
  // fetches is what CLAUDE.md §5's widget contract eventually wants (each
  // widget owning its data, so one failure is one card); that refactor is
  // still open, and doing it here would have meant rewriting every widget
  // to make them draggable.
  const panels: Partial<Record<WidgetId, React.ReactNode>> = {
    agenda: <AgendaWidget items={agenda} />,
    tasks: (
      <TasksWidget
        items={openInsights.map((i) => ({ id: i.id, householdName: i.household.name, text: i.text }))}
      />
    ),
    alerts: <AlertsWidget items={alerts} />,
    pipeline: <PipelineWidget counts={pipelineCounts} />,
    markets: <MarketsWidget />,
    book: <BookWidget aumCents={totalAum} monthlyFlowCents={monthlyFlow} />,
    reviews: <ReviewsWidget items={overdue} />,
    milestones: (
      <MilestonesWidget
        items={households.slice(0, 2).map((h) => `${h.name} — upcoming age-based milestone`)}
      />
    ),
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
