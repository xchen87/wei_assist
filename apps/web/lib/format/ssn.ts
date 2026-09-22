/**
 * Social security numbers: stored as nine digits, shown with dashes.
 *
 * The one rule that matters here is that whatever the input *displays*
 * has to survive a round trip back through `ssnDigits`. It is easy to
 * miss: an input that masks by replacing each character with a bullet
 * looks right, and then the change handler strips the bullets as
 * non-digits along with every digit already typed, so only the keystroke
 * that just arrived survives. The field accepts exactly one digit and
 * looks, from the outside, like a maxlength bug.
 *
 * So masking is the browser's job — `type="password"` — and the value in
 * the input is always the real thing. These functions only ever see real
 * digits, and the round trip is tested (D-032).
 */

const MAX_DIGITS = 9;

/** Digits → 123-45-6789, as far as the digits go. */
export function formatSsn(digits: string): string {
  const d = digits.slice(0, MAX_DIGITS);
  if (d.length <= 3) return d;
  if (d.length <= 5) return `${d.slice(0, 3)}-${d.slice(3)}`;
  return `${d.slice(0, 3)}-${d.slice(3, 5)}-${d.slice(5)}`;
}

/** What the field stores, given whatever the field currently shows.
 * Anything that isn't a digit is punctuation the formatter added. */
export function ssnDigits(input: string): string {
  return input.replace(/\D/g, "").slice(0, MAX_DIGITS);
}

export function isCompleteSsn(digits: string): boolean {
  return ssnDigits(digits).length === MAX_DIGITS;
}

/** What the review step shows: the last four, which is how an SSN is
 * referred to in practice, and never the whole number (CLAUDE.md §11). */
export function maskSsn(digits: string): string {
  if (!isCompleteSsn(digits)) return digits.length > 0 ? "Incomplete" : "—";
  return `•••-••-${digits.slice(5)}`;
}
