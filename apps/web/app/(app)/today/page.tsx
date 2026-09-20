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
import { CURRENT_ADVISOR_NAME } from "@/lib/current-advisor";

/** Matches the "At risk" saved view's own threshold on the Clients page —
 * see clients-table.tsx's DRIFT_ALERT_THRESHOLD. */
const DRIFT_ALERT_THRESHOLD = 4;

export const dynamic = "force-dynamic";

export default async function TodayPage() {
  const [households, prospects, openInsights] = await Promise.all([
    prisma.household.findMany({ orderBy: { nextReviewDate: "asc" } }),
    prisma.prospect.findMany(),
    prisma.insight.findMany({
      where: { dismissed: false },
      include: { household: { select: { name: true } } },
      take: 3,
    }),
  ]);

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

  return (
    <div className="mx-auto max-w-[960px] px-10 pb-12 pt-14">
      <PromptZone advisorFirstName={CURRENT_ADVISOR_NAME.split(" ")[0]!} chips={chips} />

      <div className="grid grid-cols-12 gap-4">
        <AgendaWidget items={agenda} />
        <TasksWidget
          items={openInsights.map((i) => ({ id: i.id, householdName: i.household.name, text: i.text }))}
        />
        <AlertsWidget items={alerts} />
        <PipelineWidget counts={pipelineCounts} />
        <MarketsWidget />
        <BookWidget aumCents={totalAum} monthlyFlowCents={monthlyFlow} />
        <ReviewsWidget items={overdue} />
        <MilestonesWidget
          items={households.slice(0, 2).map((h) => `${h.name} — upcoming age-based milestone`)}
        />
        <RecentsWidget items={households.slice(0, 3).map((h) => ({ id: h.id, name: h.name }))} />
        <NotesWidget />
      </div>
    </div>
  );
}
