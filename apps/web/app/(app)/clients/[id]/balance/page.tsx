import { notFound } from "next/navigation";
import { prisma } from "@meridian/db";
import { PlanSection } from "@/components/plan/plan-section";
import { SectionActions } from "@/components/plan/section-actions";
import { NetWorthWaterfall } from "@/components/charts/net-worth-waterfall";
import { centsToNumber, formatMoney, formatSignedMoney } from "@/lib/format/money";
import { TAX_TREATMENT_LABEL } from "@/lib/calc/accounts";

export const dynamic = "force-dynamic";

export default async function BalancePage({ params }: { params: { id: string } }) {
  const household = await prisma.household.findUnique({
    where: { id: params.id },
    include: {
      insights: { where: { dismissed: false, section: "Balance" } },
      accounts: {
        orderBy: { sortOrder: "asc" },
        include: { positions: { select: { marketValueCents: true } }, owner: { select: { name: true } } },
      },
    },
  });
  if (!household) notFound();

  // "Investment accounts" used to be one stored figure. It is the sum of
  // the accounts now, so the balance sheet line and the Allocation
  // section's holdings are the same money counted once (D-030).
  const accounts = household.accounts.map((account) => ({
    id: account.id,
    name: account.name,
    kind: account.kind,
    taxTreatment: account.taxTreatment,
    ownerName: account.owner?.name ?? null,
    valueCents: account.positions.reduce((sum, p) => sum + centsToNumber(p.marketValueCents), 0),
  }));
  const investmentAccountsCents = accounts.reduce((sum, a) => sum + a.valueCents, 0);

  return (
    <PlanSection
      title="Balance"
      completenessPct={household.balanceCompletenessPct}
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
            <Row label="Investment accounts">{formatMoney(investmentAccountsCents)}</Row>
            {accounts.map((account) => (
              <tr key={account.id} className="border-t border-rule">
                <td className="w-64 py-2 pl-5 pr-2 text-xs text-ink-muted">
                  {account.name}
                  <span className="ml-1.5 text-ink-muted">
                    · {TAX_TREATMENT_LABEL[account.taxTreatment] ?? account.taxTreatment}
                  </span>
                </td>
                <td className="tabular py-2 text-xs text-ink-muted">
                  {formatMoney(account.valueCents)}
                </td>
              </tr>
            ))}
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
      insights={household.insights.map((i) => ({ id: i.id, text: i.text, sourceLabel: i.sourceLabel, householdId: i.householdId, section: i.section }))}
      provenance="Investment accounts: the sum of the household's accounts, itemised above from the custodian feed · Real estate & mortgage: manual entry."
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
