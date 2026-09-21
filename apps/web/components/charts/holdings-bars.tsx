"use client";

import { formatMoney } from "@/lib/format/money";
import { isSingleName, thresholdWithinClass, type HoldingRow } from "@/lib/calc/holdings";

/**
 * The holdings inside one asset class, as bars weighted by their share of
 * that class.
 *
 * Bars rather than a second ring: the question here is "how much of this
 * sleeve is that one" and a reader compares lengths far better than
 * angles, especially down a list of ten. The threshold marker is §8's
 * concentration visual, and it only applies to single names — a broad
 * fund at a quarter of the portfolio is diversification, not
 * concentration, so drawing a breach line across it would cry wolf on
 * every household in the book.
 */
export function HoldingsBars({
  holdings,
  thresholdPct,
  classSharePct,
}: {
  holdings: HoldingRow[];
  /** The single-name limit, as a share of the whole portfolio. */
  thresholdPct: number;
  /** What this class is worth as a share of the whole portfolio, which is
   * what converts that limit into the units the bars are drawn in. */
  classSharePct: number;
}) {
  if (holdings.length === 0) {
    return (
      <p className="rounded-card border border-dashed border-rule px-3 py-4 text-sm text-ink-muted">
        Nothing held in this class.
      </p>
    );
  }

  const widest = Math.max(...holdings.map((h) => h.classPct), 1);
  // The bars are scaled by share *of this class*; the limit is a share of
  // the whole *portfolio*. Drawing one against the other put the marker
  // far to the left of where it belongs and implied a breach on holdings
  // nowhere near the limit — a 10% portfolio limit is 17% of a class that
  // is 60% of the book.
  const markerLeftPct = (thresholdWithinClass(thresholdPct, classSharePct) / widest) * 100;
  const markerInRange = markerLeftPct <= 100 && holdings.some(isSingleName);

  return (
    <div className="flex flex-col gap-1.5">
      {holdings.map((holding) => {
        const single = isSingleName(holding);
        const breach = single && holding.portfolioPct > thresholdPct;
        return (
          <div key={holding.id} className="grid grid-cols-[160px_1fr_120px] items-center gap-3">
            <div className="min-w-0">
              <div className="truncate text-sm">
                <span className="font-semibold tabular">{holding.ticker}</span>{" "}
                <span className="text-ink-muted">{holding.name}</span>
              </div>
              <div className="text-xs text-ink-muted">
                {single ? holding.sector ?? "Single name" : holding.kind}
                {single ? " · single name" : ""}
              </div>
            </div>

            <div className="relative h-5">
              <div
                className={`absolute inset-y-0 left-0 rounded-sm ${breach ? "bg-brass" : "bg-pine"}`}
                style={{ width: `${(holding.classPct / widest) * 100}%` }}
              />
              {/* Only on the rows it governs. Drawn across a fund's bar
                  it is a line the bar visibly crosses, which reads as a
                  breach however the caption explains it away. */}
              {markerInRange && single ? (
                <div
                  className="absolute inset-y-0 w-px bg-loss"
                  style={{ left: `${markerLeftPct}%` }}
                  aria-hidden
                />
              ) : null}
            </div>

            <div className="text-right text-xs leading-snug">
              <div className="tabular font-semibold">
                {formatMoney(holding.marketValueCents, { compact: true })}
              </div>
              <div className="tabular text-ink-muted">{holding.classPct.toFixed(1)}% of class</div>
              <div className="tabular text-ink-muted">{holding.portfolioPct.toFixed(1)}% of book</div>
            </div>
          </div>
        );
      })}

      {markerInRange ? (
        <p className="mt-1 text-xs text-ink-muted">
          The red line marks {thresholdPct}% of the whole portfolio, the single-name
          concentration limit in this household&rsquo;s IPS. It is drawn only on single names:
          a diversified fund at a quarter of the book is not a concentrated position.
        </p>
      ) : null}
    </div>
  );
}
