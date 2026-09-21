import { notFound } from "next/navigation";
import { prisma } from "@meridian/db";
import { applyScenario, buildBaseline, seedFor } from "@/lib/planning/baseline";
import { comparePlans } from "@/lib/planning/compare";
import { readMarketSnapshot } from "@/lib/planning/market";
import { ComparePanel } from "@/components/planning/compare-panel";

export const dynamic = "force-dynamic";

/**
 * Compare: one scenario against the plan of record, under one set of
 * market conditions, with the assistant's read on it.
 *
 * The numbers are computed here and on the server — `lib/calc` is tested
 * and the model is not asked to derive anything. What the assistant adds
 * is the part it is actually good at: saying what the change buys, what
 * it costs, and what to do next.
 */
export default async function ComparePage({
  params,
  searchParams,
}: {
  params: { id: string };
  searchParams: { scenario?: string };
}) {
  const household = await prisma.household.findUnique({
    where: { id: params.id },
    include: {
      members: true,
      goals: true,
      scenarios: { include: { members: true, goals: true }, orderBy: { createdAt: "desc" } },
    },
  });
  if (!household) notFound();

  const baseline = buildBaseline(household);
  const seed = seedFor(household.id);
  const market = await readMarketSnapshot();

  // Default to the recommendation if there is one — it is the scenario
  // the advisor already decided was worth presenting — and otherwise the
  // most recent.
  const selected =
    household.scenarios.find((s) => s.id === searchParams.scenario) ??
    household.scenarios.find((s) => s.kind === "recommended") ??
    household.scenarios[0] ??
    null;

  const comparison = selected ? comparePlans(baseline, applyScenario(baseline, selected), seed) : null;

  return (
    <div className="px-8 pb-10 pt-6">
      <div className="mb-1 flex items-baseline justify-between gap-4">
        <h2 className="text-lg font-semibold">Compare</h2>
        <div className="text-xs text-ink-muted">
          Market conditions as of {market.asOf.toISOString().slice(0, 10)}
        </div>
      </div>
      <p className="mb-5 max-w-[820px] text-sm text-ink-muted">
        A saved scenario against the plan of record, both projected under the same market
        conditions so the difference is the plan&rsquo;s doing and not the yardstick&rsquo;s. The
        assistant reads the comparison and writes it up; the figures it quotes are the ones
        computed here.
      </p>

      {selected === null || comparison === null ? (
        <div className="rounded-card border border-dashed border-rule p-6 text-sm text-ink-muted">
          No saved scenarios for this household yet. Build one on the Scenarios tab and save it,
          then come back to compare it against the plan of record.
        </div>
      ) : (
        <ComparePanel
          householdId={household.id}
          householdName={household.name}
          scenarios={household.scenarios.map((s) => ({ id: s.id, name: s.name, kind: s.kind }))}
          selectedId={selected.id}
          selectedName={selected.name}
          comparison={{
            recordPct: comparison.record.successProbabilityPct,
            scenarioPct: comparison.full.successProbabilityPct,
            planPts: comparison.planPts,
            marketPts: comparison.marketPts,
            totalPts: comparison.totalPts,
            likeForLike: comparison.likeForLike,
            assumptionChanges: comparison.assumptionChanges,
            changes: comparison.changes,
            recordMedianCents: comparison.record.medianEndingCents,
            scenarioMedianCents: comparison.full.medianEndingCents,
            recordP10Cents: comparison.record.p10EndingCents,
            scenarioP10Cents: comparison.full.p10EndingCents,
            recordFirstRetirementYear: comparison.record.firstRetirementYear,
            scenarioFirstRetirementYear: comparison.full.firstRetirementYear,
            goals: comparison.goals,
          }}
          market={{ asOf: market.asOf.toISOString().slice(0, 10), items: market.items }}
        />
      )}

      <div className="mt-7 max-w-[860px] border-t border-rule pt-3 text-xs leading-relaxed text-ink-muted">
        <span className="font-semibold text-ink">How the comparison is run.</span> Both plans are
        projected with the same seed and the same market assumptions — the plan of record&rsquo;s —
        so the headline difference is attributable to the plan changes alone. If the scenario also
        moves a return, volatility or inflation assumption, that part is reported separately,
        because it would have moved the number with the plan untouched.{" "}
        <span className="font-semibold text-ink">The indicator feed is simulated</span> and
        labelled as such throughout; it is context for the review, not an input — no return
        assumption is derived from it. The projection is illustrative in the same terms as the
        rest of Planning: no mortality table, no tax-aware withdrawal ordering, one effective tax
        rate.
      </div>
    </div>
  );
}
