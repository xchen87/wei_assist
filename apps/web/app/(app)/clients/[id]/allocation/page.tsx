import { notFound } from "next/navigation";
import { prisma } from "@meridian/db";
import { PlanSection } from "@/components/plan/plan-section";
import { SectionActions } from "@/components/plan/section-actions";
import { AllocationExplorer } from "@/components/allocation/allocation-explorer";
import { HoldingsTable } from "@/components/allocation/holdings-table";
import { AccountsPanel } from "@/components/allocation/accounts-panel";
import { centsToNumber } from "@/lib/format/money";
import { mergeBySecurity, summarisePortfolio } from "@/lib/calc/holdings";
import { assetLocation, summariseAccounts, type AccountInput } from "@/lib/calc/accounts";

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
      accounts: {
        orderBy: { sortOrder: "asc" },
        include: { positions: { include: { security: true } }, owner: { select: { name: true } } },
      },
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
  const accounts: AccountInput[] = household.accounts.map((account) => ({
    id: account.id,
    name: account.name,
    kind: account.kind,
    taxTreatment: account.taxTreatment,
    custodian: account.custodian,
    ownerName: account.owner?.name ?? null,
    openedYear: account.openedYear,
    holdings: account.positions.map((p) => ({
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
    })),
  }));

  // Two views of the same money. The asset-class breakdown and the
  // concentration test work per *security*, because "what do we hold"
  // and "is any one company too large" are both questions about a
  // company, not about a custodian's bookkeeping — one name at 6% in a
  // brokerage account and 5% in an IRA is an 11% position. The holdings
  // table works per *position*, because "where is it held" is exactly the
  // question the account layer answers.
  const positions = accounts.flatMap((a) => a.holdings);
  const bySecurity = summarisePortfolio(mergeBySecurity(positions));
  const byPosition = summarisePortfolio(positions);
  const accountSummaries = summariseAccounts(accounts);
  const location = assetLocation(accounts);

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
          holdings={mergeBySecurity(positions)}
          thresholdPct={SINGLE_NAME_LIMIT_PCT}
        />
      }
      detailTitle="Accounts & holdings"
      detail={
        <div className="flex flex-col gap-7">
          <AccountsPanel accounts={accountSummaries} location={location} />
          <HoldingsTable
            summary={byPosition}
            thresholdPct={SINGLE_NAME_LIMIT_PCT}
            accountNameByHoldingId={
              new Map(accounts.flatMap((a) => a.holdings.map((h) => [h.id, a.name] as const)))
            }
            securityPortfolioPctByTicker={
              new Map(bySecurity.rows.map((r) => [r.ticker, r.portfolioPct] as const))
            }
          />
        </div>
      }
      insights={household.insights.map((i) => ({ id: i.id, text: i.text, sourceLabel: i.sourceLabel, householdId: i.householdId, section: i.section }))}
      provenance="Accounts, positions and market values: custodian feed · Targets: set in the household's Investment Policy Statement. Asset-class percentages, the blended expense ratio and the concentration figures are all computed from the positions below, so the summary and the holdings cannot disagree. Asset location shows where things are held; whether that arrangement suits this household depends on facts the record doesn't hold."
    />
  );
}
