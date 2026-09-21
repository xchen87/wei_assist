import { describe, expect, it } from "vitest";
import {
  assetLocation,
  flattenHoldings,
  summariseAccounts,
  taxablePositionResults,
  type AccountInput,
} from "./accounts";
import type { Holding } from "./holdings";

/** Fictional throughout — no real ticker, custodian or fee (§13). */
const holding = (
  over: Partial<Holding> & { id: string; marketValueCents: number },
): Holding => ({
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

const account = (
  over: Partial<AccountInput> & { id: string; taxTreatment: string; holdings: Holding[] },
): AccountInput => ({
  name: `${over.id} account`,
  kind: "Taxable",
  custodian: "Harborline Trust",
  ownerName: null,
  openedYear: 2019,
  ...over,
});

/** A household whose bonds sit in the IRA and whose cash sits in the
 * brokerage account — the shape the asset-location readout exists to
 * show, and the one that makes "losses in taxable accounts" mean
 * something different from "losses". */
const household: AccountInput[] = [
  account({
    id: "brokerage",
    name: "Joint brokerage",
    kind: "Taxable",
    taxTreatment: "Taxable",
    holdings: [
      holding({ id: "mbei", kind: "ETF", sector: null, expenseRatioPct: 0.04, marketValueCents: 40_000_00, costBasisCents: 30_000_00 }),
      holding({ id: "hald", marketValueCents: 10_000_00, costBasisCents: 14_000_00 }),
      holding({ id: "mmkt", kind: "Cash", assetClass: "Cash", sector: null, marketValueCents: 5_000_00 }),
    ],
  }),
  account({
    id: "ira",
    name: "Ada Traditional IRA",
    kind: "TraditionalIRA",
    taxTreatment: "TaxDeferred",
    ownerName: "Ada Fixture",
    holdings: [
      holding({ id: "mcbi", kind: "Fund", assetClass: "FixedIncome", sector: null, expenseRatioPct: 0.06, marketValueCents: 30_000_00 }),
      holding({ id: "arbr", marketValueCents: 10_000_00, costBasisCents: 16_000_00 }),
    ],
  }),
  account({
    id: "roth",
    name: "Ada Roth IRA",
    kind: "RothIRA",
    taxTreatment: "TaxFree",
    ownerName: "Ada Fixture",
    holdings: [holding({ id: "kscg", kind: "Fund", sector: null, expenseRatioPct: 0.21, marketValueCents: 5_000_00 })],
  }),
];

describe("summariseAccounts", () => {
  const summaries = summariseAccounts(household);

  it("values each account from its own positions", () => {
    expect(summaries.map((a) => [a.name, a.valueCents])).toEqual([
      ["Joint brokerage", 55_000_00],
      ["Ada Traditional IRA", 40_000_00],
      ["Ada Roth IRA", 5_000_00],
    ]);
  });

  it("orders largest first, whatever order they arrived in", () => {
    const shuffled = summariseAccounts([household[2]!, household[0]!, household[1]!]);
    expect(shuffled.map((a) => a.name)).toEqual(summaries.map((a) => a.name));
  });

  it("gives each account its share of the whole portfolio", () => {
    expect(summaries.map((a) => Math.round(a.portfolioPct))).toEqual([55, 40, 5]);
  });

  it("totals each account's unrealised gain, losses included", () => {
    // Brokerage: +10,000 on MBEI, -4,000 on HALD, nothing on cash.
    expect(summaries[0]!.gainCents).toBe(6_000_00);
    expect(summaries[1]!.gainCents).toBe(-6_000_00);
  });

  /** A holding's share inside an account is its share of that account,
   * which is what somebody reading one statement expects to see. */
  it("reports a holding's weight within its own account", () => {
    const brokerage = summaries[0]!;
    const mbei = brokerage.holdings.find((h) => h.ticker === "MBEI")!;
    expect(mbei.portfolioPct).toBeCloseTo((40 / 55) * 100, 6);
  });

  it("breaks each account into the same three sleeves", () => {
    expect(summaries[0]!.mix.map((m) => m.assetClass)).toEqual(["Equity", "Cash"]);
    expect(summaries[1]!.mix.map((m) => m.assetClass)).toEqual(["Equity", "FixedIncome"]);
  });

  it("keeps an account with no owner unowned rather than guessing one", () => {
    expect(summaries[0]!.ownerName).toBeNull();
    expect(summaries[1]!.ownerName).toBe("Ada Fixture");
  });

  it("copes with no accounts, and with an account holding nothing", () => {
    expect(summariseAccounts([])).toEqual([]);
    const empty = summariseAccounts([account({ id: "new", taxTreatment: "Taxable", holdings: [] })]);
    expect(empty[0]!.valueCents).toBe(0);
    expect(empty[0]!.portfolioPct).toBe(0);
  });
});

describe("assetLocation", () => {
  const location = assetLocation(household);

  it("groups by tax treatment, taxable first", () => {
    expect(location.map((c) => c.taxTreatment)).toEqual(["Taxable", "TaxDeferred", "TaxFree"]);
  });

  it("totals what sits under each treatment", () => {
    expect(location.map((c) => c.valueCents)).toEqual([55_000_00, 40_000_00, 5_000_00]);
  });

  it("shows the mix inside each treatment, in sleeve order", () => {
    const deferred = location.find((c) => c.taxTreatment === "TaxDeferred")!;
    expect(deferred.byClass.map((s) => s.assetClass)).toEqual(["Equity", "FixedIncome"]);
    expect(deferred.byClass.find((s) => s.assetClass === "FixedIncome")!.sharePct).toBeCloseTo(75, 6);
  });

  it("pools accounts that share a treatment", () => {
    const twoTaxable = assetLocation([
      household[0]!,
      account({ id: "trust", kind: "Trust", taxTreatment: "Taxable", holdings: [holding({ id: "vsta", marketValueCents: 5_000_00 })] }),
    ]);
    expect(twoTaxable).toHaveLength(1);
    expect(twoTaxable[0]!.valueCents).toBe(60_000_00);
  });

  it("returns nothing for a household with no accounts", () => {
    expect(assetLocation([])).toEqual([]);
  });
});

/** The reason the account layer exists, as far as the Tax section is
 * concerned: a position under water inside an IRA is not the same kind of
 * thing as one under water in a brokerage account, and the figure the
 * page labels "taxable accounts" has to actually mean that. */
describe("taxablePositionResults", () => {
  const result = taxablePositionResults(household);

  it("counts gains and losses in taxable accounts only", () => {
    expect(result.unrealisedGainCents).toBe(10_000_00);
    expect(result.unrealisedLossCents).toBe(4_000_00);
  });

  it("ignores a loss inside a tax-deferred account", () => {
    // ARBR is 6,000 under water in the IRA and appears in neither figure.
    expect(result.unrealisedLossCents).not.toBe(10_000_00);
  });

  it("reports gains and losses separately rather than netting them", () => {
    expect(result.unrealisedGainCents - result.unrealisedLossCents).toBe(6_000_00);
  });

  it("totals what is held in taxable accounts", () => {
    expect(result.taxableValueCents).toBe(55_000_00);
  });

  it("returns zeroes for a household with nothing taxable", () => {
    expect(taxablePositionResults([household[1]!])).toEqual({
      unrealisedGainCents: 0,
      unrealisedLossCents: 0,
      taxableValueCents: 0,
    });
  });
});

describe("flattenHoldings", () => {
  it("tags every holding with the account it sits in", () => {
    const flat = flattenHoldings(household);
    expect(flat).toHaveLength(6);
    expect(flat.find((h) => h.ticker === "MCBI")!.accountName).toBe("Ada Traditional IRA");
  });

  /** The same fund in a brokerage account and an IRA is two holdings,
   * which is what the custodian reports and what makes each lot's
   * treatment knowable. */
  it("keeps one security held in two accounts as two rows", () => {
    const both = flattenHoldings([
      account({ id: "a", name: "Brokerage", taxTreatment: "Taxable", holdings: [holding({ id: "p1", ticker: "MBEI", marketValueCents: 100 })] }),
      account({ id: "b", name: "IRA", taxTreatment: "TaxDeferred", holdings: [holding({ id: "p2", ticker: "MBEI", marketValueCents: 200 })] }),
    ]);
    expect(both.map((h) => [h.ticker, h.accountName])).toEqual([
      ["MBEI", "Brokerage"],
      ["MBEI", "IRA"],
    ]);
  });
});
