/**
 * Rolling a list of positions up into what the Allocation section shows.
 *
 * The section used to state an asset mix, a top holding, a count of
 * distinct holdings and a blended expense ratio as four independent
 * stored figures. They could not disagree while there was nothing to
 * disagree with; once the portfolio has actual positions in it, every one
 * of them is a claim *about* those positions and has to be derived from
 * them. A page that says "41 distinct holdings" over a table listing
 * eleven is worse than one that says nothing.
 *
 * Pure, no I/O (CLAUDE.md §3). Cents arrive as numbers, converted at the
 * boundary like everywhere else (D-023).
 */

export type Holding = {
  id: string;
  ticker: string;
  name: string;
  /** ETF | Fund | Stock | Cash */
  kind: string;
  /** Equity | FixedIncome | Cash */
  assetClass: string;
  sector: string | null;
  region: string;
  expenseRatioPct: number;
  marketValueCents: number;
  costBasisCents: number;
};

export type HoldingRow = Holding & {
  /** Share of the whole portfolio. */
  portfolioPct: number;
  /** Share of its own asset class — "12% of equities" is the sentence an
   * advisor says, and it is not the same number as the one above. */
  classPct: number;
  /** Unrealised gain or loss, which can legitimately be negative. */
  gainCents: number;
};

export type AssetClassGroup = {
  assetClass: string;
  valueCents: number;
  portfolioPct: number;
  holdings: HoldingRow[];
};

export type PortfolioSummary = {
  totalCents: number;
  groups: AssetClassGroup[];
  /** Every holding, largest first, across all classes. */
  rows: HoldingRow[];
  distinctHoldings: number;
  /** Value-weighted, so a large cheap index fund counts for more than a
   * small expensive one. Single stocks contribute a zero, which is what
   * they cost to hold. */
  blendedExpenseRatioPct: number;
  largest: HoldingRow | null;
};

/** The order the rings and the table read in, rather than alphabetical —
 * "Cash, Equity, FixedIncome" is not how anyone describes a portfolio. */
export const ASSET_CLASS_ORDER = ["Equity", "FixedIncome", "Cash"] as const;

export const ASSET_CLASS_LABEL: Record<string, string> = {
  Equity: "Equities",
  FixedIncome: "Fixed income",
  Cash: "Cash",
};

function classRank(assetClass: string): number {
  const index = (ASSET_CLASS_ORDER as readonly string[]).indexOf(assetClass);
  return index === -1 ? ASSET_CLASS_ORDER.length : index;
}

const pct = (part: number, whole: number) => (whole === 0 ? 0 : (part / whole) * 100);

export function summarisePortfolio(holdings: readonly Holding[]): PortfolioSummary {
  const totalCents = holdings.reduce((sum, h) => sum + h.marketValueCents, 0);

  const byClass = new Map<string, Holding[]>();
  for (const holding of holdings) {
    const bucket = byClass.get(holding.assetClass);
    if (bucket) bucket.push(holding);
    else byClass.set(holding.assetClass, [holding]);
  }

  const groups: AssetClassGroup[] = [...byClass.entries()]
    .map(([assetClass, members]) => {
      const valueCents = members.reduce((sum, h) => sum + h.marketValueCents, 0);
      return {
        assetClass,
        valueCents,
        portfolioPct: pct(valueCents, totalCents),
        holdings: members
          .map((h) => ({
            ...h,
            portfolioPct: pct(h.marketValueCents, totalCents),
            classPct: pct(h.marketValueCents, valueCents),
            gainCents: h.marketValueCents - h.costBasisCents,
          }))
          .sort((a, b) => b.marketValueCents - a.marketValueCents),
      };
    })
    .sort((a, b) => classRank(a.assetClass) - classRank(b.assetClass));

  const rows = groups
    .flatMap((g) => g.holdings)
    .sort((a, b) => b.marketValueCents - a.marketValueCents);

  const blended =
    totalCents === 0
      ? 0
      : holdings.reduce((sum, h) => sum + h.expenseRatioPct * h.marketValueCents, 0) / totalCents;

  return {
    totalCents,
    groups,
    rows,
    distinctHoldings: holdings.length,
    blendedExpenseRatioPct: Math.round(blended * 100) / 100,
    largest: rows[0] ?? null,
  };
}

/**
 * Collapses positions in the same security into one holding.
 *
 * Two questions live on this page and they want different rows. "What am
 * I holding?" wants one line per company or fund, which is what the
 * asset-class breakdown shows. "Where is it held?" wants one line per
 * position, which is what the holdings table shows, account column and
 * all.
 *
 * Concentration has to be measured on the merged view or it can be hidden
 * by bookkeeping: one company at 6% in a brokerage account and 5% in an
 * IRA is an 11% position in that company, and counting the lots
 * separately reports neither.
 *
 * Cost basis adds up; the merged row takes the ticker as its id, since
 * there is no single position behind it any more.
 */
export function mergeBySecurity(holdings: readonly Holding[]): Holding[] {
  const merged = new Map<string, Holding>();
  for (const holding of holdings) {
    const existing = merged.get(holding.ticker);
    if (existing) {
      existing.marketValueCents += holding.marketValueCents;
      existing.costBasisCents += holding.costBasisCents;
    } else {
      merged.set(holding.ticker, { ...holding, id: holding.ticker });
    }
  }
  return [...merged.values()];
}

/**
 * A concentration limit, restated as a share of one asset class.
 *
 * The limit an advisor sets is a share of the whole portfolio; a chart of
 * the holdings *within* a class is drawn in shares of that class. They
 * are different scales, and drawing the first on the second puts the
 * marker far left of where it belongs — a 10% portfolio limit is 17% of a
 * class that is 60% of the book, so bars nowhere near the limit appear to
 * cross it. Returns Infinity for an empty class, which is the honest
 * answer: no holding in it can breach anything.
 */
export function thresholdWithinClass(thresholdPct: number, classSharePct: number): number {
  return classSharePct <= 0 ? Infinity : (thresholdPct / classSharePct) * 100;
}

/** A holding in one company, as opposed to a fund holding many. */
export function isSingleName(holding: { kind: string }): boolean {
  return holding.kind === "Stock";
}

/**
 * Single-name positions above `thresholdPct` of the portfolio, largest
 * first — what the concentration bar marks.
 *
 * Single names specifically, because measuring concentration across every
 * position answers the wrong question: across this book the largest fund
 * is a median 24% of the portfolio and the largest single stock a median
 * 8%, so a threshold that catches the second flags every household on the
 * first. A broad index fund at a quarter of the portfolio is
 * diversification. One company at a quarter is the conversation.
 *
 * The threshold is the advisor's policy, not a rule this app knows, so it
 * is always passed in.
 */
export function concentratedPositions(
  summary: PortfolioSummary,
  thresholdPct: number,
): HoldingRow[] {
  return summary.rows.filter((r) => isSingleName(r) && r.portfolioPct > thresholdPct);
}
