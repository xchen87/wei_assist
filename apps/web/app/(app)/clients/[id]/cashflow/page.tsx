import { notFound } from "next/navigation";
import { prisma } from "@meridian/db";
import { PlanSection } from "@/components/plan/plan-section";
import { SectionActions } from "@/components/plan/section-actions";
import { CashflowSankey } from "@/components/charts/cashflow-sankey";
import { formatMoney, formatSignedMoney } from "@/lib/format/money";

export const dynamic = "force-dynamic";

export default async function CashflowPage({ params }: { params: { id: string } }) {
  const household = await prisma.household.findUnique({
    where: { id: params.id },
    include: { insights: { where: { dismissed: false, section: "Cashflow" } } },
  });
  if (!household) notFound();

  return (
    <PlanSection
      title="Cashflow"
      completenessPct={household.cashflowCompletenessPct}
      updatedLabel="Derived from Balance + income figures on file"
      actions={<SectionActions />}
      summaryTitle="Where the household's income goes"
      summarySubtitle={`Annual income, taxes, spending, and savings — ${household.savingsRatePct.toFixed(0)}% savings rate`}
      summary={<CashflowSankey
        incomeCents={household.incomeCents}
        taxesCents={household.taxesCents}
        netIncomeCents={household.netIncomeCents}
        spendingCents={household.spendingCents}
        savingsCents={household.savingsCents}
      />}
      detailTitle="Annual figures"
      detail={
        <table className="w-full border-collapse text-sm">
          <tbody>
            <Row label="Total income">{formatMoney(household.incomeCents)}</Row>
            <Row label="Taxes">{formatMoney(household.taxesCents)}</Row>
            <Row label="Total expenses">{formatMoney(household.spendingCents)}</Row>
            <Row label="Savings rate">{household.savingsRatePct.toFixed(0)}%</Row>
            <Row label="Surplus, this year">
              <span className="font-semibold text-gain">{formatSignedMoney(household.savingsCents)}</span>
            </Row>
          </tbody>
        </table>
      }
      insights={household.insights.map((i) => ({ id: i.id, text: i.text, sourceLabel: i.sourceLabel }))}
      provenance="Income and expenses: manual entry · Tax withholding estimate: derived from the Tax section."
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
