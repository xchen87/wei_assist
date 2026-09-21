import { describe, expect, it } from "vitest";
import {
  concentratedPositions,
  isSingleName,
  mergeBySecurity,
  summarisePortfolio,
  thresholdWithinClass,
  type Holding,
} from "./holdings";

/** Fictional securities, as fixtures — no real ticker, name or fee (§13). */
const holding = (over: Partial<Holding> & { id: string; marketValueCents: number }): Holding => ({
  ticker: over.id.toUpperCase(),
  name: `${over.id} Fixture`,
  kind: "Stock",
  assetClass: "Equity",
  sector: "Technology",
  region: "US",
  expenseRatioPct: 0,
  costBasisCents: over.marketValueCents,
  ...over,
});

const portfolio: Holding[] = [
  holding({ id: "mbei", kind: "ETF", sector: null, expenseRatioPct: 0.04, marketValueCents: 50_000_00, costBasisCents: 40_000_00 }),
  holding({ id: "hald", marketValueCents: 20_000_00, costBasisCents: 25_000_00 }),
  holding({ id: "arbr", sector: "Health care", marketValueCents: 10_000_00 }),
  holding({ id: "mcbi", kind: "Fund", assetClass: "FixedIncome", sector: null, expenseRatioPct: 0.06, marketValueCents: 15_000_00 }),
  holding({ id: "mmkt", kind: "Cash", assetClass: "Cash", sector: null, expenseRatioPct: 0.1, marketValueCents: 5_000_00 }),
];

describe("summarisePortfolio", () => {
  const summary = summarisePortfolio(portfolio);

  it("totals every position", () => {
    expect(summary.totalCents).toBe(100_000_00);
  });

  it("groups into asset classes in the order a portfolio is described", () => {
    expect(summary.groups.map((g) => g.assetClass)).toEqual(["Equity", "FixedIncome", "Cash"]);
  });

  it("gives each class its share of the portfolio", () => {
    expect(summary.groups.map((g) => Math.round(g.portfolioPct))).toEqual([80, 15, 5]);
  });

  /** The two percentages a holding carries are different numbers and the
   * page says both: 20% of the portfolio, 25% of equities. */
  it("reports a holding's share of the portfolio and of its own class", () => {
    const hald = summary.rows.find((r) => r.ticker === "HALD")!;
    expect(hald.portfolioPct).toBeCloseTo(20, 6);
    expect(hald.classPct).toBeCloseTo(25, 6);
  });

  it("sorts holdings largest first, within a class and across the portfolio", () => {
    expect(summary.rows.map((r) => r.ticker)).toEqual(["MBEI", "HALD", "MCBI", "ARBR", "MMKT"]);
    expect(summary.groups[0]!.holdings.map((r) => r.ticker)).toEqual(["MBEI", "HALD", "ARBR"]);
  });

  it("names the largest holding", () => {
    expect(summary.largest!.ticker).toBe("MBEI");
  });

  it("counts distinct holdings, rather than being told a number", () => {
    expect(summary.distinctHoldings).toBe(5);
  });

  /** Value-weighted: 0.04 on half the book weighs more than 0.10 on a
   * twentieth of it, and the three single stocks contribute nothing
   * because nobody charges a fee to hold a share. */
  it("blends the expense ratio by value", () => {
    // (0.04*50 + 0.06*15 + 0.10*5) / 100 = 0.034, to the two decimals
    // the section quotes a blended ratio in.
    expect(summary.blendedExpenseRatioPct).toBe(0.03);
  });

  it("reports an unrealised loss as a loss", () => {
    const hald = summary.rows.find((r) => r.ticker === "HALD")!;
    expect(hald.gainCents).toBe(-5_000_00);
    expect(summary.rows.find((r) => r.ticker === "MBEI")!.gainCents).toBe(10_000_00);
  });

  it("copes with an empty portfolio without dividing by zero", () => {
    const empty = summarisePortfolio([]);
    expect(empty.totalCents).toBe(0);
    expect(empty.groups).toEqual([]);
    expect(empty.largest).toBeNull();
    expect(empty.distinctHoldings).toBe(0);
    expect(empty.blendedExpenseRatioPct).toBe(0);
  });

  it("copes with a class that has been fully sold down to zero", () => {
    const zeroed = summarisePortfolio([holding({ id: "gone", marketValueCents: 0 })]);
    expect(zeroed.totalCents).toBe(0);
    expect(zeroed.groups[0]!.holdings[0]!.portfolioPct).toBe(0);
    expect(zeroed.groups[0]!.holdings[0]!.classPct).toBe(0);
  });

  it("puts an unrecognised asset class last rather than dropping it", () => {
    const withAlts = summarisePortfolio([
      ...portfolio,
      holding({ id: "alt", assetClass: "Alternatives", marketValueCents: 1_000_00 }),
    ]);
    expect(withAlts.groups.map((g) => g.assetClass)).toEqual([
      "Equity",
      "FixedIncome",
      "Cash",
      "Alternatives",
    ]);
  });

  it("does not mutate the positions it is given", () => {
    const snapshot = JSON.stringify(portfolio);
    summarisePortfolio(portfolio);
    expect(JSON.stringify(portfolio)).toBe(snapshot);
  });
});

