import { notFound } from "next/navigation";
import { prisma } from "@meridian/db";
import { PlanSection } from "@/components/plan/plan-section";
import { SectionActions } from "@/components/plan/section-actions";
import { SegmentedCompletenessRing } from "@/components/charts/completeness-ring";
import { AlertCard } from "@/components/signals/alert-card";
import { bySeverity } from "@/lib/calc/signals";
import { SECTION_LABELS, sectionPath } from "@/lib/sections";
import { formatLongDate } from "@/lib/format/date";

export const dynamic = "force-dynamic";

export default async function OverviewPage({ params }: { params: { id: string } }) {
  const household = await prisma.household.findUnique({
    where: { id: params.id },
    include: {
      members: true,
      insights: { where: { dismissed: false } },
      advisor: true,
    },
  });
  if (!household) notFound();

  const primary = household.members.find((m) => m.role === "Primary") ?? household.members[0];

  // Open signals for this household, newest first — an advisor who opens a
  // flagged household should find the reason here rather than having to go
  // back to Signals for it.
  const alerts = await prisma.alert.findMany({
    where: { householdId: household.id, status: "open" },
    include: { change: { include: { indicator: { select: { name: true } } } } },
    orderBy: { createdAt: "desc" },
  });
  const rankedAlerts = [...alerts].sort(bySeverity).slice(0, 4);

  // The twelve sections that carry a completeness figure — Overview is the
  // rollup, so it isn't one of its own segments, and Business is hidden
  // (no seeded household has an entity, D-003).
  const sectionCompleteness = (
    [
      ["household", household.householdCompletenessPct],
      ["cashflow", household.cashflowCompletenessPct],
      ["balance", household.balanceCompletenessPct],
      ["allocation", household.allocationCompletenessPct],
      ["goals", household.goalsCompletenessPct],
      ["retirement", household.retirementCompletenessPct],
      ["tax", household.taxCompletenessPct],
      ["protection", household.protectionCompletenessPct],
      ["estate", household.estateCompletenessPct],
      ["documents", household.documentsCompletenessPct],
      ["activity", household.activityCompletenessPct],
      ["compliance", household.complianceCompletenessPct],
    ] as const
  ).map(([key, pct]) => ({
    label: SECTION_LABELS[key],
    pct,
    href: sectionPath(household.id, key),
  }));

  return (
    <PlanSection
      title="Overview"
      completenessPct={household.completenessPct}
      updatedLabel="Updated today · Custodian feed"
      actions={<SectionActions />}
      summaryTitle="Plan progress across sections"
      summarySubtitle="Each arc is one section; how much of it is filled is how complete that section is. Anything under 60% is called out."
      summary={
        <div className="flex flex-col gap-6">
          {rankedAlerts.length > 0 ? (
            <div className="rounded-card border border-brass bg-brass-tint p-4">
              <div className="mb-2.5 text-sm font-semibold">
                {alerts.length} open signal{alerts.length === 1 ? "" : "s"} for this household
              </div>
              <div className="flex flex-col gap-2.5">
                {rankedAlerts.map((alert) => (
                  <AlertCard
                    key={alert.id}
                    showHousehold={false}
                    alert={{
                      id: alert.id,
                      householdId: alert.householdId,
                      householdName: household.name,
                      severity: alert.severity,
                      title: alert.title,
                      rationale: alert.rationale,
                      suggestedAction: alert.suggestedAction,
                      section: alert.section,
                      status: alert.status,
                    }}
                  />
                ))}
              </div>
            </div>
          ) : null}
          <SegmentedCompletenessRing sections={sectionCompleteness} />
          <div className="rounded-card border border-rule p-4">
            <div className="mb-3 text-sm font-semibold">What changed since your last visit</div>
            <div className="flex flex-col gap-2.5">
              {household.whatChanged.split("\n").map((line, i) => (
                <div key={i} className="flex gap-2 text-sm">
                  <span className="text-ink-muted">&bull;</span>
                  {line}
                </div>
              ))}
            </div>
          </div>
        </div>
      }
      detailTitle="Household"
      detail={
        <table className="w-full border-collapse text-sm">
          <tbody>
            <Row label="Members">
              {household.members.map((m) => `${m.name} (${m.age})`).join(", ")}
            </Row>
            <Row label="Primary advisor">{household.advisor.name}</Row>
            <Row label="Client since">{household.clientSinceYear}</Row>
            <Row label="Next review">
              {household.reviewStatus === "overdue" ? "Overdue" : formatLongDate(household.nextReviewDate)}
            </Row>
          </tbody>
        </table>
      }
      insights={household.insights.map((i) => ({ id: i.id, text: i.text, sourceLabel: i.sourceLabel, householdId: i.householdId, section: i.section }))}
      provenance={`Positions: custodian feed, synced today · Household lead: ${primary?.name ?? household.advisor.name} · Section completeness is a stored figure per section; the plan-health percentage in the header is a separate stored roll-up, and the two only converge once the completeness manifest exists (PROGRESS.md).`}
    />
  );
}

function Row({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <tr className="border-t border-rule">
      <td className="w-40 py-2.5 pr-2 text-ink-muted">{label}</td>
      <td className="py-2.5">{children}</td>
    </tr>
  );
}
