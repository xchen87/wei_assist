import { notFound } from "next/navigation";
import { prisma } from "@meridian/db";
import { PlanSection } from "@/components/plan/plan-section";
import { SectionActions } from "@/components/plan/section-actions";
import { TaxBracketBar } from "@/components/charts/tax-bracket-bar";
import { bracketPosition } from "@/lib/calc/tax";
import { formatMoney } from "@/lib/format/money";
import { formatPercent } from "@/lib/format/percent";

export const dynamic = "force-dynamic";

export default async function TaxPage({ params }: { params: { id: string } }) {
  const household = await prisma.household.findUnique({
    where: { id: params.id },
    include: { insights: { where: { dismissed: false, section: "Tax" } } },
  });
  if (!household) notFound();

  const position = bracketPosition(household.taxableIncomeCents);
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
          <TaxBracketBar taxableIncomeCents={household.taxableIncomeCents} />
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
            <Row label="Unrealized gains (taxable accounts)">{formatMoney(household.unrealizedGainsCents)}</Row>
            <Row label="Unrealized losses available to harvest">{formatMoney(household.harvestableLossesCents)}</Row>
            <Row label="Preferred withdrawal order">{household.withdrawalSequencing}</Row>
          </tbody>
        </table>
      }
      insights={household.insights.map((i) => ({ id: i.id, text: i.text, sourceLabel: i.sourceLabel }))}
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
