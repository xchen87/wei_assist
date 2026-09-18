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
    .filter((h) => h.driftPct >= 3 || h.reviewStatus === "overdue")
    .slice(0, 4)
    .map((h) => ({
      id: h.id,
      householdId: h.id,
      text:
        h.driftPct >= 3
          ? `Drift ${h.driftPct.toFixed(1)}% over target — ${h.name}`
          : `Review overdue — ${h.name}`,
    }));

  const overdue = households
    .filter((h) => h.reviewStatus === "overdue")
    .map((h) => ({ id: h.id, name: h.name, daysOver: h.lastContactDays }));

  const pipelineCounts = prospects.reduce<Record<string, number>>((acc, p) => {
    acc[p.stage] = (acc[p.stage] ?? 0) + 1;
    return acc;
  }, {});

  const totalAum = households.reduce((sum, h) => sum + h.aumCents, 0);
  const monthlyFlow = Math.round(households.reduce((sum, h) => sum + h.balanceContributionsCents, 0) / 12);

  return (
    <div className="mx-auto max-w-[960px] px-10 pb-12 pt-14">
      <PromptZone advisorFirstName="Dana" />

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
