import { formatMoney } from "@/lib/format/money";
import {
  ASSET_CLASS_LABEL,
  isSingleName,
  type PortfolioSummary,
} from "@/lib/calc/holdings";

/** Every position, grouped by asset class with a subtotal per class.
 *
 * One row per *position*, which is the point of the account layer: the
 * same fund in a brokerage account and an IRA is two rows, because the
 * two are not the same holding on the way out. The breakdown above
 * answers the other question — what is held, regardless of where — and
 * works per security.
 *
 * This is the section's table of record: the figures in the header above
 * it are all rolled up from these rows, so an advisor checking one
 * against the other finds them agreeing. */
export function HoldingsTable({
  summary,
  thresholdPct,
  accountNameByHoldingId,
  securityPortfolioPctByTicker,
}: {
  summary: PortfolioSummary;
  thresholdPct: number;
  /** Which account each position sits in. A fund held in both a brokerage
   * account and an IRA is two rows here, which is what the custodian
   * reports and what makes each lot's tax treatment knowable. */
  accountNameByHoldingId: Map<string, string>;
  /** The security's share of the portfolio across *all* accounts. A name
   * split between a brokerage account and an IRA breaches the limit on
   * the total or not at all, so the badge is decided on this rather than
   * on the row's own weight. */
  securityPortfolioPctByTicker: Map<string, number>;
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
      <table className="w-full min-w-[860px] border-collapse text-sm">
        <thead>
          <tr className="border-b border-rule text-xs font-semibold text-ink-muted">
            <th className="py-2 text-left">Holding</th>
            <th className="py-2 text-left">Account</th>
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
              <td className="py-2 text-sm font-semibold" colSpan={3}>
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
              const securityPct =
                securityPortfolioPctByTicker.get(holding.ticker) ?? holding.portfolioPct;
              const breach = isSingleName(holding) && securityPct > thresholdPct;
              return (
                <tr key={holding.id} className="border-b border-rule">
                  <td className="py-2.5 pr-3">
                    <span className="tabular font-semibold">{holding.ticker}</span>{" "}
                    <span className="text-ink-muted">{holding.name}</span>
                    {breach ? (
                      <span
                        className="ml-2 rounded-control border border-brass px-1.5 py-0.5 text-[11px] text-brass"
                        title={`${securityPct.toFixed(1)}% of the portfolio across all accounts`}
                      >
                        over {thresholdPct}%
                      </span>
                    ) : null}
                  </td>
                  <td className="py-2.5 pr-3 text-xs text-ink-muted">
                    {accountNameByHoldingId.get(holding.id) ?? "—"}
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
              {summary.distinctHoldings} positions · largest {summary.largest?.ticker}
            </td>
            <td className="py-2.5" />
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
