import { notFound } from "next/navigation";
import { prisma } from "@meridian/db";
import { ScenarioExplorer } from "@/components/planning/scenario-explorer";
import { SavedScenarios, type SavedScenarioRow } from "@/components/planning/saved-scenarios";
import { projectScenario } from "@/lib/calc/planning";
import { applyScenario, buildBaseline, seedFor } from "@/lib/planning/baseline";
import { formatMoney } from "@/lib/format/money";

export const dynamic = "force-dynamic";

/** Planning: scenarios across the four disciplines below it.
 *
 * The explorer answers "what if", per member, against the plan of record.
 * Saved scenarios sit underneath so a conversation can end with a
 * comparison rather than a single number. Every projection here is
 * illustrative — stated on the page, because a probability of success
 * carries more authority than it has earned. */
export default async function PlanningPage({ params }: { params: { id: string } }) {
  const household = await prisma.household.findUnique({
    where: { id: params.id },
    include: {
      members: true,
      goals: true,
      scenarios: { include: { members: true }, orderBy: { createdAt: "asc" } },
    },
  });
  if (!household) notFound();

  const baseline = buildBaseline(household);
  const seed = seedFor(household.id);
  const baseResult = projectScenario({ ...baseline, seed });

  const rows: SavedScenarioRow[] = household.scenarios.map((scenario) => {
    const applied = applyScenario(baseline, scenario);
    const result = projectScenario({ ...applied, seed });

    // Say what the scenario actually changed, in the advisor's words —
    // a row called "Scenario 2" tells nobody anything six weeks later.
    const changes: string[] = [];
    for (const adjustment of scenario.members) {
      const member = baseline.members.find((m) => m.id === adjustment.memberId);
      if (!member) continue;
      const first = member.name.split(" ")[0];
      if (adjustment.retirementAge !== null && adjustment.retirementAge !== member.retirementAge) {
        changes.push(`${first} retires at ${adjustment.retirementAge}`);
      }
      if (adjustment.ssClaimAge !== null && adjustment.ssClaimAge !== member.ssClaimAge) {
        changes.push(`${first} claims at ${adjustment.ssClaimAge}`);
      }
      if (adjustment.annualSavingsCents !== null) {
        changes.push(`${first} saves ${formatMoney(adjustment.annualSavingsCents, { compact: true })}/yr`);
      }
      if (adjustment.ssMonthlyBenefitCents !== null) {
        changes.push(`${first} SS ${formatMoney(adjustment.ssMonthlyBenefitCents)}/mo`);
      }
    }
    if (scenario.retirementSpendingCents !== null) {
      changes.push(`spends ${formatMoney(scenario.retirementSpendingCents, { compact: true })}/yr`);
    }
    if (scenario.realReturnPct !== null) changes.push(`${scenario.realReturnPct}% real return`);

    return {
      id: scenario.id,
      name: scenario.name,
      kind: scenario.kind,
      successProbabilityPct: result.successProbabilityPct,
      deltaPts: result.successProbabilityPct - baseResult.successProbabilityPct,
      medianEndingCents: result.medianEndingCents,
      summary: changes.join(" · ") || "No changes from the plan of record",
    };
  });

  const planners = baseline.members.length;

  return (
    <div className="px-8 pb-10 pt-6">
      <div className="mb-1 flex items-baseline justify-between">
        <h2 className="text-lg font-semibold">Scenarios</h2>
        <div className="text-xs text-ink-muted">
          {planners} {planners === 1 ? "person" : "people"} · plan to age {baseline.endAge}
        </div>
      </div>
      <p className="mb-5 max-w-[760px] text-sm text-ink-muted">
        Move a lever and the projection recomputes against the plan of record. Retirement and claim
        ages are per member, because two people in one household rarely stop on the same day and the
        outcome is the interaction of the two.
      </p>

      {planners === 0 ? (
        <div className="rounded-card border border-dashed border-rule p-6 text-sm text-ink-muted">
          This household has no adult members on file yet, so there is nothing to project. Add them
          in the Household section first.
        </div>
      ) : (
        <>
          <ScenarioExplorer householdId={household.id} baseline={baseline} seed={seed} />

          <div className="mb-2.5 mt-8 text-sm font-semibold">Saved scenarios</div>
          <SavedScenarios
            householdId={household.id}
            scenarios={rows}
            baselineProbability={baseResult.successProbabilityPct}
          />
        </>
      )}

      <div className="mt-7 border-t border-rule pt-3 text-xs text-ink-muted">
        Illustrative projection: real returns are a single mean-and-volatility draw, with no mortality
        table, no tax-aware withdrawal ordering and no inflation path — the shape of the answer is
        real, the precision is not. Social Security is an input, not a calculation: benefits depend on
        an earnings record this app doesn&rsquo;t hold, so the advisor enters the figure from the
        client&rsquo;s SSA statement. Per-member savings splits the household&rsquo;s recorded savings
        evenly across working members until intake&rsquo;s per-member figures reach the seeded
        households.
      </div>
    </div>
  );
}
