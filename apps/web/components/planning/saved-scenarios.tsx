"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { Badge } from "@/components/ui/badge";
import { formatMoney } from "@/lib/format/money";
import { deleteScenario, setRecommended } from "@/app/(app)/clients/[id]/planning/actions";

export type SavedScenarioRow = {
  id: string;
  name: string;
  kind: string;
  successProbabilityPct: number;
  deltaPts: number;
  medianEndingCents: number;
  summary: string;
};

/** Saved scenarios, side by side with what they do to the outcome. A
 * planning conversation ends with a comparison — "here are the three we
 * looked at, here is the one I'd recommend" — so the list carries the
 * probability and the delta rather than making the advisor reopen each. */
export function SavedScenarios({
  householdId,
  scenarios,
  baselineProbability,
}: {
  householdId: string;
  scenarios: SavedScenarioRow[];
  baselineProbability: number;
}) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  if (scenarios.length === 0) {
    return (
      <div className="rounded-card border border-dashed border-rule p-5 text-sm text-ink-muted">
        No saved scenarios yet. Move a lever above and save it to compare options side by side.
      </div>
    );
  }

  return (
    <table className="w-full border-collapse text-sm">
      <thead>
        <tr className="border-b border-rule text-xs font-semibold text-ink-muted">
          <th className="py-2 text-left">SCENARIO</th>
          <th className="py-2 text-left">CHANGES</th>
          <th className="py-2 pr-6 text-right">SUCCESS</th>
          <th className="py-2 pr-6 text-right">VS PLAN</th>
          <th className="py-2 pr-6 text-right">MEDIAN END</th>
          <th className="py-2 text-left">ACTIONS</th>
        </tr>
      </thead>
      <tbody>
        <tr className="border-b border-rule">
          <td className="py-2.5 font-medium">Plan of record</td>
          <td className="py-2.5 text-ink-muted">What the household record says today</td>
          <td className="tabular py-2.5 pr-6 text-right font-semibold">{baselineProbability}%</td>
          <td className="tabular py-2.5 pr-6 text-right text-ink-muted">—</td>
          <td className="tabular py-2.5 pr-6 text-right text-ink-muted">—</td>
          <td className="py-2.5" />
        </tr>
        {scenarios.map((s) => (
          <tr key={s.id} className="border-b border-rule">
            <td className="py-2.5">
              <div className="flex items-center gap-2">
                <span className="font-medium">{s.name}</span>
                {s.kind === "recommended" ? <Badge tone="pine">Recommended</Badge> : null}
              </div>
            </td>
            <td className="py-2.5 text-ink-muted">{s.summary}</td>
            <td className="tabular py-2.5 pr-6 text-right font-semibold">{s.successProbabilityPct}%</td>
            <td
              className={`tabular py-2.5 pr-6 text-right font-semibold ${
                s.deltaPts > 0 ? "text-gain" : s.deltaPts < 0 ? "text-loss" : "text-ink-muted"
              }`}
            >
              {s.deltaPts > 0 ? "+" : s.deltaPts < 0 ? "−" : "±"}
              {Math.abs(s.deltaPts)} pts
            </td>
            <td className="tabular py-2.5 pr-6 text-right">
              {formatMoney(s.medianEndingCents, { compact: true })}
            </td>
            <td className="py-2.5">
              <div className="flex gap-2">
                {s.kind === "recommended" ? null : (
                  <button
                    disabled={isPending}
                    onClick={() =>
                      startTransition(async () => {
                        await setRecommended(householdId, s.id);
                        router.refresh();
                      })
                    }
                    className="rounded-control border border-rule px-2 py-1 text-xs font-semibold disabled:opacity-50"
                  >
                    Recommend
                  </button>
                )}
                <button
                  disabled={isPending}
                  onClick={() =>
                    startTransition(async () => {
                      await deleteScenario(householdId, s.id);
                      router.refresh();
                    })
                  }
                  className="rounded-control border border-rule px-2 py-1 text-xs text-ink-muted disabled:opacity-50"
                >
                  Delete
                </button>
              </div>
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}
