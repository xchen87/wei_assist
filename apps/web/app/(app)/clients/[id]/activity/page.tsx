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
      tasks: { select: { status: true } },
    },
  });
  if (!household) notFound();

  const events = household.activityEvents;
  const thisYear = new Date().getUTCFullYear();
  const isThisYear = (d: Date) => d.getUTCFullYear() === thisYear;

  const meetingsYtd = events.filter((e) => e.kind === "Meeting" && isThisYear(e.occurredAt)).length;
  const notes = events.filter((e) => e.kind === "Note").length;
  // From the household's Task rows (D-034), not a stored count: the number
  // on this card and the rows behind it in the Tasks inbox are one thing.
  const tasksCompleted = household.tasks.filter((t) => t.status === "done").length;
  const tasksOpen = household.tasks.filter((t) => t.status === "open").length;
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
          <Stat value={`${tasksCompleted} / ${tasksOpen}`} label="Tasks completed / open" />
          <Stat value={lastPlanChangeLabel} label="Last plan change" />
        </div>
      }
      insights={household.insights.map((i) => ({ id: i.id, text: i.text, sourceLabel: i.sourceLabel, householdId: i.householdId, section: i.section }))}
      provenance="Meetings and notes: manually logged by the advisor · Documents and plan changes: recorded automatically when the underlying record changes · Tasks: the household's own task rows, marked done from the Tasks inbox."
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
