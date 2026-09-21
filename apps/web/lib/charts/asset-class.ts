/** Token colours for the three asset-class sleeves.
 *
 * Its own module rather than an export from the rings chart because both
 * a server component and a client one need it. A plain constant exported
 * from a `"use client"` file is resolved through React's client manifest
 * when a server component imports it, and a non-component export is not
 * in that manifest: the page throws at render with "Could not find the
 * module ...#CLASS_COLOR#Equity", and the error boundary catches it, so
 * the route still answers 200 and only a browser or the server log shows
 * anything wrong.
 *
 * Colour comes from tokens only (CLAUDE.md §8). */
export const CLASS_COLOR: Record<string, string> = {
  Equity: "var(--pine)",
  FixedIncome: "var(--info)",
  Cash: "var(--brass)",
};
