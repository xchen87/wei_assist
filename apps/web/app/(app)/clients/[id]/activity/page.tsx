import { notFound } from "next/navigation";
import { prisma } from "@meridian/db";
import { PlanSection } from "@/components/plan/plan-section";
import { SectionActions } from "@/components/plan/section-actions";
import { ActivityTimeline } from "@/components/charts/activity-timeline";
import { formatShortDate, daysUntil } from "@/lib/format/date";

export const dynamic = "force-dynamic";

export default async function ActivityPage({ params }: { params: { id: string } }) {
  const household = await prisma.household.findUnique({
    where: { id: params.id },
    include: {
      activityEvents: { orderBy: { occurredAt: "desc" } },
      insights: { where: { dismissed: false, section: "Activity" } },
    },
  });
  if (!household) notFound();

  const events = household.activityEvents;
  const thisYear = new Date().getUTCFullYear();
  const isThisYear = (d: Date) => d.getUTCFullYear() === thisYear;

  const meetingsYtd = events.filter((e) => e.kind === "Meeting" && isThisYear(e.occurredAt)).length;
  const notes = events.filter((e) => e.kind === "Note").length;
  const tasksCompleted = events.filter((e) => e.kind === "TaskCompleted").length;
  const lastPlanChange = events.find((e) => e.kind === "PlanChange");
  const lastPlanChangeLabel = lastPlanChange
    ? daysUntil(lastPlanChange.occurredAt) === 0
      ? "Today"
      : formatShortDate(lastPlanChange.occurredAt)
    : "—";

  return (
    <PlanSection
      title="Activity"
      completenessPct={household.activityCompletenessPct}
      updatedLabel={lastPlanChange ? `Last plan change ${lastPlanChangeLabel}` : "No activity logged"}
      actions={<SectionActions />}
      summaryTitle="Timeline"
      summarySubtitle="Meetings, notes, documents, and plan changes, most recent first"
      summary={
        events.length > 0 ? (
          <ActivityTimeline
            events={events.map((e) => ({
              id: e.id,
              kind: e.kind,
              label: e.label,
              detail: e.detail,
              occurredAt: e.occurredAt.toISOString(),
            }))}
          />
        ) : (
          <div className="text-sm text-ink-muted">No activity logged for this household yet.</div>
        )
      }
      detailTitle="Activity summary"
      detail={
        <div className="grid grid-cols-4 gap-3.5">
          <Stat value={String(meetingsYtd)} label="Meetings, YTD" />
          <Stat value={String(notes)} label="Notes" />
          <Stat value={`${tasksCompleted} / ${household.openTasksCount}`} label="Tasks completed / open" />
          <Stat value={lastPlanChangeLabel} label="Last plan change" />
        </div>
      }
      insights={household.insights.map((i) => ({ id: i.id, text: i.text, sourceLabel: i.sourceLabel }))}
      provenance="Meetings and notes: manually logged by the advisor · Documents and plan changes: recorded automatically when the underlying record changes · Tasks: manual entry, no Task model in this pass — see PROGRESS.md."
    />
  );
}

function Stat({ value, label }: { value: string; label: string }) {
  return (
    <div className="border-t border-rule pt-2.5">
      <div className="tabular text-lg font-semibold">{value}</div>
      <div className="text-xs text-ink-muted">{label}</div>
    </div>
  );
}
