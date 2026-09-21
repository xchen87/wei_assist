import { describe, expect, it } from "vitest";
import { fitText, neighbour, pickLabel, squarify, textWidth } from "./treemap";

type Box = { name: string; value: number };
const box = (name: string, value: number): Box => ({ name, value });
const layout = (items: Box[], w = 340, h = 210) => squarify(items, (i) => i.value, w, h);

/** The book this chart is drawn from: forty households, most of them
 * small, a few large. The exact figures are fictional fixtures — the
 * shape of the distribution is what the layout has to cope with. */
const book: Box[] = Array.from({ length: 40 }, (_, i) =>
  box(`Household ${i + 1}`, 1_700_000 - i * 35_000),
);

describe("squarify", () => {
  it("gives every cell an area proportional to its value", () => {
    const cells = layout([box("a", 50), box("b", 30), box("c", 20)]);
    const total = 340 * 210;
    expect(cells.find((c) => c.item.name === "a")!.w * cells.find((c) => c.item.name === "a")!.h).toBeCloseTo(total * 0.5, 4);
    expect(cells.find((c) => c.item.name === "b")!.w * cells.find((c) => c.item.name === "b")!.h).toBeCloseTo(total * 0.3, 4);
    expect(cells.find((c) => c.item.name === "c")!.w * cells.find((c) => c.item.name === "c")!.h).toBeCloseTo(total * 0.2, 4);
  });

  it("fills the rectangle exactly", () => {
    const area = layout(book).reduce((sum, c) => sum + c.w * c.h, 0);
    expect(area).toBeCloseTo(340 * 210, 3);
  });

  it("keeps every cell inside the rectangle", () => {
    for (const c of layout(book)) {
      expect(c.x).toBeGreaterThanOrEqual(-1e-9);
      expect(c.y).toBeGreaterThanOrEqual(-1e-9);
      expect(c.x + c.w).toBeLessThanOrEqual(340 + 1e-9);
      expect(c.y + c.h).toBeLessThanOrEqual(210 + 1e-9);
    }
  });

  it("never overlaps two cells", () => {
    const cells = layout(book);
    for (let i = 0; i < cells.length; i++) {
      for (let j = i + 1; j < cells.length; j++) {
        const a = cells[i]!;
        const b = cells[j]!;
        const disjoint =
          a.x + a.w <= b.x + 1e-9 ||
          b.x + b.w <= a.x + 1e-9 ||
          a.y + a.h <= b.y + 1e-9 ||
          b.y + b.h <= a.y + 1e-9;
        expect(disjoint, `${a.item.name} overlaps ${b.item.name}`).toBe(true);
      }
    }
  });

  it("orders cells largest first", () => {
    const values = layout(book).map((c) => c.item.value);
    expect(values).toEqual([...values].sort((a, b) => b - a));
  });

  // The whole reason for squarifying: the row-of-columns layout this
  // replaced gave forty households aspect ratios past 30:1, which is what
  // made their labels unreadable.
  it("keeps cells close to square", () => {
    const ratios = layout(book).map((c) => Math.max(c.w / c.h, c.h / c.w));
    expect(Math.max(...ratios)).toBeLessThan(5);
  });

  it("makes even the smallest of forty cells wide enough to identify", () => {
    const smallest = layout(book).reduce((min, c) => (c.w * c.h < min.w * min.h ? c : min));
    // The old layout gave the smallest household a 17px sliver at this
    // width. Anything under ~10 viewBox units is that failure again.
    expect(smallest.w).toBeGreaterThan(10);
    expect(smallest.h).toBeGreaterThan(10);
  });

  it("drops items with no value rather than emitting degenerate cells", () => {
    const cells = layout([box("a", 10), box("zero", 0), box("negative", -5)]);
    expect(cells.map((c) => c.item.name)).toEqual(["a"]);
  });

  it("handles a single item by filling the rectangle", () => {
    const [only] = layout([box("solo", 7)]);
    expect(only).toMatchObject({ x: 0, y: 0, w: 340, h: 210 });
  });

  it("returns nothing for an empty book, an all-zero book, or no space", () => {
    expect(layout([])).toEqual([]);
    expect(layout([box("a", 0), box("b", 0)])).toEqual([]);
    expect(layout([box("a", 1)], 0, 210)).toEqual([]);
    expect(layout([box("a", 1)], 340, -5)).toEqual([]);
  });

  // A single founding household can be most of a small book, and the
  // remainder still has to be laid out in the sliver that is left.
  it("copes with one item dwarfing the rest", () => {
    const cells = layout([box("whale", 400_000_000), ...book.slice(0, 10)]);
    expect(cells).toHaveLength(11);
    expect(cells[0]!.item.name).toBe("whale");
    expect(cells.reduce((s, c) => s + c.w * c.h, 0)).toBeCloseTo(340 * 210, 3);
  });

  it("does not mutate the input", () => {
    const items = [box("a", 1), box("b", 9)];
    const snapshot = JSON.stringify(items);
    layout(items);
    expect(JSON.stringify(items)).toBe(snapshot);
  });
});

