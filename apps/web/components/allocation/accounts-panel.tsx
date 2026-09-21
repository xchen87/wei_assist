import { formatMoney, formatSignedMoney } from "@/lib/format/money";
import { ASSET_CLASS_LABEL } from "@/lib/calc/holdings";
import {
  ACCOUNT_KIND_LABEL,
  TAX_TREATMENT_LABEL,
  type AccountSummary,
  type LocationCell,
} from "@/lib/calc/accounts";
import { CLASS_COLOR } from "@/lib/charts/asset-class";

const TREATMENT_TONE: Record<string, string> = {
  Taxable: "border-rule text-ink-muted",
  TaxDeferred: "border-info text-info",
  TaxFree: "border-gain text-gain",
};

/** A stacked bar of one account's or one treatment's asset mix. */
function MixBar({ mix }: { mix: { assetClass: string; sharePct: number }[] }) {
  return (
    <span className="flex h-1.5 w-full overflow-hidden rounded-full bg-rule">
      {mix.map((slice) => (
        <span
          key={slice.assetClass}
          style={{ width: `${slice.sharePct}%`, background: CLASS_COLOR[slice.assetClass] }}
          title={`${ASSET_CLASS_LABEL[slice.assetClass] ?? slice.assetClass} ${slice.sharePct.toFixed(0)}%`}
        />
      ))}
    </span>
  );
}

/**
 * The accounts the portfolio is held in, and what sits under each tax
 * treatment.
 *
 * Asset location is a statement of fact, deliberately: which sleeve is in
 * which kind of account is something the record knows, and whether that
 * arrangement is right for a household depends on brackets, horizons and
 * intentions it does not (§9 rule 4). The panel shows where things are
 * and leaves the judgement to the advisor.
 */
export function AccountsPanel({
  accounts,
  location,
}: {
  accounts: AccountSummary[];
  location: LocationCell[];
}) {
  if (accounts.length === 0) return null;

  return (
    <div className="flex flex-col gap-4">
      <div>
        <h4 className="mb-0.5 text-sm font-semibold">Accounts</h4>
        <p className="mb-3 text-xs text-ink-muted">
          {accounts.length} {accounts.length === 1 ? "account" : "accounts"} · the bar shows each
          account&rsquo;s own mix
        </p>

        <div className="grid gap-2.5 md:grid-cols-2">
          {accounts.map((account) => (
            <div key={account.id} className="rounded-card border border-rule p-3">
              <div className="flex items-baseline justify-between gap-2">
                <span className="truncate text-sm font-semibold">{account.name}</span>
                <span className="tabular shrink-0 text-sm font-semibold">
                  {formatMoney(account.valueCents, { compact: true })}
                </span>
              </div>

              <div className="mt-1 flex flex-wrap items-center gap-1.5 text-xs text-ink-muted">
                <span
                  className={`rounded-control border px-1.5 py-0.5 ${TREATMENT_TONE[account.taxTreatment] ?? "border-rule"}`}
                >
                  {TAX_TREATMENT_LABEL[account.taxTreatment] ?? account.taxTreatment}
                </span>
                <span>{ACCOUNT_KIND_LABEL[account.kind] ?? account.kind}</span>
                <span>· {account.custodian}</span>
                {/* No owner means joint or held by the household, which is
                    a fact about the account rather than a missing field. */}
                <span>· {account.ownerName ?? "Held jointly"}</span>
              </div>

              <div className="mt-2.5">
                <MixBar mix={account.mix} />
              </div>

              <div className="mt-1.5 flex justify-between text-xs text-ink-muted">
                <span className="tabular">{account.portfolioPct.toFixed(1)}% of the portfolio</span>
                <span className={`tabular ${account.gainCents >= 0 ? "text-gain" : "text-loss"}`}>
                  {formatSignedMoney(account.gainCents, { compact: true })} unrealised
                </span>
              </div>
            </div>
          ))}
        </div>
      </div>

      <div>
        <h4 className="mb-0.5 text-sm font-semibold">Asset location</h4>
        <p className="mb-3 text-xs text-ink-muted">
          Which sleeve is held under which tax treatment. What the record knows — not a judgement
          about whether it is the right arrangement.
        </p>

        <table className="w-full border-collapse text-sm">
          <thead>
            <tr className="border-b border-rule text-xs font-semibold text-ink-muted">
              <th className="py-2 text-left">Treatment</th>
              <th className="py-2 pr-4 text-right">Value</th>
              <th className="py-2 pr-4 text-right">% of book</th>
              <th className="py-2 text-left">Mix</th>
            </tr>
          </thead>
          <tbody>
            {location.map((cell) => (
              <tr key={cell.taxTreatment} className="border-b border-rule">
                <td className="py-2.5 pr-3 font-medium">
                  {TAX_TREATMENT_LABEL[cell.taxTreatment] ?? cell.taxTreatment}
                </td>
                <td className="tabular py-2.5 pr-4 text-right">
                  {formatMoney(cell.valueCents, { compact: true })}
                </td>
                <td className="tabular py-2.5 pr-4 text-right">
                  {cell.portfolioPct.toFixed(1)}%
                </td>
                <td className="py-2.5">
                  <div className="flex flex-wrap gap-x-3 gap-y-0.5 text-xs text-ink-muted">
                    {cell.byClass.map((slice) => (
                      <span key={slice.assetClass} className="flex items-center gap-1">
                        <span
                          className="h-2 w-2 rounded-full"
                          style={{ background: CLASS_COLOR[slice.assetClass] }}
                        />
                        {ASSET_CLASS_LABEL[slice.assetClass] ?? slice.assetClass}{" "}
                        <span className="tabular">{slice.sharePct.toFixed(0)}%</span>
                      </span>
                    ))}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
