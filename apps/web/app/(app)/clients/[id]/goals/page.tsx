import { notFound } from "next/navigation";
import { prisma } from "@meridian/db";
import { PlanSection } from "@/components/plan/plan-section";
import { SectionActions } from "@/components/plan/section-actions";
import { GoalsBubbleQuadrant } from "@/components/charts/goals-bubble-quadrant";
import { formatMoney } from "@/lib/format/money";
import { Badge } from "@/components/ui/badge";

export const dynamic = "force-dynamic";

const STATUS_LABEL: Record<string, string> = {
  onTrack: "On track",
  fullyFunded: "Fully funded",
  behind: "Behind",
};
const STATUS_TONE: Record<string, "pine" | "brass" | "loss"> = {
  onTrack: "pine",
  fullyFunded: "pine",
  behind: "loss",
};

export default async function GoalsPage({ params }: { params: { id: string } }) {
  const household = await prisma.household.findUnique({
    where: { id: params.id },
    include: { goals: true, insights: { where: { dismissed: false, section: "Goals" } } },
  });
  if (!household) notFound();

  return (
    <PlanSection
      title="Goals"
      completenessPct={household.goalsCompletenessPct}
      updatedLabel="Recalculated today · Balance + Goals sections"
      actions={<SectionActions />}
      summaryTitle="Priority vs. funded status"
      summarySubtitle="Bubble size shows target amount"
      summary={<GoalsBubbleQuadrant goals={household.goals} />}
      detailTitle="All goals"
      detail={
        <table className="w-full border-collapse text-sm">
          <thead>
            <tr className="border-b border-rule text-xs font-semibold text-ink-muted">
              <th className="py-2 text-left">GOAL</th>
              <th className="py-2 text-left">PRIORITY</th>
              <th className="py-2 text-right">TARGET</th>
              <th className="py-2 text-right">FUNDED</th>
              <th className="py-2 text-left">STATUS</th>
            </tr>
          </thead>
          <tbody>
            {household.goals.map((g) => (
              <tr key={g.id} className="border-b border-rule">
                <td className="py-2.5 font-medium">{g.name}</td>
                <td className="py-2.5 text-ink-muted">{g.priority}</td>
                <td className="tabular py-2.5 text-right">{formatMoney(g.targetCents)}</td>
                <td className="tabular py-2.5 text-right">{g.fundedPct}%</td>
                <td className="py-2.5">
                  <Badge tone={STATUS_TONE[g.status]}>{STATUS_LABEL[g.status]}</Badge>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      }
      insights={household.insights.map((i) => ({ id: i.id, text: i.text, sourceLabel: i.sourceLabel, householdId: i.householdId, section: i.section }))}
      provenance="Funded percentages: calculated from Balance + Goals sections · Priority: set by the household in its last full review."
    />
  );
}
