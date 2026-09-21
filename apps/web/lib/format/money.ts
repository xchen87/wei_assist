/** All money in this app is stored as integer cents (D-007) in BigInt
 * columns (D-023). These are the only functions allowed to turn cents into
 * a display string, or dollars into cents.
 *
 * The one rule BigInt imposes: cents are `bigint` in the database layer and
 * in server-side arithmetic, and become `number` at the boundary where they
 * are serialised or handed to a client component — `bigint` cannot be JSON
 * serialised, so React would throw on the prop. Every function here accepts
 * either, so call sites don't have to care which side of that line they are
 * on. Conversion is lossless for any real figure: Number is exact to 2^53
 * cents, about $90 trillion. */

export type Cents = number | bigint;

/** For arithmetic and serialisation — the boundary converter. */
export function centsToNumber(value: Cents): number {
  return typeof value === "bigint" ? Number(value) : value;
}

/** For writes: dollars from application code into a BigInt column. */
export function toCents(dollars: number): bigint {
  return BigInt(Math.round(dollars * 100));
}

/** |value| without losing the bigint-ness a money field may carry. */
export function absCents(value: Cents): Cents {
  if (typeof value === "bigint") return value < 0n ? -value : value;
  return Math.abs(value);
}

export function formatMoney(value: Cents, opts: { compact?: boolean } = {}): string {
  const dollars = centsToNumber(value) / 100;
  if (opts.compact) return formatCompactMoney(dollars);
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0,
  }).format(dollars);
}

/** "$8,420,000" -> "$8.42M" for dense table cells and stat tiles. */
export function formatCompactMoney(dollars: number): string {
  const abs = Math.abs(dollars);
  const sign = dollars < 0 ? "-" : "";
  if (abs >= 1_000_000) return `${sign}$${(abs / 1_000_000).toFixed(2)}M`;
  if (abs >= 1_000) return `${sign}$${(abs / 1_000).toFixed(0)}K`;
  return `${sign}$${abs.toFixed(0)}`;
}

/** Cents -> a plain dollar number, for export rather than display: a
 * spreadsheet wants 8420000 as 8420000.00, not "$8.42M". */
export function toDollars(value: Cents): number {
  return Math.round(centsToNumber(value)) / 100;
}

/** "12,500" or "$12,500.50" from a form field -> integer cents. Returns
 * null for anything that isn't a number, so a caller can tell "nothing
 * entered" from "zero". */
export function parseDollarsToCents(input: string): bigint | null {
  const cleaned = input.replace(/[$,\s]/g, "");
  if (!cleaned) return null;
  const value = Number(cleaned);
  if (!Number.isFinite(value)) return null;
  return toCents(value);
}

export function formatSignedMoney(value: Cents, opts: { compact?: boolean } = {}): string {
  const formatted = formatMoney(absCents(value), opts);
  return centsToNumber(value) >= 0 ? `+${formatted}` : `−${formatted}`;
}
