import { prisma } from "@meridian/db";

/**
 * The market conditions a comparison is run under.
 *
 * Two plans are only comparable if they are projected against the same
 * world. This reads the latest indicator values — the same feed the
 * Signals engine watches — and stamps the comparison with them, so a
 * report an advisor saves on Tuesday says what Tuesday assumed rather
 * than silently meaning something else on Friday.
 *
 * The indicators are a simulated feed and labelled as such wherever they
 * appear (D-022). They are *context* here, not inputs: nothing in this
 * snapshot is translated into a return assumption, because deriving one
 * from a rate or a drawdown would be inventing a capital-market
 * assumption the app has no basis for (CLAUDE.md §13). The advisor sets
 * the return; the snapshot records what was true when they set it.
 */
export type MarketSnapshot = {
  asOf: Date;
  items: {
    key: string;
    name: string;
    category: string;
    /** Already formatted for display, units and all. */
    value: string;
    /** The move since the previous reading, or null if there isn't one. */
    change: string | null;
    sourceLabel: string;
  }[];
};

function formatValue(value: number, unit: string): string {
  if (unit === "%") return `${value.toFixed(2)}%`;
  if (unit === "USD") return `$${value.toLocaleString("en-US")}`;
  if (unit === "age") return `age ${value}`;
  return `${value} ${unit}`;
}

export async function readMarketSnapshot(): Promise<MarketSnapshot> {
  const indicators = await prisma.indicator.findMany({
    orderBy: [{ category: "asc" }, { key: "asc" }],
  });

  const asOf = indicators.reduce<Date>(
    (latest, i) => (i.updatedAt > latest ? i.updatedAt : latest),
    new Date(0),
  );

  return {
    asOf: indicators.length > 0 ? asOf : new Date(),
    items: indicators.map((indicator) => {
      const moved =
        indicator.previousValue !== null && indicator.previousValue !== indicator.value;
      const delta = moved ? indicator.value - (indicator.previousValue ?? 0) : 0;
      return {
        key: indicator.key,
        name: indicator.name,
        category: indicator.category,
        value: formatValue(indicator.value, indicator.unit),
        change: moved
          ? `${delta > 0 ? "+" : "−"}${formatValue(Math.abs(delta), indicator.unit)} since last reading`
          : null,
        sourceLabel: indicator.sourceLabel,
      };
    }),
  };
}