describe("isSingleName", () => {
  it("distinguishes one company from a fund holding many", () => {
    expect(isSingleName({ kind: "Stock" })).toBe(true);
    expect(isSingleName({ kind: "ETF" })).toBe(false);
    expect(isSingleName({ kind: "Fund" })).toBe(false);
    expect(isSingleName({ kind: "Cash" })).toBe(false);
  });
});

describe("concentratedPositions", () => {
  const summary = summarisePortfolio(portfolio);

  it("returns single names over the advisor's threshold, largest first", () => {
    expect(concentratedPositions(summary, 5).map((r) => r.ticker)).toEqual(["HALD", "ARBR"]);
  });

  /** The measure that matters is one company, not one holding. MBEI is
   * half this portfolio and is not a concentration risk; across the
   * seeded book the largest fund runs a median 24% and the largest single
   * stock a median 8%, so counting funds flags everybody. */
  it("ignores a fund however large it is", () => {
    expect(concentratedPositions(summary, 15).map((r) => r.ticker)).toEqual(["HALD"]);
    expect(concentratedPositions(summary, 15).some((r) => r.ticker === "MBEI")).toBe(false);
  });

  it("is a strict comparison, so a position exactly on the line is not a breach", () => {
    expect(concentratedPositions(summary, 20)).toEqual([]);
  });

  it("returns nothing when the single names are all small", () => {
    expect(concentratedPositions(summary, 60)).toEqual([]);
  });
});

describe("thresholdWithinClass", () => {
  /** The bug this exists to stop: bars inside a class are drawn on the
   * class's scale, and the limit arrives on the portfolio's. */
  it("scales a portfolio limit up into the class it is drawn over", () => {
    expect(thresholdWithinClass(10, 60)).toBeCloseTo(16.667, 3);
    expect(thresholdWithinClass(10, 25)).toBe(40);
  });

  it("leaves the limit alone for a class that is the whole portfolio", () => {
    expect(thresholdWithinClass(10, 100)).toBe(10);
  });

  it("puts the limit out of reach for an empty class", () => {
    expect(thresholdWithinClass(10, 0)).toBe(Infinity);
    expect(thresholdWithinClass(10, -1)).toBe(Infinity);
  });

  /** A holding at exactly the limit should land exactly on the marker,
   * whichever scale you measure it in. */
  it("agrees with the holdings it is drawn against", () => {
    const summary = summarisePortfolio(portfolio);
    const equities = summary.groups.find((g) => g.assetClass === "Equity")!;
    const marker = thresholdWithinClass(20, equities.portfolioPct);
    const hald = equities.holdings.find((h) => h.ticker === "HALD")!;
    // HALD is 20% of the portfolio, which is the limit exactly.
    expect(hald.portfolioPct).toBeCloseTo(20, 6);
    expect(hald.classPct).toBeCloseTo(marker, 6);
  });
});

describe("mergeBySecurity", () => {
  const split: Holding[] = [
    holding({ id: "p1", ticker: "CDFN", marketValueCents: 6_000_00, costBasisCents: 4_000_00 }),
    holding({ id: "p2", ticker: "CDFN", marketValueCents: 5_000_00, costBasisCents: 5_500_00 }),
    holding({ id: "p3", ticker: "HALD", marketValueCents: 2_000_00 }),
  ];

  it("adds up value and basis across accounts", () => {
    const merged = mergeBySecurity(split);
    expect(merged).toHaveLength(2);
    const cdfn = merged.find((h) => h.ticker === "CDFN")!;
    expect(cdfn.marketValueCents).toBe(11_000_00);
    expect(cdfn.costBasisCents).toBe(9_500_00);
  });

  it("keeps the ticker as the merged row's id", () => {
    expect(mergeBySecurity(split).map((h) => h.id)).toEqual(["CDFN", "HALD"]);
  });

  /** The reason this exists: bookkeeping must not be able to hide a
   * concentrated position. 6% in a brokerage account and 5% in an IRA is
   * an 11% position in that company, and counting the lots separately
   * reports neither. */
  it("surfaces a concentration that splitting across accounts would hide", () => {
    const perLot = summarisePortfolio([...split, holding({ id: "rest", ticker: "MBEI", kind: "ETF", marketValueCents: 89_000_00 })]);
    expect(concentratedPositions(perLot, 10)).toEqual([]);

    const perSecurity = summarisePortfolio(
      mergeBySecurity([...split, holding({ id: "rest", ticker: "MBEI", kind: "ETF", marketValueCents: 89_000_00 })]),
    );
    expect(concentratedPositions(perSecurity, 10).map((r) => r.ticker)).toEqual(["CDFN"]);
  });

  it("leaves a portfolio with no duplicates untouched in length", () => {
    expect(mergeBySecurity(portfolio)).toHaveLength(portfolio.length);
  });

  it("does not mutate the holdings it is given", () => {
    const snapshot = JSON.stringify(split);
    mergeBySecurity(split);
    expect(JSON.stringify(split)).toBe(snapshot);
  });

  it("handles an empty portfolio", () => {
    expect(mergeBySecurity([])).toEqual([]);
  });
});
