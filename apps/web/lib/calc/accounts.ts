/**
 * Rolling accounts up: where a household's money is held, and under what
 * tax treatment.
 *
 * The account layer is not bookkeeping. A dollar of bond fund in an IRA
 * and the same dollar in a brokerage account are different things —
 * different treatment on the way out, different treatment of a loss on
 * the way there — and almost everything an advisor does with a portfolio
 * beyond "what is the mix" needs to know which it is looking at. These
 * are the roll-ups that make that visible.
 *
 * Pure, no I/O (CLAUDE.md §3).
 */

import {
  ASSET_CLASS_ORDER,
  summarisePortfolio,
  type Holding,
  type HoldingRow,
} from "./holdings";

export type AccountInput = {
  id: string;
  name: string;
  /** Taxable | TraditionalIRA | RothIRA | Retirement401k | Trust | Education529 */
  kind: string;
  /** Taxable | TaxDeferred | TaxFree */
  taxTreatment: string;
  custodian: string;
  ownerName: string | null;
  openedYear: number;
  holdings: Holding[];
};

export type AccountSummary = Omit<AccountInput, "holdings"> & {
  valueCents: number;
  portfolioPct: number;
  gainCents: number;
  holdings: HoldingRow[];
  /** What this one account is made of, in the same three sleeves. */
  mix: { assetClass: string; valueCents: number; sharePct: number }[];
};

export const ACCOUNT_KIND_LABEL: Record<string, string> = {
  Taxable: "Brokerage",
  TraditionalIRA: "Traditional IRA",
  RothIRA: "Roth IRA",
  Retirement401k: "401(k)",
  Trust: "Trust",
  Education529: "529 plan",
};

export const TAX_TREATMENT_LABEL: Record<string, string> = {
  Taxable: "Taxable",
  TaxDeferred: "Tax-deferred",
  TaxFree: "Tax-free",
};

/** Taxable first, then deferred, then free — the order a withdrawal
 * sequence is usually written in, so the two read the same way. */
export const TAX_TREATMENT_ORDER = ["Taxable", "TaxDeferred", "TaxFree"] as const;

const pct = (part: number, whole: number) => (whole === 0 ? 0 : (part / whole) * 100);

function rank(order: readonly string[], value: string): number {
  const index = order.indexOf(value);
  return index === -1 ? order.length : index;
}

const totalOf = (accounts: readonly AccountInput[]) =>
  accounts.reduce((sum, a) => sum + a.holdings.reduce((s, h) => s + h.marketValueCents, 0), 0);

export function summariseAccounts(accounts: readonly AccountInput[]): AccountSummary[] {
  const totalCents = totalOf(accounts);

  return accounts
    .map((account) => {
      // Reusing the portfolio roll-up means a holding's "% of class"
      // inside an account is its share of that class *in that account*,
      // which is what someone reading one statement expects.
      const inner = summarisePortfolio(account.holdings);
      return {
        id: account.id,
        name: account.name,
        kind: account.kind,
        taxTreatment: account.taxTreatment,
        custodian: account.custodian,
        ownerName: account.ownerName,
        openedYear: account.openedYear,
        valueCents: inner.totalCents,
        portfolioPct: pct(inner.totalCents, totalCents),
        gainCents: account.holdings.reduce(
          (sum, h) => sum + (h.marketValueCents - h.costBasisCents),
          0,
        ),
        holdings: inner.rows,
        mix: inner.groups.map((g) => ({
          assetClass: g.assetClass,
          valueCents: g.valueCents,
          sharePct: g.portfolioPct,
        })),
      };
    })
    .sort((a, b) => b.valueCents - a.valueCents);
}

export type LocationCell = {
  taxTreatment: string;
  valueCents: number;
  portfolioPct: number;
  byClass: { assetClass: string; valueCents: number; sharePct: number }[];
};

/**
 * Asset location: which sleeve sits under which tax treatment.
 *
 * A statement of fact about the portfolio, not a judgement of it. Whether
 * a given arrangement is right for a household depends on brackets,
 * horizons and intentions this app does not hold, so the readout shows
 * where things are and stops there (§9 rule 4).
 */
export function assetLocation(accounts: readonly AccountInput[]): LocationCell[] {
  const totalCents = totalOf(accounts);

  const byTreatment = new Map<string, Holding[]>();
  for (const account of accounts) {
    const bucket = byTreatment.get(account.taxTreatment);
    if (bucket) bucket.push(...account.holdings);
    else byTreatment.set(account.taxTreatment, [...account.holdings]);
  }

  return [...byTreatment.entries()]
    .map(([taxTreatment, holdings]) => {
      const inner = summarisePortfolio(holdings);
      return {
        taxTreatment,
        valueCents: inner.totalCents,
        portfolioPct: pct(inner.totalCents, totalCents),
        byClass: inner.groups
          .map((g) => ({
            assetClass: g.assetClass,
            valueCents: g.valueCents,
            sharePct: g.portfolioPct,
          }))
          .sort(
            (a, b) => rank(ASSET_CLASS_ORDER, a.assetClass) - rank(ASSET_CLASS_ORDER, b.assetClass),
          ),
      };
    })
    .sort(
      (a, b) =>
        rank(TAX_TREATMENT_ORDER, a.taxTreatment) - rank(TAX_TREATMENT_ORDER, b.taxTreatment),
    );
}

/**
 * Unrealised gain and loss sitting in taxable accounts.
 *
 * Taxable accounts only, which is the whole reason the number is worth
 * computing: a position under water inside an IRA is not the same kind of
 * thing as one under water in a brokerage account. What follows from that
 * is a tax question and the advisor's to answer — this returns the
 * amounts and makes no claim about what may be done with them (§13).
 */
export function taxablePositionResults(accounts: readonly AccountInput[]): {
  unrealisedGainCents: number;
  unrealisedLossCents: number;
  taxableValueCents: number;
} {
  const holdings = accounts
    .filter((a) => a.taxTreatment === "Taxable")
    .flatMap((a) => a.holdings);

  return {
    unrealisedGainCents: holdings.reduce(
      (sum, h) => sum + Math.max(0, h.marketValueCents - h.costBasisCents),
      0,
    ),
    unrealisedLossCents: holdings.reduce(
      (sum, h) => sum + Math.max(0, h.costBasisCents - h.marketValueCents),
      0,
    ),
    taxableValueCents: holdings.reduce((sum, h) => sum + h.marketValueCents, 0),
  };
}

/** Every holding in the household, with the account it sits in attached —
 * what a holdings table needs to show an account column. */
export function flattenHoldings(
  accounts: readonly AccountInput[],
): (Holding & { accountId: string; accountName: string })[] {
  return accounts.flatMap((account) =>
    account.holdings.map((holding) => ({
      ...holding,
      accountId: account.id,
      accountName: account.name,
    })),
  );
}
