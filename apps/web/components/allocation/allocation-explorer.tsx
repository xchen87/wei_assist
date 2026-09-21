"use client";

import { useState } from "react";
import { AllocationRings, type AssetClassKey, type Mix } from "@/components/charts/allocation-rings";
import { HoldingsBars } from "@/components/charts/holdings-bars";
import { formatMoney } from "@/lib/format/money";
import {
  ASSET_CLASS_LABEL,
  concentratedPositions,
  summarisePortfolio,
  type Holding,
} from "@/lib/calc/holdings";

/**
 * Target versus actual, and what the actual is made of.
 *
 * The selection has to live in a client component because the Allocation
 * page is a server component and cannot hand a callback to a chart. That
 * is also why the rings and the holdings panel are composed here rather
 * than dropped side by side on the page: they are one control and one
 * readout, and the thing that connects them is which class you picked.
 */
export function AllocationExplorer({
  target,
  actual,
  holdings,
  thresholdPct,
}: {
  target: Mix;
  actual: Mix;
  holdings: Holding[];
  thresholdPct: number;
}) {
  const [selected, setSelected] = useState<AssetClassKey>("Equity");
  const summary = summarisePortfolio(holdings);
  const group = summary.groups.find((g) => g.assetClass === selected);
  const breaches = concentratedPositions(summary, thresholdPct);

  return (
    <div className="flex flex-col gap-5">
      <AllocationRings target={target} actual={actual} selected={selected} onSelect={setSelected} />

      <div className="border-t border-rule pt-4">
        <div className="mb-3 flex flex-wrap items-baseline justify-between gap-2">
          <h4 className="text-sm font-semibold">
            Inside {ASSET_CLASS_LABEL[selected]?.toLowerCase()}
          </h4>
          <div className="text-xs text-ink-muted">
            {group ? (
              <>
                <span className="tabular font-semibold text-ink">
                  {formatMoney(group.valueCents, { compact: true })}
                </span>{" "}
                across {group.holdings.length}{" "}
                {group.holdings.length === 1 ? "holding" : "holdings"}
              </>
            ) : (
              "Nothing held"
            )}
          </div>
        </div>

        <HoldingsBars
          holdings={group?.holdings ?? []}
          thresholdPct={thresholdPct}
          classSharePct={group?.portfolioPct ?? 0}
        />

        {breaches.length > 0 ? (
          <div className="mt-3 rounded-control border border-brass bg-brass-tint px-3 py-2 text-xs">
            Over the {thresholdPct}% single-name limit:{" "}
            {breaches
              .map((b) => `${b.name} (${b.ticker}) at ${b.portfolioPct.toFixed(1)}%`)
              .join(", ")}
            .
          </div>
        ) : null}
      </div>
    </div>
  );
}