describe("textWidth", () => {
  /** Measured in the browser with getComputedTextLength: the widest
   * average the interface face produces for these labels is 0.665 em per
   * character. The estimate has to sit at or above that, or a label that
   * "fits" overflows its cell — which is exactly what happened at 0.55. */
  it("does not underestimate the real font", () => {
    expect(textWidth("Nwachu…", 11)).toBeGreaterThanOrEqual(51.2);
    expect(textWidth("$3.88M", 10)).toBeGreaterThanOrEqual(39.9);
    expect(textWidth("Ghosh", 11)).toBeGreaterThanOrEqual(33);
  });

  it("scales with length and font size", () => {
    expect(textWidth("abcd", 10)).toBeCloseTo(textWidth("ab", 10) * 2, 6);
    expect(textWidth("ab", 20)).toBeCloseTo(textWidth("ab", 10) * 2, 6);
    expect(textWidth("", 10)).toBe(0);
  });
});

describe("pickLabel", () => {
  const candidates = ["Alvarez Family Trust", "Alvarez"];

  it("uses the full label when it fits", () => {
    expect(pickLabel(candidates, 200, 7)).toBe("Alvarez Family Trust");
  });

  it("falls back to the shorter form whole, rather than truncating the longer", () => {
    const picked = pickLabel(candidates, 40, 7);
    expect(picked).toBe("Alvarez");
    expect(picked).not.toContain("…");
  });

  it("truncates the shortest form only when even that will not fit", () => {
    const picked = pickLabel(["Nwachukwu Household", "Nwachukwu"], 36, 7)!;
    expect(picked).toBe("Nwachu…");
    expect(textWidth(picked, 7)).toBeLessThanOrEqual(36);
  });

  it("would rather draw nothing than a two-character stub", () => {
    // Room for two characters is well under the minimum — the cell goes
    // unlabelled and keeps its hover title.
    expect(pickLabel(["Abernathy Household", "Abernathy"], 16, 7)).toBeNull();
  });

  /** The rule that stops labelling looking arbitrary: two cells of the
   * same size get the same treatment, whatever their names are long. */
  it("labels a long name and a short one alike at the same cell width", () => {
    expect(pickLabel(["Duarte Household", "Duarte"], 36, 7)).not.toBeNull();
    expect(pickLabel(["Kowalski Household", "Kowalski"], 36, 7)).not.toBeNull();
  });

  it("draws nothing when the cell is too small for any of them", () => {
    expect(pickLabel(candidates, 6, 7)).toBeNull();
    expect(pickLabel([], 200, 7)).toBeNull();
  });
});

describe("fitText", () => {
  it("returns the text unchanged when it fits", () => {
    expect(fitText("Achebe", 200, 7)).toBe("Achebe");
  });

  it("cuts with an ellipsis, to something that actually fits", () => {
    const fitted = fitText("Alvarez Family Trust", 40, 7);
    expect(fitted).not.toBeNull();
    expect(fitted!.endsWith("…")).toBe(true);
    expect(textWidth(fitted!, 7)).toBeLessThanOrEqual(40);
  });

  it("returns null rather than a stub when there is no room", () => {
    expect(fitText("Alvarez Family Trust", 4, 7)).toBeNull();
    expect(fitText("Alvarez Family Trust", 0, 7)).toBeNull();
  });

  /** "Ab…" and "Va…" are debris, not information. A cut that leaves
   * fewer than six characters draws nothing and leaves the name to the
   * hover title. */
  it("refuses a cut that would leave too little to identify", () => {
    expect(fitText("Abernathy Household", 12, 7)).toBeNull();
    const cut = fitText("Abernathy Household", 40, 7)!;
    expect(cut.endsWith("…")).toBe(true);
    expect(cut.length - 1).toBeGreaterThanOrEqual(5);
    expect(textWidth(cut, 7)).toBeLessThanOrEqual(40);
  });

  it("still fits a short word that is simply short", () => {
    // A six-character minimum must not reject "Kim", which is whole.
    expect(fitText("Kim", 200, 7)).toBe("Kim");
  });

  it("does not leave a trailing space before the ellipsis", () => {
    const fitted = fitText("Moreau Household", 46, 7);
    expect(fitted).not.toMatch(/ …$/);
  });
});

