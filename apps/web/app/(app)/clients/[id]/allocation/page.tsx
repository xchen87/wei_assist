import { notFound } from "next/navigation";
import { prisma } from "@meridian/db";
import { PlanSection } from "@/components/plan/plan-section";
import { SectionActions } from "@/components/plan/section-actions";
import { AllocationExplorer } from "@/components/allocation/allocation-explorer";
import { HoldingsTable } from "@/components/allocation/holdings-table";
import { centsToNumber } from "@/lib/format/money";
import { summarisePortfolio, type Holding } from "@/lib/calc/holdings";

export const dynamic = "force-dynamic";

/** The single-name limit the concentration marker is drawn against.
 *
 * A household's IPS is where this really lives, and there is no field for
 * it yet, so it is one constant for the whole book and labelled on the
 * page as the IPS limit rather than as a rule this app knows (§13). Ten
 * per cent is selective against the seeded book — it flags seventeen of
 * forty households, where a threshold that also counted funds would flag
 * all forty. */
const SINGLE_NAME_LIMIT_PCT = 10;

export default async function AllocationPage({ params }: { params: { id: string } }) {
  const household = await prisma.household.findUnique({
    where: { id: params.id },
    include: {
      insights: { where: { dismissed: false, section: "Allocation" } },
      positions: { include: { security: true } },
    },
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

  // Cents cross to number here, at the boundary (D-023).
  const holdings: Holding[] = household.positions.map((p) => ({
    id: p.id,
    ticker: p.security.ticker,
    name: p.security.name,
    kind: p.security.kind,
    assetClass: p.security.assetClass,
    sector: p.security.sector,
    region: p.security.region,
    expenseRatioPct: p.security.expenseRatioPct,
    marketValueCents: centsToNumber(p.marketValueCents),
    costBasisCents: centsToNumber(p.costBasisCents),
  }));

  const summary = summarisePortfolio(holdings);

  return (
    <PlanSection
      title="Allocation"
      completenessPct={household.allocationCompletenessPct}
      updatedLabel="Synced today · Custodian feed"
      actions={<SectionActions />}
      summaryTitle="Target vs. actual allocation"
      summarySubtitle="Asset-class mix, and the positions behind each class"
      summary={
        <AllocationExplorer
          target={target}
          actual={actual}
          holdings={holdings}
          thresholdPct={SINGLE_NAME_LIMIT_PCT}
        />
      }
      detailTitle="Holdings"
      detail={<HoldingsTable summary={summary} thresholdPct={SINGLE_NAME_LIMIT_PCT} />}
      insights={household.insights.map((i) => ({ id: i.id, text: i.text, sourceLabel: i.sourceLabel, householdId: i.householdId, section: i.section }))}
      provenance="Positions and market values: custodian feed · Targets: set in the household's Investment Policy Statement. Asset-class percentages, the blended expense ratio and the concentration figures are all computed from the positions below, so the summary and the holdings cannot disagree."
    />
  );
}
