import { notFound } from "next/navigation";
import { prisma } from "@meridian/db";
import { PlanSection } from "@/components/plan/plan-section";
import { SectionActions } from "@/components/plan/section-actions";
import { TaxBracketBar } from "@/components/charts/tax-bracket-bar";
import { bracketPosition } from "@/lib/calc/tax";
import { formatMoney, centsToNumber } from "@/lib/format/money";
import {
  TAX_TREATMENT_LABEL,
  assetLocation,
  taxablePositionResults,
  type AccountInput,
} from "@/lib/calc/accounts";
import { formatPercent } from "@/lib/format/percent";

export const dynamic = "force-dynamic";

export default async function TaxPage({ params }: { params: { id: string } }) {
  const household = await prisma.household.findUnique({
    where: { id: params.id },
    include: {
      insights: { where: { dismissed: false, section: "Tax" } },
      accounts: {
        orderBy: { sortOrder: "asc" },
        include: { positions: { include: { security: true } }, owner: { select: { name: true } } },
      },
    },
  });
  if (!household) notFound();

  // Both gain figures are claims about *taxable* accounts, which is a
  // claim the app could not check until accounts existed (D-030).
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
  const taxable = taxablePositionResults(accounts);
  const byTreatment = assetLocation(accounts);

  const taxableIncome = centsToNumber(household.taxableIncomeCents);
  const position = bracketPosition(taxableIncome);
  const isTopBracket = position.roomToNextBracketCents === Infinity;

  return (
    <PlanSection
      title="Tax"
      completenessPct={household.taxCompletenessPct}
      updatedLabel="Recalculated today · Balance + Cashflow sections"
      actions={<SectionActions />}
      summaryTitle="Bracket position"
      summarySubtitle="Taxable income and headroom to the next bracket"
      summary={
        <div>
          <div className="mb-3.5 text-right text-xs text-ink-muted">{household.filingStatus}</div>
          <TaxBracketBar taxableIncomeCents={taxableIncome} />
          <div className="grid grid-cols-3 gap-3.5">
            <Stat value={formatMoney(household.taxableIncomeCents)} label="Estimated taxable income" />
            <Stat value={`${position.marginalRatePct}%`} label="Current marginal bracket" />
            <Stat
              value={isTopBracket ? "—" : formatMoney(position.roomToNextBracketCents)}
              label="Room to next bracket"
              tone="brass"
            />
          </div>
        </div>
      }
      detailTitle="Tax position"
      detail={
        <table className="w-full border-collapse text-sm">
          <tbody>
            <Row label="Effective rate (est.)">{formatPercent(household.effectiveRatePct)}</Row>
            <Row label="Realized gains, YTD (long-term)">{formatMoney(household.realizedGainsCents)}</Row>
            <Row label="Unrealized gains (taxable accounts)">
              {formatMoney(taxable.unrealisedGainCents)}
            </Row>
            {/* Not "available to harvest": whether a loss can be used is a
                tax question that depends on the rest of the return, and
                this app states the amount rather than the conclusion
                (§13). A loss inside an IRA is excluded — it is not the
                same kind of thing — which is the account layer earning
                its keep. */}
            <Row label="Unrealized losses (taxable accounts)">
              {formatMoney(taxable.unrealisedLossCents)}
            </Row>
            <Row label="Preferred withdrawal order">
              <span className="flex flex-wrap items-center gap-x-2 gap-y-1">
                {byTreatment.map((cell, i) => (
                  <span key={cell.taxTreatment} className="flex items-center gap-2">
                    {i > 0 ? <span className="text-ink-muted">→</span> : null}
                    <span>
                      {TAX_TREATMENT_LABEL[cell.taxTreatment] ?? cell.taxTreatment}{" "}
                      <span className="text-ink-muted">
                        {formatMoney(cell.valueCents, { compact: true })}
                      </span>
                    </span>
                  </span>
                ))}
              </span>
            </Row>
          </tbody>
        </table>
      }
      insights={household.insights.map((i) => ({ id: i.id, text: i.text, sourceLabel: i.sourceLabel, householdId: i.householdId, section: i.section }))}
      provenance="Taxable income and bracket position: derived from Balance + Cashflow sections, recalculated today · Realized/unrealized gains: custodian feed, synced today · Bracket structure shown is illustrative for this draft — connect a tax data source in Settings → Tax for current-year figures."
    />
  );
}

function Row({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <tr className="border-t border-rule">
      <td className="w-64 py-2.5 pr-2 text-ink-muted">{label}</td>
      <td className="tabular py-2.5">{children}</td>
    </tr>
  );
}

function Stat({ value, label, tone }: { value: string; label: string; tone?: "brass" }) {
  return (
    <div className="border-t border-rule pt-2.5">
      <div className={`tabular text-lg font-semibold ${tone === "brass" ? "text-brass" : ""}`}>{value}</div>
      <div className="text-xs text-ink-muted">{label}</div>
    </div>
  );
}
