import { notFound } from "next/navigation";
import { prisma } from "@meridian/db";
import { PlanSection } from "@/components/plan/plan-section";
import { SectionActions } from "@/components/plan/section-actions";
import { AllocationRings } from "@/components/charts/allocation-rings";

export const dynamic = "force-dynamic";

export default async function AllocationPage({ params }: { params: { id: string } }) {
  const household = await prisma.household.findUnique({
    where: { id: params.id },
    include: { insights: { where: { dismissed: false, section: "Allocation" } } },
  });
  if (!household) notFound();

  const target = {
    equity: household.equityTargetPct,
    fixedIncome: household.fixedIncomeTargetPct,
    cash: household.targetCashPct,
  };
  const actual = {
    equity: household.equityActualPct,
    fixedIncome: household.fixedIncomeActualPct,
    cash: household.cashPct,
  };

  return (
    <PlanSection
      title="Allocation"
      completenessPct={household.allocationCompletenessPct}
      updatedLabel="Synced today · Custodian feed"
      actions={<SectionActions />}
      summaryTitle="Target vs. actual allocation"
      summarySubtitle="Asset-class mix, target compared with what's actually held"
      summary={<AllocationRings target={target} actual={actual} />}
      detailTitle="Holdings & concentration"
      detail={
        <table className="w-full border-collapse text-sm">
          <tbody>
            <Row label="Equities">
              Target {target.equity.toFixed(1)}% · Actual {actual.equity.toFixed(1)}%
            </Row>
            <Row label="Fixed income">
              Target {target.fixedIncome.toFixed(1)}% · Actual {actual.fixedIncome.toFixed(1)}%
            </Row>
            <Row label="Cash">
              Target {target.cash.toFixed(1)}% · Actual {actual.cash.toFixed(1)}%
            </Row>
            <Row label="Distinct holdings">{household.distinctHoldings}</Row>
            <Row label="Largest single position">
              {household.topHoldingName} ({household.topHoldingTicker}) · {household.topHoldingPct.toFixed(1)}% of equities
            </Row>
            <Row label="Blended expense ratio">{household.blendedExpenseRatioPct.toFixed(2)}%</Row>
          </tbody>
        </table>
      }
      insights={household.insights.map((i) => ({ id: i.id, text: i.text, sourceLabel: i.sourceLabel }))}
      provenance="Allocation and drift: custodian feed · Targets: set in the household's Investment Policy Statement."
    />
  );
}

function Row({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <tr className="border-t border-rule">
      <td className="w-52 py-2.5 pr-2 text-ink-muted">{label}</td>
      <td className="tabular py-2.5">{children}</td>
    </tr>
  );
}