describe("neighbour", () => {
  /** A hand-built 2x2 grid, so "what a viewer would call next" is not a
   * matter of opinion:
   *
   *   ┌────── a ──────┬────── b ──────┐
   *   ├────── c ──────┼────── d ──────┤
   */
  const grid = [
    { item: "a", x: 0, y: 0, w: 50, h: 50 },
    { item: "b", x: 50, y: 0, w: 50, h: 50 },
    { item: "c", x: 0, y: 50, w: 50, h: 50 },
    { item: "d", x: 50, y: 50, w: 50, h: 50 },
  ];
  const at = (name: string) => grid.findIndex((c) => c.item === name);
  const go = (name: string, dir: "up" | "down" | "left" | "right") =>
    grid[neighbour(grid, at(name), dir)]!.item;

  it("moves to the cell beside, above and below", () => {
    expect(go("a", "right")).toBe("b");
    expect(go("b", "left")).toBe("a");
    expect(go("a", "down")).toBe("c");
    expect(go("c", "up")).toBe("a");
    expect(go("d", "left")).toBe("c");
    expect(go("d", "up")).toBe("b");
  });

  /** The corner cell of the real chart answered ↑ with the cell beside
   * it, whose centre sat a fraction higher. True, and not what anyone
   * pressing ↑ meant. */
  it("does not treat a sideways cell as being above or below", () => {
    const row = [
      { item: "left", x: 0, y: 0, w: 100, h: 60 },
      { item: "right", x: 100, y: 0, w: 100, h: 58 },
    ];
    expect(neighbour(row, 0, "up")).toBe(0);
    expect(neighbour(row, 0, "down")).toBe(0);
    expect(row[neighbour(row, 0, "right")]!.item).toBe("right");
  });

  it("stays put at the edge of the chart", () => {
    expect(go("a", "up")).toBe("a");
    expect(go("a", "left")).toBe("a");
    expect(go("d", "right")).toBe("d");
    expect(go("d", "down")).toBe("d");
  });

  /** The reason this is not just "the next index": a tall cell beside a
   * stack of short ones has to be reachable from any of them, and → from
   * the tall one has to land on whichever short one it lines up with. */
  it("prefers a cell it shares a row with over a nearer one it does not", () => {
    const stack = [
      { item: "tall", x: 0, y: 0, w: 40, h: 100 },
      { item: "topRight", x: 40, y: 0, w: 60, h: 50 },
      { item: "bottomRight", x: 40, y: 50, w: 60, h: 50 },
    ];
    const index = (n: string) => stack.findIndex((c) => c.item === n);
    // The tall cell's centre is level with the boundary between the two;
    // both overlap its span, and the nearer centre wins.
    expect(stack[neighbour(stack, index("topRight"), "left")]!.item).toBe("tall");
    expect(stack[neighbour(stack, index("bottomRight"), "left")]!.item).toBe("tall");
    expect(stack[neighbour(stack, index("topRight"), "down")]!.item).toBe("bottomRight");
  });

  it("falls back to the nearest cell when nothing lines up", () => {
    const offset = [
      { item: "left", x: 0, y: 0, w: 40, h: 40 },
      { item: "farRight", x: 60, y: 60, w: 40, h: 40 },
    ];
    expect(offset[neighbour(offset, 0, "right")]!.item).toBe("farRight");
    expect(offset[neighbour(offset, 0, "down")]!.item).toBe("farRight");
  });

  it("is reversible across a straight move", () => {
    for (const [name, there, back] of [
      ["a", "right", "left"],
      ["a", "down", "up"],
      ["d", "left", "right"],
      ["d", "up", "down"],
    ] as const) {
      const moved = neighbour(grid, at(name), there);
      expect(grid[neighbour(grid, moved, back)]!.item).toBe(name);
    }
  });

  it("reaches every cell in the real forty-household layout", () => {
    const cells = layout(book);
    const seen = new Set<number>([0]);
    const queue = [0];
    while (queue.length > 0) {
      const current = queue.pop()!;
      for (const dir of ["up", "down", "left", "right"] as const) {
        const next = neighbour(cells, current, dir);
        if (!seen.has(next)) {
          seen.add(next);
          queue.push(next);
        }
      }
    }
    expect(seen.size).toBe(cells.length);
  });

  it("handles an out-of-range index and a single cell", () => {
    expect(neighbour(grid, 99, "right")).toBe(99);
    expect(neighbour([grid[0]!], 0, "right")).toBe(0);
    expect(neighbour([], 0, "up")).toBe(0);
  });
});
