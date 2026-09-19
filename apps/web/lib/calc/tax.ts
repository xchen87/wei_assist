/**
 * Tax bracket position, computed — not stored — from a household's taxable
 * income. The six bracket rates/widths below are illustrative, not the real
 * IRS table for any given year (per design/Tax.dc.html's own "illustrative
 * for this draft — connect a tax data source in Settings → Tax" disclaimer,
 * and CLAUDE.md §13's rule against inventing tax thresholds as if real).
 * Pure, no I/O — see CLAUDE.md §3.
 */

export type TaxBracket = { ratePct: number; widthCents: number };

/** Six brackets, cumulative width ~$700k of taxable income before the top
 * bracket. Widths are chosen only to produce a plausible-looking bar for
 * demo households across the seeded income range — not a real schedule. */
export const ILLUSTRATIVE_BRACKETS: TaxBracket[] = [
  { ratePct: 10, widthCents: centsFrom(23_000) },
  { ratePct: 15, widthCents: centsFrom(71_000) },
  { ratePct: 25, widthCents: centsFrom(95_000) },
  { ratePct: 30, widthCents: centsFrom(95_000) },
  { ratePct: 35, widthCents: centsFrom(95_000) },
  { ratePct: 40, widthCents: Infinity },
];

function centsFrom(dollars: number) {
  return dollars * 100;
}

export type BracketPosition = {
  marginalBracketIndex: number;
  marginalRatePct: number;
  fillPct: number; // 0-100, how far through the marginal bracket the income sits
  roomToNextBracketCents: number; // Infinity if already in the top bracket
};

export function bracketPosition(taxableIncomeCents: number): BracketPosition {
  let floor = 0;
  for (let i = 0; i < ILLUSTRATIVE_BRACKETS.length; i++) {
    const bracket = ILLUSTRATIVE_BRACKETS[i]!;
    const ceiling = floor + bracket.widthCents;
    if (taxableIncomeCents < ceiling || i === ILLUSTRATIVE_BRACKETS.length - 1) {
      const intoThisBracket = taxableIncomeCents - floor;
      const fillPct = bracket.widthCents === Infinity ? 100 : Math.min(100, (intoThisBracket / bracket.widthCents) * 100);
      return {
        marginalBracketIndex: i,
        marginalRatePct: bracket.ratePct,
        fillPct: Math.round(fillPct * 10) / 10,
        roomToNextBracketCents: bracket.widthCents === Infinity ? Infinity : ceiling - taxableIncomeCents,
      };
    }
    floor = ceiling;
  }
  // Unreachable: the loop always returns on the last (Infinity-width) bracket.
  const last = ILLUSTRATIVE_BRACKETS[ILLUSTRATIVE_BRACKETS.length - 1]!;
  return { marginalBracketIndex: ILLUSTRATIVE_BRACKETS.length - 1, marginalRatePct: last.ratePct, fillPct: 100, roomToNextBracketCents: Infinity };
}
