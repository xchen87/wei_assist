/**
 * Squarified treemap layout (Bruls, Huizing & van Wijk, 2000).
 *
 * The naive alternative — lay every item out as one row of columns, width
 * proportional to value — is what this replaces, and it fails the moment
 * there are more than a handful of items: forty households in one row is
 * forty seventeen-pixel slivers, none of them wide enough to hold a label
 * and all of them the wrong shape to read as an area. Squarifying trades
 * a strict left-to-right ordering for cells that stay close to square, so
 * area is legible as area and most cells can carry their own name.
 *
 * Pure geometry in whatever units the caller passes — no React, no DOM.
 * Callers work in their SVG viewBox units, which is what makes the
 * label-fits-in-this-cell decision exact rather than a guess.
 */

export type TreemapCell<T> = {
  item: T;
  x: number;
  y: number;
  w: number;
  h: number;
};

/** The aspect-ratio cost of a row: the worst (most elongated) cell in it.
 * Lower is better, and the row keeps growing while adding the next item
 * improves it. */
function worstRatio(areas: number[], side: number): number {
  if (side <= 0) return Infinity;
  let sum = 0;
  let max = -Infinity;
  let min = Infinity;
  for (const a of areas) {
    sum += a;
    if (a > max) max = a;
    if (a < min) min = a;
  }
  if (sum <= 0 || min <= 0) return Infinity;
  const s2 = sum * sum;
  const side2 = side * side;
  return Math.max((side2 * max) / s2, s2 / (side2 * min));
}

/**
 * Lays `items` out in a `width` × `height` rectangle, largest first, with
 * each cell's area proportional to its value.
 *
 * Items with a zero or negative value are dropped rather than given a
 * degenerate cell: a household with no assets has no area, and a
 * zero-width rectangle in the output is something every caller would then
 * have to filter anyway.
 */
export function squarify<T>(
  items: readonly T[],
  valueOf: (item: T) => number,
  width: number,
  height: number,
): TreemapCell<T>[] {
  if (width <= 0 || height <= 0) return [];

  const sorted = items.filter((i) => valueOf(i) > 0).sort((a, b) => valueOf(b) - valueOf(a));
  const total = sorted.reduce((sum, i) => sum + valueOf(i), 0);
  if (sorted.length === 0 || total <= 0) return [];

  // Work in area units, so a row's thickness is just its area over the
  // side it is laid against.
  const scale = (width * height) / total;
  const areas = sorted.map((i) => valueOf(i) * scale);

  const cells: TreemapCell<T>[] = [];
  let free = { x: 0, y: 0, w: width, h: height };
  let placed = 0;

  while (placed < areas.length) {
    const side = Math.min(free.w, free.h);

    // Grow the row while the worst aspect ratio keeps improving.
    let rowLength = 1;
    let bestRatio = worstRatio(areas.slice(placed, placed + 1), side);
    while (placed + rowLength < areas.length) {
      const candidate = worstRatio(areas.slice(placed, placed + rowLength + 1), side);
      if (candidate > bestRatio) break;
      bestRatio = candidate;
      rowLength++;
    }

    const row = areas.slice(placed, placed + rowLength);
    const rowArea = row.reduce((s, a) => s + a, 0);
    const horizontal = free.w >= free.h;
    // The strip runs along the shorter side, so the row's thickness is
    // its area divided by the length it spans.
    const thickness = horizontal ? rowArea / free.h : rowArea / free.w;

    let offset = horizontal ? free.y : free.x;
    for (let k = 0; k < rowLength; k++) {
      const extent = row[k]! / thickness;
      cells.push(
        horizontal
          ? { item: sorted[placed + k]!, x: free.x, y: offset, w: thickness, h: extent }
          : { item: sorted[placed + k]!, x: offset, y: free.y, w: extent, h: thickness },
      );
      offset += extent;
    }

    free = horizontal
      ? { x: free.x + thickness, y: free.y, w: free.w - thickness, h: free.h }
      : { x: free.x, y: free.y + thickness, w: free.w, h: free.h - thickness };
    placed += rowLength;

    // Floating-point drift can leave a sliver of free space that rounds
    // negative; stop rather than emit cells outside the rectangle.
    if (free.w <= 1e-9 || free.h <= 1e-9) break;
  }

  return cells;
}

/** Roughly how wide a string renders at a given font size, in the same
 * units. SVG has no ellipsis and no text-overflow, so a label has to be
 * cut to length before it is drawn; this is the measurement that decides
 * where.
 *
 * The ratio has to sit at or above the widest average the interface face
 * actually produces, or the estimate stops being a safety margin and
 * starts being an overflow. Measured against the rendered chart with
 * `getComputedTextLength`: "Ghosh" comes out at 0.60 em/char, "$3.88M"
 * and "Nwachu…" at 0.665 — digits and the ellipsis are the wide ones.
 * An earlier 0.55 let exactly those two spill past their cell edges. */
const AVG_CHAR_WIDTH_RATIO = 0.68;

