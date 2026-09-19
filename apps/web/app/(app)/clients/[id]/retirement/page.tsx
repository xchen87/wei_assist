import { notFound } from "next/navigation";
import { prisma } from "@meridian/db";
import { PlanSection } from "@/components/plan/plan-section";
import { SectionActions } from "@/components/plan/section-actions";
import { RetirementFanChart } from "@/components/charts/retirement-fan-chart";
import { projectRetirement } from "@/lib/calc/retirement";
import { formatMoney } from "@/lib/format/money";
import { formatSignedPoints } from "@/lib/format/percent";

export const dynamic = "force-dynamic";

export default async function RetirementPage({ params }: { params: { id: string } }) {
  const household = await prisma.household.findUnique({
    where: { id: params.id },
    include: { members: true, insights: { where: { dismissed: false, section: "Retirement" } } },
  });
  if (!household) notFound();

  const primary = household.members.find((m) => m.role === "Primary") ?? household.members[0];
  const spouse = household.members.find((m) => m.role === "Spouse");
  const currentAge = primary?.age ?? 55;

  const projection = projectRetirement({
    currentAge,
    retirementAge: household.retirementAgePrimary,
    currentPortfolioCents: household.netWorthCents,
    annualContributionCents: household.savingsCents,
    annualSpendingCents: household.monthlySpendingNeedCents * 12,
    seed: hashCode(household.id),
  });

  const successPct = projection.successProbabilityPct;

  return (
    <PlanSection
      title="Retirement"
      completenessPct={household.retirementCompletenessPct}
      updatedLabel="Projection run today · 400 simulated paths"
      actions={<SectionActions />}
      summaryTitle="Outcome distribution"
      summarySubtitle="Simulated portfolio value from today through age 95"
      summary={
        <div>
          <div className="mb-1 flex items-end justify-between">
            <div className="text-xs text-ink-muted">Success probability — plan sustains spending through age 95</div>
            <div className="text-right">
              <div className="tabular text-xl font-semibold">{successPct}%</div>
              <div className={`tabular text-xs ${household.retirementSuccessDeltaPts >= 0 ? "text-gain" : "text-loss"}`}>
                {formatSignedPoints(household.retirementSuccessDeltaPts, 0)} since last review
              </div>
            </div>
          </div>
          <RetirementFanChart projection={projection} />
          <div className="mt-1.5 flex gap-4 text-xs text-ink-muted">
            <Legend opacity={0.12} label="10th–90th percentile" />
            <Legend opacity={0.28} label="25th–75th percentile" />
            <div className="flex items-center gap-1.5">
              <div className="h-0.5 w-3.5 bg-pine" />
              Median outcome
            </div>
          </div>
        </div>
      }
      detailTitle="Plan assumptions"
      detail={
        <table className="w-full border-collapse text-sm">
          <tbody>
            <Row label={`Retirement age${spouse ? ` (${primary?.name.split(" ")[0]} / ${spouse.name.split(" ")[0]})` : ""}`}>
              {household.retirementAgePrimary}
              {household.retirementAgeSpouse ? ` / ${household.retirementAgeSpouse}` : ""}
            </Row>
            <Row label={`Social Security claim age${spouse ? ` (${primary?.name.split(" ")[0]} / ${spouse.name.split(" ")[0]})` : ""}`}>
              {household.ssClaimAgePrimary}
              {household.ssClaimAgeSpouse ? ` / ${household.ssClaimAgeSpouse}` : ""}
            </Row>
            <Row label="Monthly spending need (today's dollars)">{formatMoney(household.monthlySpendingNeedCents)}</Row>
            <Row label="Withdrawal sequencing">{household.withdrawalSequencing}</Row>
          </tbody>
        </table>
      }
      insights={household.insights.map((i) => ({ id: i.id, text: i.text, sourceLabel: i.sourceLabel }))}
      provenance="Projection: Monte Carlo simulation (400 paths) run today using custodian-fed balances and manually entered spending assumptions · Social Security estimates: manual entry, unverified — confirm against each member's SSA.gov statement."
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

function Legend({ opacity, label }: { opacity: number; label: string }) {
  return (
    <div className="flex items-center gap-1.5">
      <div className="h-2 w-3.5 rounded-cell bg-pine" style={{ opacity }} />
      {label}
    </div>
  );
}

function hashCode(str: string) {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    hash = (hash << 5) - hash + str.charCodeAt(i);
    hash |= 0;
  }
  return hash >>> 0;
}
