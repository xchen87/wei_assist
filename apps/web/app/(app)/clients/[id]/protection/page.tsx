import { notFound } from "next/navigation";
import { prisma } from "@meridian/db";
import { PlanSection } from "@/components/plan/plan-section";
import { SectionActions } from "@/components/plan/section-actions";
import { ProtectionGapBars } from "@/components/charts/protection-gap-bars";

export const dynamic = "force-dynamic";

const TYPE_LABEL: Record<string, string> = {
  Life: "Life insurance",
  Disability: "Disability",
  LongTermCare: "Long-term care",
  Umbrella: "Umbrella liability",
  PropertyCasualty: "Property & casualty",
};

export default async function ProtectionPage({ params }: { params: { id: string } }) {
  const household = await prisma.household.findUnique({
    where: { id: params.id },
    include: {
      policies: { orderBy: { id: "asc" } },
      insights: { where: { dismissed: false, section: "Protection" } },
    },
  });
  if (!household) notFound();

  return (
    <PlanSection
      title="Protection"
      completenessPct={household.protectionCompletenessPct}
      updatedLabel="Verified · Manual entry"
      actions={<SectionActions />}
      summaryTitle="Coverage vs. need"
      summarySubtitle="Current coverage as a percent of estimated need — 0% means fully funded"
      summary={
        <ProtectionGapBars
          coverage={household.policies.map((p) => ({
            id: p.id,
            label: TYPE_LABEL[p.type] ?? p.type,
            gapPct: p.gapPct,
            gapLabel: p.gapLabel,
          }))}
        />
      }
      detailTitle="Policies on file"
      detail={
        <table className="w-full border-collapse text-sm">
          <tbody>
            {household.policies.map((p) => (
              <tr key={p.id} className="border-t border-rule">
                <td className="w-64 py-2.5 pr-2 text-ink-muted">{TYPE_LABEL[p.type] ?? p.type}</td>
                <td className="py-2.5">{p.detailLabel}</td>
              </tr>
            ))}
          </tbody>
        </table>
      }
      insights={household.insights.map((i) => ({ id: i.id, text: i.text, sourceLabel: i.sourceLabel }))}
      provenance="Coverage need: estimated from Cashflow + Goals sections · Current coverage: manual entry, last verified per policy — see Documents for policy declarations."
    />
  );
}
