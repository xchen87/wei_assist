import { notFound } from "next/navigation";
import { prisma } from "@meridian/db";
import { PlanSection } from "@/components/plan/plan-section";
import { SectionActions } from "@/components/plan/section-actions";
import { GoalsBubbleQuadrant } from "@/components/charts/goals-bubble-quadrant";
import { formatMoney, centsToNumber } from "@/lib/format/money";
import { Badge } from "@/components/ui/badge";

export const dynamic = "force-dynamic";

const STATUS_LABEL: Record<string, string> = {
  onTrack: "On track",
  fullyFunded: "Fully funded",
  behind: "Behind",
  unset: "No target yet",
};
const STATUS_TONE: Record<string, "pine" | "brass" | "loss" | "neutral"> = {
  onTrack: "pine",
  fullyFunded: "pine",
  behind: "loss",
  unset: "neutral",
};

export default async function GoalsPage({ params }: { params: { id: string } }) {
  const household = await prisma.household.findUnique({
    where: { id: params.id },
    include: { goals: true, insights: { where: { dismissed: false, section: "Goals" } } },
  });
  if (!household) notFound();

  // Split once: the chart can only plot goals that have been costed.
  //
  // The conversion is the point, not the filter. A type predicate said
  // these were numbers while the values were still bigint, so the chart's
  // Math.max threw "Cannot convert a BigInt value to a number" at runtime
  // with a clean typecheck — the compiler believed the assertion. Cents
  // cross to number here, at the boundary, like everywhere else (D-023).
  const costed = household.goals
    .filter((g) => g.targetCents !== null)
    .map((g) => ({ ...g, targetCents: centsToNumber(g.targetCents!) }));
  const uncosted = household.goals.filter((g) => g.targetCents === null);

  return (
    <PlanSection
      title="Goals"
      completenessPct={household.goalsCompletenessPct}
      updatedLabel="Recalculated today · Balance + Goals sections"
      actions={<SectionActions />}
      summaryTitle="Priority vs. funded status"
      summarySubtitle={
        uncosted.length === 0
          ? "Bubble size shows target amount"
          : `Bubble size shows target amount · ${uncosted.length} goal${uncosted.length === 1 ? "" : "s"} not costed yet, listed below but not plotted`
      }
      // A goal with no target has no bubble size and no funded percentage,
      // so it can't be placed on this chart honestly — it stays in the
      // table underneath, where "No target yet" is the useful statement.
      summary={<GoalsBubbleQuadrant goals={costed} />}
      detailTitle="All goals"
      detail={
        <table className="w-full border-collapse text-sm">
          <thead>
            <tr className="border-b border-rule text-xs font-semibold text-ink-muted">
              <th className="py-2 text-left">GOAL</th>
              <th className="py-2 text-left">PRIORITY</th>
              <th className="py-2 text-right">TARGET</th>
              <th className="py-2 text-right">FUNDED</th>
              <th className="py-2 text-left">HORIZON</th>
              <th className="py-2 text-left">STATUS</th>
            </tr>
          </thead>
          <tbody>
            {household.goals.map((g) => (
              <tr key={g.id} className="border-b border-rule">
                <td className="py-2.5 font-medium">{g.name}</td>
                <td className="py-2.5 text-ink-muted">{g.priority}</td>
                <td className="tabular py-2.5 text-right">
                  {g.targetCents === null ? <span className="text-ink-muted">—</span> : formatMoney(g.targetCents)}
                </td>
                <td className="tabular py-2.5 text-right">
                  {g.targetCents === null ? <span className="text-ink-muted">—</span> : `${g.fundedPct}%`}
                </td>
                <td className="py-2.5 text-ink-muted">{g.horizonLabel ?? "—"}</td>
                <td className="py-2.5">
                  <Badge tone={STATUS_TONE[g.status] ?? "neutral"}>{STATUS_LABEL[g.status] ?? g.status}</Badge>
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
