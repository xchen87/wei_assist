import { notFound } from "next/navigation";
import { prisma } from "@meridian/db";
import { PlanSection } from "@/components/plan/plan-section";
import { SectionActions } from "@/components/plan/section-actions";
import { NetWorthWaterfall } from "@/components/charts/net-worth-waterfall";
import { formatMoney, formatSignedMoney } from "@/lib/format/money";

export const dynamic = "force-dynamic";

export default async function BalancePage({ params }: { params: { id: string } }) {
  const household = await prisma.household.findUnique({
    where: { id: params.id },
    include: { insights: { where: { dismissed: false, section: "Balance" } } },
  });
  if (!household) notFound();

  return (
    <PlanSection
      title="Balance"
      completenessPct={100}
      updatedLabel="Synced today · Custodian feed"
      actions={<SectionActions />}
      summaryTitle="Net worth, past 12 months"
      summarySubtitle="What changed between last year's balance and today's"
      summary={
        <NetWorthWaterfall
          startCents={household.balanceStartCents}
          contributionsCents={household.balanceContributionsCents}
          growthCents={household.balanceGrowthCents}
          taxesCents={household.balanceTaxesCents}
          spendingCents={household.balanceSpendingCents}
          endCents={household.netWorthCents}
        />
      }
      detailTitle="Assets & liabilities"
      detail={
        <table className="w-full border-collapse text-sm">
          <tbody>
            <Row label="Investment accounts">{formatMoney(household.investmentAccountsCents)}</Row>
            <Row label="Real estate">{formatMoney(household.realEstateCents)}</Row>
            <Row label="Cash & equivalents">{formatMoney(household.cashCents)}</Row>
            <Row label="Other assets">{formatMoney(household.otherAssetsCents)}</Row>
            <Row label="Mortgage">
              <span className="text-loss">{formatSignedMoney(-household.mortgageCents)}</span>
            </Row>
            <Row label="Net worth" strong>
              {formatMoney(household.netWorthCents)}
            </Row>
          </tbody>
        </table>
      }
      insights={household.insights.map((i) => ({ id: i.id, text: i.text, sourceLabel: i.sourceLabel }))}
      provenance="Investment accounts: custodian feed · Real estate & mortgage: manual entry."
    />
  );
}

function Row({ label, children, strong }: { label: string; children: React.ReactNode; strong?: boolean }) {
  return (
    <tr className={`border-t border-rule ${strong ? "font-semibold" : ""}`}>
      <td className="w-52 py-2.5 pr-2 text-ink-muted">{label}</td>
      <td className="tabular py-2.5">{children}</td>
    </tr>
  );
}
