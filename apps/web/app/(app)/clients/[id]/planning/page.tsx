import { notFound } from "next/navigation";
import { prisma } from "@meridian/db";
import { ScenarioExplorer } from "@/components/planning/scenario-explorer";
import { SavedScenarios, type SavedScenarioRow } from "@/components/planning/saved-scenarios";
import { projectScenario } from "@/lib/calc/planning";
import { applyScenario, buildBaseline, seedFor } from "@/lib/planning/baseline";
import { describeChanges } from "@/lib/planning/describe";

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

    return {
      id: scenario.id,
      name: scenario.name,
      kind: scenario.kind,
      successProbabilityPct: result.successProbabilityPct,
      deltaPts: result.successProbabilityPct - baseResult.successProbabilityPct,
      medianEndingCents: result.medianEndingCents,
      // Say what the scenario actually changed, in the advisor's words — a
      // row called "Scenario 2" tells nobody anything six weeks later. The
      // same function writes the chips under the live explorer, so the two
      // can't drift apart.
      summary: describeChanges(baseline, applied).join(" · ") || "No changes from the plan of record",
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
        Move a lever and the projection recomputes against the plan of record. Retirement, longevity,
        claiming, pensions, phased work and saving are per member, because two people in one household
        rarely stop on the same day and the outcome is the interaction of the two. Spending, market
        assumptions, tax and one-off events belong to the household.
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

      <div className="mt-7 max-w-[860px] border-t border-rule pt-3 text-xs leading-relaxed text-ink-muted">
        <span className="font-semibold text-ink">Illustrative projection.</span> Returns are a single
        real mean-and-volatility draw. Longevity is a stated plan-to age, not a mortality table. Tax is
        one effective rate grossed up on portfolio withdrawals — there is no withdrawal ordering,
        bracket model or account-type sequencing. The shape of the answer is real; the precision is
        not.{" "}
        <span className="font-semibold text-ink">Figures you enter, not figures we derive.</span>{" "}
        Social Security, pensions and part-time earnings each depend on a record this app
        doesn&rsquo;t hold — an earnings history, a plan document, an employment agreement — so the
        advisor enters them. Every lever starts at a value that changes nothing, so no assumption
        reaches the projection without an advisor putting it there. Per-member savings splits the
        household&rsquo;s recorded savings evenly across working members until intake&rsquo;s
        per-member figures reach the seeded households.
      </div>
    </div>
  );
}
