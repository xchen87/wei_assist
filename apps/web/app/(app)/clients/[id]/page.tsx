import { notFound } from "next/navigation";
import { prisma } from "@meridian/db";
import { PlanSection } from "@/components/plan/plan-section";
import { SectionActions } from "@/components/plan/section-actions";
import { SegmentedCompletenessRing } from "@/components/charts/completeness-ring";
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

  // The twelve sections that carry a completeness figure — Overview is the
  // rollup, so it isn't one of its own segments, and Business is hidden
  // (no seeded household has an entity, D-003).
  const base = `/clients/${household.id}`;
  const sectionCompleteness = [
    { label: "Household", pct: household.householdCompletenessPct, href: `${base}/household` },
    { label: "Cashflow", pct: household.cashflowCompletenessPct, href: `${base}/cashflow` },
    { label: "Balance", pct: household.balanceCompletenessPct, href: `${base}/balance` },
    { label: "Allocation", pct: household.allocationCompletenessPct, href: `${base}/allocation` },
    { label: "Goals", pct: household.goalsCompletenessPct, href: `${base}/goals` },
    { label: "Retirement", pct: household.retirementCompletenessPct, href: `${base}/retirement` },
    { label: "Tax", pct: household.taxCompletenessPct, href: `${base}/tax` },
    { label: "Protection", pct: household.protectionCompletenessPct, href: `${base}/protection` },
    { label: "Estate", pct: household.estateCompletenessPct, href: `${base}/estate` },
    { label: "Documents", pct: household.documentsCompletenessPct, href: `${base}/documents` },
    { label: "Activity", pct: household.activityCompletenessPct, href: `${base}/activity` },
    { label: "Compliance", pct: household.complianceCompletenessPct, href: `${base}/compliance` },
  ];

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
