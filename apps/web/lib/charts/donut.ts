/**
 * Donut-segment geometry.
 *
 * The allocation rings were a CSS `conic-gradient` on a div, which draws
 * the right picture and gives you nothing to hold: a gradient has no
 * segments, so a slice cannot be hovered, focused, clicked or named to a
 * screen reader. Rebuilt as SVG arcs, each slice is an element, and that
 * is what makes "click equities to see what is in it" possible at all.
 *
 * Pure geometry in the caller's viewBox units — no React, no DOM.
 */

export type DonutSegment<T> = {
  item: T;
  /** An SVG path for the filled ring segment, ready for `d`. */
  path: string;
  /** Midpoint of the segment on the ring, for a label or a leader line. */
  labelX: number;
  labelY: number;
  startPct: number;
  endPct: number;
};

/** Angles run clockwise from twelve o'clock, which is where a reader
 * expects a pie to start, rather than from SVG's three o'clock. */
function pointOnCircle(cx: number, cy: number, radius: number, pct: number) {
  const angle = (pct / 100) * Math.PI * 2 - Math.PI / 2;
  return { x: cx + radius * Math.cos(angle), y: cy + radius * Math.sin(angle) };
}

/**
 * Builds one path per value, as a ring of `outerRadius` with a hole of
 * `innerRadius`.
 *
 * Values are taken as given and normalised by their own total, so a
 * caller holding percentages that sum to 99.9 after rounding still gets a
 * closed ring rather than a hairline gap.
 */
export function donutSegments<T>(
  items: readonly T[],
  valueOf: (item: T) => number,
  options: { cx: number; cy: number; innerRadius: number; outerRadius: number },
): DonutSegment<T>[] {
  const { cx, cy, innerRadius, outerRadius } = options;
  const usable = items.filter((i) => valueOf(i) > 0);
  const total = usable.reduce((sum, i) => sum + valueOf(i), 0);
  if (usable.length === 0 || total <= 0 || outerRadius <= innerRadius) return [];

  const segments: DonutSegment<T>[] = [];
  let cursor = 0;

  for (const [index, item] of usable.entries()) {
    const share = (valueOf(item) / total) * 100;
    const startPct = cursor;
    // The last segment closes on 100 exactly, so floating-point drift
    // never leaves a sliver of background showing through the ring.
    const endPct = index === usable.length - 1 ? 100 : cursor + share;
    cursor = endPct;

    const midPct = (startPct + endPct) / 2;
    const label = pointOnCircle(cx, cy, (innerRadius + outerRadius) / 2, midPct);

    segments.push({
      item,
      path: ringPath(cx, cy, innerRadius, outerRadius, startPct, endPct),
      labelX: label.x,
      labelY: label.y,
      startPct,
      endPct,
    });
  }

  return segments;
}

function ringPath(
  cx: number,
  cy: number,
  innerRadius: number,
  outerRadius: number,
  startPct: number,
  endPct: number,
): string {
  // A single arc cannot describe a full turn — its start and end points
  // would coincide and the renderer draws nothing — so a segment that is
  // the whole ring is split in half.
  if (endPct - startPct >= 100) {
    return `${ringPath(cx, cy, innerRadius, outerRadius, 0, 50)} ${ringPath(cx, cy, innerRadius, outerRadius, 50, 100)}`;
  }

  const outerStart = pointOnCircle(cx, cy, outerRadius, startPct);
  const outerEnd = pointOnCircle(cx, cy, outerRadius, endPct);
  const innerEnd = pointOnCircle(cx, cy, innerRadius, endPct);
  const innerStart = pointOnCircle(cx, cy, innerRadius, startPct);
  const largeArc = endPct - startPct > 50 ? 1 : 0;

  return [
    `M ${outerStart.x} ${outerStart.y}`,
    `A ${outerRadius} ${outerRadius} 0 ${largeArc} 1 ${outerEnd.x} ${outerEnd.y}`,
    `L ${innerEnd.x} ${innerEnd.y}`,
    `A ${innerRadius} ${innerRadius} 0 ${largeArc} 0 ${innerStart.x} ${innerStart.y}`,
    "Z",
  ].join(" ");
}