export function textWidth(text: string, fontSize: number): number {
  return text.length * fontSize * AVG_CHAR_WIDTH_RATIO;
}

/** Below this many surviving characters a truncated label has stopped
 * naming anything — "Ab…" and "Va…" are visual debris, not information,
 * and the cell is better left clean with its name on hover.
 *
 * Five rather than six, because the cost of being strict lands unevenly:
 * whether a cell gets a label ends up depending on how long its name is
 * rather than how big it is, so "Duarte" is labelled and the identically
 * sized cell next to it holding "Kowalski" is blank. To a reader that is
 * arbitrary. "Kowal…" names the household perfectly well. */
const MIN_LABEL_CHARS = 5;

/** The longest prefix of `text` that fits `maxWidth`, with an ellipsis
 * when it had to cut. Returns null when too little of the text would
 * survive to identify anything, which is the caller's signal to draw no
 * label at all rather than a stub. */
export function fitText(
  text: string,
  maxWidth: number,
  fontSize: number,
  minChars = MIN_LABEL_CHARS,
): string | null {
  if (textWidth(text, fontSize) <= maxWidth) return text;
  const perChar = fontSize * AVG_CHAR_WIDTH_RATIO;
  const room = Math.floor(maxWidth / perChar) - 1;
  if (room < Math.min(minChars, text.length)) return null;
  return `${text.slice(0, room).trimEnd()}…`;
}

/** The first candidate that fits whole, else a truncation of the last
 * one, else nothing.
 *
 * Callers pass a label and its shorter forms, longest first. For a
 * household that is its full name and then its distinguishing first word:
 * every name here ends in "Household" or "Family Trust", so "Achebe" is a
 * better small-cell label than "Achebe Househ…" — shorter, and it keeps
 * the half that tells them apart. */
export function pickLabel(
  candidates: readonly string[],
  maxWidth: number,
  fontSize: number,
): string | null {
  for (const candidate of candidates) {
    if (textWidth(candidate, fontSize) <= maxWidth) return candidate;
  }
  const shortest = candidates[candidates.length - 1];
  return shortest === undefined ? null : fitText(shortest, maxWidth, fontSize);
}

export type Direction = "up" | "down" | "left" | "right";

/** How much a sideways drift counts against a candidate when nothing sits
 * squarely in the direction of travel. Below 1 so that distance in the
 * direction you asked for dominates. */
const CROSS_AXIS_WEIGHT = 0.5;

/** Ranks a candidate that does not share any of the source's cross-axis
 * span behind every candidate that does. Larger than any distance two
 * cells in one chart can be apart. */
const NO_OVERLAP_PENALTY = 1e6;

/**
 * The cell a viewer would call "next" in a given direction, as an index
 * into `cells`. Returns `from` unchanged at the edge of the chart, so a
 * caller can move focus unconditionally and simply stop at the boundary.
 *
 * A treemap is two-dimensional and irregular, so "next" cannot be the
 * next element in the array: pressing → on a tall cell has to reach
 * whatever is beside it, not whatever is next in value order. Candidates
 * are the cells whose centre lies in the direction asked for; among
 * those, one that overlaps the source's span on the other axis always
 * wins, because a cell you can draw a straight line to is the one a
 * viewer means. Ties fall to the nearest.
 *
 * A candidate that overlaps nothing must also sit within 45° of the
 * direction of travel, or the cell in the top-left corner answers ↑ with
 * the cell to its right — whose centre is a pixel higher, which is true
 * and is not what anybody pressing ↑ meant. That rule is what makes the
 * chart's edges behave like edges.
 */
export function neighbour<T>(
  cells: readonly TreemapCell<T>[],
  from: number,
  direction: Direction,
): number {
  const source = cells[from];
  if (!source) return from;

  const horizontal = direction === "left" || direction === "right";
  const centre = (c: TreemapCell<T>) => ({ x: c.x + c.w / 2, y: c.y + c.h / 2 });
  const origin = centre(source);

  let best = from;
  let bestScore = Infinity;

  for (let i = 0; i < cells.length; i++) {
    if (i === from) continue;
    const candidate = cells[i]!;
    const point = centre(candidate);

    const primary =
      direction === "right"
        ? point.x - origin.x
        : direction === "left"
          ? origin.x - point.x
          : direction === "down"
            ? point.y - origin.y
            : origin.y - point.y;
    if (primary <= 0) continue;

    const cross = horizontal ? Math.abs(point.y - origin.y) : Math.abs(point.x - origin.x);
    const overlaps = horizontal
      ? candidate.y < source.y + source.h && source.y < candidate.y + candidate.h
      : candidate.x < source.x + source.w && source.x < candidate.x + candidate.w;

    // Off to the side and not in line with the source: only a candidate
    // inside a 45° cone counts as being in this direction at all.
    if (!overlaps && primary < cross) continue;

    const score = primary + cross * CROSS_AXIS_WEIGHT + (overlaps ? 0 : NO_OVERLAP_PENALTY);
    if (score < bestScore) {
      bestScore = score;
      best = i;
    }
  }

  return best;
}
