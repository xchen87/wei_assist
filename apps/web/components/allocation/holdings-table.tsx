import { formatMoney } from "@/lib/format/money";
import {
  ASSET_CLASS_LABEL,
  isSingleName,
  type PortfolioSummary,
} from "@/lib/calc/holdings";

/** Every position, grouped by asset class with a subtotal per class.
 *
 * This is the section's table of record: the figures in the header above
 * it — the mix, the blended expense ratio, the distinct-holdings count,
 * the largest position — are all rolled up from these rows, so an advisor
 * checking one against the other finds them agreeing. */
export function HoldingsTable({
  summary,
  thresholdPct,
}: {
  summary: PortfolioSummary;
  thresholdPct: number;
}) {
  if (summary.rows.length === 0) {
    return (
      <p className="rounded-card border border-dashed border-rule px-4 py-6 text-sm text-ink-muted">
        No positions on file for this household yet. They arrive with the custodian feed, or can
        be entered by hand once accounts are linked.
      </p>
    );
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full min-w-[720px] border-collapse text-sm">
        <thead>
          <tr className="border-b border-rule text-xs font-semibold text-ink-muted">
            <th className="py-2 text-left">Holding</th>
            <th className="py-2 text-left">Type</th>
            <th className="py-2 pr-4 text-right">Value</th>
            <th className="py-2 pr-4 text-right">% of class</th>
            <th className="py-2 pr-4 text-right">% of book</th>
            <th className="py-2 pr-4 text-right">Unrealised</th>
            <th className="py-2 text-right">Expense</th>
          </tr>
        </thead>

        {summary.groups.map((group) => (
          <tbody key={group.assetClass}>
            <tr className="border-b border-rule bg-paper">
              <td className="py-2 text-sm font-semibold" colSpan={2}>
                {ASSET_CLASS_LABEL[group.assetClass] ?? group.assetClass}
              </td>
              <td className="tabular py-2 pr-4 text-right font-semibold">
                {formatMoney(group.valueCents, { compact: true })}
              </td>
              <td className="tabular py-2 pr-4 text-right text-ink-muted">—</td>
              <td className="tabular py-2 pr-4 text-right font-semibold">
                {group.portfolioPct.toFixed(1)}%
              </td>
              <td className="py-2 pr-4" />
              <td className="py-2" />
            </tr>

            {group.holdings.map((holding) => {
              const breach = isSingleName(holding) && holding.portfolioPct > thresholdPct;
              return (
                <tr key={holding.id} className="border-b border-rule">
                  <td className="py-2.5 pr-3">
                    <span className="tabular font-semibold">{holding.ticker}</span>{" "}
                    <span className="text-ink-muted">{holding.name}</span>
                    {breach ? (
                      <span className="ml-2 rounded-control border border-brass px-1.5 py-0.5 text-[11px] text-brass">
                        over {thresholdPct}%
                      </span>
                    ) : null}
                  </td>
                  <td className="py-2.5 pr-3 text-xs text-ink-muted">
                    {holding.kind}
                    {holding.sector ? ` · ${holding.sector}` : ""}
                    {holding.region !== "US" ? ` · ${holding.region}` : ""}
                  </td>
                  <td className="tabular py-2.5 pr-4 text-right">
                    {formatMoney(holding.marketValueCents, { compact: true })}
                  </td>
                  <td className="tabular py-2.5 pr-4 text-right text-ink-muted">
                    {holding.classPct.toFixed(1)}%
                  </td>
                  <td className="tabular py-2.5 pr-4 text-right">
                    {holding.portfolioPct.toFixed(1)}%
                  </td>
                  <td
                    className={`tabular py-2.5 pr-4 text-right ${holding.gainCents >= 0 ? "text-gain" : "text-loss"}`}
                  >
                    {holding.gainCents >= 0 ? "+" : "−"}
                    {formatMoney(Math.abs(holding.gainCents), { compact: true })}
                  </td>
                  <td className="tabular py-2.5 text-right text-ink-muted">
                    {holding.expenseRatioPct > 0 ? `${holding.expenseRatioPct.toFixed(2)}%` : "—"}
                  </td>
                </tr>
              );
            })}
          </tbody>
        ))}

        <tfoot>
          <tr className="border-t-2 border-ink-muted text-sm font-semibold">
            <td className="py-2.5">
              {summary.distinctHoldings} holdings · largest {summary.largest?.ticker}
            </td>
            <td className="py-2.5" />
            <td className="tabular py-2.5 pr-4 text-right">
              {formatMoney(summary.totalCents, { compact: true })}
            </td>
            <td className="py-2.5 pr-4" />
            <td className="tabular py-2.5 pr-4 text-right">100.0%</td>
            <td className="py-2.5 pr-4" />
            <td className="tabular py-2.5 text-right">
              {summary.blendedExpenseRatioPct.toFixed(2)}%
            </td>
          </tr>
        </tfoot>
      </table>
    </div>
  );
}
