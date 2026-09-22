"use client";

import { ASSET_CLASSES, ACCOUNT_KINDS, INPUT_CLASS, SECURITY_KINDS, emptyAccount, emptyHolding, type AccountRow, type HoldingRow, type MemberRow } from "./intake-types";
import { ASSET_CLASS_LABEL } from "@/lib/calc/holdings";
import { CLASS_COLOR } from "@/lib/charts/asset-class";
import { formatMoney, parseDollarsToCents } from "@/lib/format/money";

/** What the household holds, and where.
 *
 * Itemised rather than summarised, because a lump sum cannot answer the
 * questions the rest of the app asks of it. "$2.4M in investments" gives
 * no asset mix, no concentration, no tax treatment and no cost basis, so
 * Allocation, Tax and Planning all start empty on a household that was
 * fully described at intake. A position in an account gives all four.
 *
 * The allocation preview updates as rows are filled: the advisor is
 * entering an allocation whether they think of it that way or not, and
 * showing it back is how a fat-fingered market value gets caught here
 * rather than three screens later. */
export function AccountsStep({
  accounts,
  members,
  catalogue,
  onChange,
}: {
  accounts: AccountRow[];
  members: MemberRow[];
  /** Securities the firm already holds elsewhere, offered as suggestions.
   * Not a closed list — a client arrives holding what they hold. */
  catalogue: { ticker: string; name: string; assetClass: string; kind: string }[];
  onChange: (accounts: AccountRow[]) => void;
}) {
  const owners = members.filter((m) => m.name.trim()).map((m) => m.name.trim());

  const update = (index: number, patch: Partial<AccountRow>) =>
    onChange(accounts.map((a, i) => (i === index ? { ...a, ...patch } : a)));

  const updateHolding = (accountIndex: number, holdingIndex: number, patch: Partial<HoldingRow>) =>
    update(accountIndex, {
      holdings: accounts[accountIndex]!.holdings.map((h, i) =>
        i === holdingIndex ? { ...h, ...patch } : h,
      ),
    });

  const totals = allocationOf(accounts);

  return (
    <div>
      <h2 className="mb-0.5 text-base font-semibold">Accounts and holdings</h2>
      <p className="mb-4 text-sm text-ink-muted">
        What this household holds today, account by account. The tax treatment follows from the
        account type. Leave cost basis blank if it isn&rsquo;t to hand — everything else works
        without it, and an invented one would follow the household around.
      </p>

      {totals.totalCents > 0n ? (
        <div className="mb-4 rounded-card border border-rule p-3">
          <div className="mb-2 flex items-baseline justify-between">
            <span className="text-xs font-semibold">Allocation as entered</span>
            <span className="tabular text-sm font-semibold">{formatMoney(totals.totalCents)}</span>
          </div>
          <div className="flex h-2 w-full overflow-hidden rounded-full bg-rule">
            {ASSET_CLASSES.map((cls) => (
              <span
                key={cls.value}
                style={{ width: `${totals.pct[cls.value] ?? 0}%`, background: CLASS_COLOR[cls.value] }}
              />
            ))}
          </div>
          <div className="mt-1.5 flex flex-wrap gap-x-4 gap-y-0.5 text-xs text-ink-muted">
            {ASSET_CLASSES.map((cls) => (
              <span key={cls.value} className="flex items-center gap-1.5">
                <span className="h-2 w-2 rounded-full" style={{ background: CLASS_COLOR[cls.value] }} />
                {ASSET_CLASS_LABEL[cls.value] ?? cls.label}{" "}
                <span className="tabular">{(totals.pct[cls.value] ?? 0).toFixed(1)}%</span>
              </span>
            ))}
          </div>
        </div>
      ) : null}

      <datalist id="intake-securities">
        {catalogue.map((s) => (
          <option key={s.ticker} value={s.ticker}>
            {s.name}
          </option>
        ))}
      </datalist>

      <div className="flex flex-col gap-3">
        {accounts.map((account, accountIndex) => {
          const accountCents = account.holdings.reduce<bigint>(
            (sum, h) => sum + (parseDollarsToCents(h.marketValue) ?? 0n),
            0n,
          );
          return (
            <div key={accountIndex} className="rounded-card border border-rule p-3.5">
              <div className="mb-3 flex items-baseline justify-between gap-2">
                <span className="text-sm font-semibold">
                  {account.name.trim() || `Account ${accountIndex + 1}`}
                </span>
                <span className="flex items-center gap-3">
                  <span className="tabular text-sm font-semibold">{formatMoney(accountCents)}</span>
                  <button
                    onClick={() => onChange(accounts.filter((_, i) => i !== accountIndex))}
                    disabled={accounts.length === 1}
                    className="text-xs text-ink-muted underline decoration-dotted underline-offset-2 hover:text-ink disabled:opacity-40"
                  >
                    Remove
                  </button>
                </span>
              </div>

              <div className="mb-3 grid grid-cols-4 gap-2">
                <Field label="Account name">
                  <input
                    value={account.name}
                    onChange={(e) => update(accountIndex, { name: e.target.value })}
                    placeholder="e.g. Joint brokerage"
                    className={INPUT_CLASS}
                  />
                </Field>
                <Field label="Type">
                  <select
                    value={account.kind}
                    onChange={(e) => update(accountIndex, { kind: e.target.value })}
                    className={INPUT_CLASS}
                  >
                    {ACCOUNT_KINDS.map((k) => (
                      <option key={k.value} value={k.value}>
                        {k.label}
                      </option>
                    ))}
                  </select>
                </Field>
                <Field label="Custodian">
                  <input
                    value={account.custodian}
                    onChange={(e) => update(accountIndex, { custodian: e.target.value })}
                    placeholder="Where it's held"
                    className={INPUT_CLASS}
                  />
                </Field>
                <Field label="Owner">
                  <select
                    value={account.ownerName}
                    onChange={(e) => update(accountIndex, { ownerName: e.target.value })}
                    className={INPUT_CLASS}
                  >
                    <option value="">Held jointly</option>
                    {owners.map((name) => (
                      <option key={name} value={name}>
                        {name}
                      </option>
                    ))}
                  </select>
                </Field>
              </div>

              <table className="w-full border-collapse text-sm">
                <thead>
                  <tr className="border-b border-rule text-xs font-semibold text-ink-muted">
                    <th className="py-1.5 text-left">Ticker</th>
                    <th className="py-1.5 text-left">Name</th>
                    <th className="py-1.5 text-left">Class</th>
                    <th className="py-1.5 text-left">Type</th>
                    <th className="py-1.5 text-right">Market value</th>
                    <th className="py-1.5 text-right">Cost basis</th>
                    <th />
                  </tr>
                </thead>
                <tbody>
                  {account.holdings.map((holding, holdingIndex) => (
                    <tr key={holdingIndex} className="border-b border-rule">
                      <td className="py-1.5 pr-2">
                        <input
                          value={holding.ticker}
                          list="intake-securities"
                          onChange={(e) => {
                            const ticker = e.target.value.toUpperCase();
                            const known = catalogue.find((s) => s.ticker === ticker);
                            // Picking something the firm already holds
                            // fills the rest of the row; typing something
                            // new leaves it to the advisor.
                            updateHolding(accountIndex, holdingIndex, known
                              ? { ticker, name: known.name, assetClass: known.assetClass, kind: known.kind }
                              : { ticker });
                          }}
                          placeholder="ABCD"
                          className={`${INPUT_CLASS} tabular w-24 px-2 py-1`}
                        />
                      </td>
                      <td className="py-1.5 pr-2">
                        <input
                          value={holding.name}
                          onChange={(e) => updateHolding(accountIndex, holdingIndex, { name: e.target.value })}
                          placeholder="Security name"
                          className={`${INPUT_CLASS} px-2 py-1`}
                        />
                      </td>
                      <td className="py-1.5 pr-2">
                        <select
                          value={holding.assetClass}
                          onChange={(e) => updateHolding(accountIndex, holdingIndex, { assetClass: e.target.value })}
                          className={`${INPUT_CLASS} w-32 px-2 py-1`}
                        >
                          {ASSET_CLASSES.map((c) => (
                            <option key={c.value} value={c.value}>
                              {c.label}
                            </option>
                          ))}
                        </select>
                      </td>
                      <td className="py-1.5 pr-2">
                        <select
                          value={holding.kind}
                          onChange={(e) => updateHolding(accountIndex, holdingIndex, { kind: e.target.value })}
                          className={`${INPUT_CLASS} w-24 px-2 py-1`}
                        >
                          {SECURITY_KINDS.map((k) => (
                            <option key={k} value={k}>
                              {k}
                            </option>
                          ))}
                        </select>
                      </td>
                      <td className="py-1.5 pr-2">
                        <MoneyCell
                          value={holding.marketValue}
                          onChange={(v) => updateHolding(accountIndex, holdingIndex, { marketValue: v })}
                        />
                      </td>
                      <td className="py-1.5 pr-2">
                        <MoneyCell
                          value={holding.costBasis}
                          onChange={(v) => updateHolding(accountIndex, holdingIndex, { costBasis: v })}
                        />
                      </td>
                      <td className="py-1.5 text-right">
                        <button
                          onClick={() =>
                            update(accountIndex, {
                              holdings: account.holdings.filter((_, i) => i !== holdingIndex),
                            })
                          }
                          disabled={account.holdings.length === 1}
                          className="text-xs text-ink-muted hover:text-ink disabled:opacity-40"
                        >
                          ×
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>

              <button
                onClick={() => update(accountIndex, { holdings: [...account.holdings, emptyHolding()] })}
                className="mt-2 text-xs font-semibold text-pine"
              >
                + Add holding
              </button>
            </div>
          );
        })}
      </div>

      <button
        onClick={() => onChange([...accounts, emptyAccount()])}
        className="mt-3 text-sm font-semibold text-pine"
      >
        + Add account
      </button>

      <p className="mt-4 border-t border-rule pt-3 text-xs text-ink-muted">
        Leave this step empty if the household&rsquo;s accounts haven&rsquo;t been gathered yet.
        Allocation will read 0% complete and say so, which is the true answer until they are.
      </p>
    </div>
  );
}

/** The asset mix implied by what has been entered so far. Shared with the
 * review step, so the two cannot disagree. */
export function allocationOf(accounts: AccountRow[]): {
  totalCents: bigint;
  byClass: Record<string, bigint>;
  pct: Record<string, number>;
} {
  const byClass: Record<string, bigint> = {};
  let totalCents = 0n;
  for (const account of accounts) {
    for (const holding of account.holdings) {
      const value = parseDollarsToCents(holding.marketValue);
      if (value === null || value <= 0n) continue;
      byClass[holding.assetClass] = (byClass[holding.assetClass] ?? 0n) + value;
      totalCents += value;
    }
  }
  const pct: Record<string, number> = {};
  for (const [cls, cents] of Object.entries(byClass)) {
    // Percentages are number math; cents are bigint, so convert before
    // dividing — bigint division truncates (D-023).
    pct[cls] = Math.round((Number(cents) / Number(totalCents)) * 1000) / 10;
  }
  return { totalCents, byClass, pct };
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="mb-1 block text-xs text-ink-muted">{label}</span>
      {children}
    </label>
  );
}

function MoneyCell({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  return (
    <div className="relative">
      <span className="pointer-events-none absolute left-2 top-1/2 -translate-y-1/2 text-xs text-ink-muted">
        $
      </span>
      <input
        value={value}
        inputMode="numeric"
        onChange={(e) => onChange(e.target.value)}
        placeholder="0"
        className={`${INPUT_CLASS} tabular w-28 px-2 py-1 pl-5 text-right`}
      />
    </div>
  );
}
