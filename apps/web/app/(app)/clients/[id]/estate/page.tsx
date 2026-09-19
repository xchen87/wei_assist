import { notFound } from "next/navigation";
import { prisma } from "@meridian/db";
import { PlanSection } from "@/components/plan/plan-section";
import { SectionActions } from "@/components/plan/section-actions";
import { EstateFlowDiagram } from "@/components/charts/estate-flow-diagram";

export const dynamic = "force-dynamic";

export default async function EstatePage({ params }: { params: { id: string } }) {
  const household = await prisma.household.findUnique({
    where: { id: params.id },
    include: {
      estateAssets: { orderBy: { sortOrder: "asc" } },
      estateDocs: { orderBy: { sortOrder: "asc" } },
      insights: { where: { dismissed: false, section: "Estate" } },
    },
  });
  if (!household) notFound();

  return (
    <PlanSection
      title="Estate"
      completenessPct={household.estateCompletenessPct}
      updatedLabel="Verified · Manual entry"
      actions={<SectionActions />}
      summaryTitle="Asset titling & beneficiary flow"
      summarySubtitle="How each asset is titled or designated to pass at death"
      summary={
        <EstateFlowDiagram
          rows={household.estateAssets.map((a) => ({
            id: a.id,
            assetName: a.assetName,
            beneficiaryLabel: a.beneficiaryLabel,
            missingDesignation: a.missingDesignation,
          }))}
        />
      }
      detailTitle="Documents in force"
      detail={
        <table className="w-full border-collapse text-sm">
          <tbody>
            {household.estateDocs.map((d) => (
              <tr key={d.id} className="border-t border-rule">
                <td className="w-64 py-2.5 pr-2 text-ink-muted">{d.name}</td>
                <td className={`py-2.5 ${d.overdue ? "text-loss" : ""}`}>{d.statusLabel}</td>
              </tr>
            ))}
          </tbody>
        </table>
      }
      insights={household.insights.map((i) => ({ id: i.id, text: i.text, sourceLabel: i.sourceLabel, householdId: i.householdId, section: i.section }))}
      provenance="Titling and beneficiary designations: manual entry, cross-referenced against custodian records where available · Documents in force: client-provided, last verified per document."
    />
  );
}
