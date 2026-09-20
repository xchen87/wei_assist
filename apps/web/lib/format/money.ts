/** All money in this app is stored as integer cents (see D-007). These are
 * the only functions allowed to turn cents into a display string. */

export function formatMoney(cents: number, opts: { compact?: boolean } = {}): string {
  const dollars = cents / 100;
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
 * spreadsheet wants 8420000 as 8420000.00, not "$8.42M". Still the only
 * place cents stop being cents (D-007). */
export function toDollars(cents: number): number {
  return Math.round(cents) / 100;
}

/** "12,500" or "$12,500.50" from a form field -> integer cents. Returns
 * null for anything that isn't a number, so a caller can tell "nothing
 * entered" from "zero". The inverse of toDollars, and the only other place
 * cents are created from user input (D-007). */
export function parseDollarsToCents(input: string): number | null {
  const cleaned = input.replace(/[$,\s]/g, "");
  if (!cleaned) return null;
  const value = Number(cleaned);
  if (!Number.isFinite(value)) return null;
  return Math.round(value * 100);
}

export function formatSignedMoney(cents: number, opts: { compact?: boolean } = {}): string {
  const formatted = formatMoney(Math.abs(cents), opts);
  return cents >= 0 ? `+${formatted}` : `−${formatted}`;
}
