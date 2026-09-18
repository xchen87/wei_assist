import { notFound } from "next/navigation";
import { prisma } from "@meridian/db";
import { PlanSection } from "@/components/plan/PlanSection";
import { SectionActions } from "@/components/plan/SectionActions";
import { CompletenessRing } from "@/components/plan/CompletenessRing";
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

  return (
    <PlanSection
      title="Overview"
      completenessPct={household.completenessPct}
      updatedLabel="Updated today · Custodian feed"
      actions={<SectionActions />}
      summaryTitle="Plan health"
      summarySubtitle="Rollup across the household's plan"
      summary={
        <div className="flex flex-col items-center gap-6 sm:flex-row">
          <CompletenessRing pct={household.completenessPct} size={112} />
          <div className="flex-1 rounded-card border border-rule p-4">
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
      insights={household.insights.map((i) => ({ id: i.id, text: i.text, sourceLabel: i.sourceLabel }))}
      provenance={`Positions: custodian feed, synced today · Household lead: ${primary?.name ?? household.advisor.name}`}
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
