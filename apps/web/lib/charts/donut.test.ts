import { describe, expect, it } from "vitest";
import { donutSegments } from "./donut";

type Slice = { name: string; pct: number };
const opts = { cx: 60, cy: 60, innerRadius: 34, outerRadius: 56 };
const build = (slices: Slice[], o = opts) => donutSegments(slices, (s) => s.pct, o);

describe("donutSegments", () => {
  const mix: Slice[] = [
    { name: "equity", pct: 62 },
    { name: "fixedIncome", pct: 33 },
    { name: "cash", pct: 5 },
  ];

  it("gives each value a segment, in the order it was passed", () => {
    expect(build(mix).map((s) => s.item.name)).toEqual(["equity", "fixedIncome", "cash"]);
  });

  it("lays segments end to end with no gaps", () => {
    const segments = build(mix);
    expect(segments[0]!.startPct).toBe(0);
    for (let i = 1; i < segments.length; i++) {
      expect(segments[i]!.startPct).toBeCloseTo(segments[i - 1]!.endPct, 9);
    }
  });

  /** Percentages that have been rounded for display rarely sum to exactly
   * 100. The ring still has to close, or a hairline of background shows
   * through it. */
  it("closes the ring exactly even when the values do not sum to 100", () => {
    for (const slices of [
      [{ name: "a", pct: 33.3 }, { name: "b", pct: 33.3 }, { name: "c", pct: 33.3 }],
      [{ name: "a", pct: 7 }, { name: "b", pct: 4 }],
    ]) {
      expect(build(slices).at(-1)!.endPct).toBe(100);
    }
  });

  it("normalises by the total, so shares are relative not absolute", () => {
    const [first] = build([{ name: "a", pct: 30 }, { name: "b", pct: 10 }]);
    expect(first!.endPct).toBeCloseTo(75, 9);
  });

  it("starts at twelve o'clock and runs clockwise", () => {
    const [quarter] = build([{ name: "a", pct: 25 }, { name: "b", pct: 75 }]);
    // A quarter segment's midpoint sits at 45°, up and to the right of
    // centre: x greater than cx, y less than cy.
    expect(quarter!.labelX).toBeGreaterThan(opts.cx);
    expect(quarter!.labelY).toBeLessThan(opts.cy);
  });

  it("puts the label midway through the ring's thickness", () => {
    const [top] = build([{ name: "a", pct: 50 }, { name: "b", pct: 50 }]);
    const radius = Math.hypot(top!.labelX - opts.cx, top!.labelY - opts.cy);
    expect(radius).toBeCloseTo((opts.innerRadius + opts.outerRadius) / 2, 9);
  });

  it("draws a path that begins with a move and closes", () => {
    for (const segment of build(mix)) {
      expect(segment.path.startsWith("M ")).toBe(true);
      expect(segment.path.trimEnd().endsWith("Z")).toBe(true);
      expect(segment.path).not.toContain("NaN");
    }
  });

  /** One arc cannot describe a whole turn: its ends coincide and nothing
   * is drawn. A sole holding has to come out as a complete ring. */
  it("draws a single value as a closed ring rather than nothing", () => {
    const [only] = build([{ name: "all", pct: 100 }]);
    expect(only!.startPct).toBe(0);
    expect(only!.endPct).toBe(100);
    expect(only!.path.match(/M /g)).toHaveLength(2);
    expect(only!.path).not.toContain("NaN");
  });

  it("sets the large-arc flag for a segment over half the ring", () => {
    const [major, minor] = build([{ name: "a", pct: 70 }, { name: "b", pct: 30 }]);
    expect(major!.path).toMatch(/A 56 56 0 1 1/);
    expect(minor!.path).toMatch(/A 56 56 0 0 1/);
  });

  it("drops values that have no share and keeps the rest whole", () => {
    const segments = build([
      { name: "a", pct: 60 },
      { name: "empty", pct: 0 },
      { name: "negative", pct: -5 },
      { name: "b", pct: 40 },
    ]);
    expect(segments.map((s) => s.item.name)).toEqual(["a", "b"]);
    expect(segments.at(-1)!.endPct).toBe(100);
  });

  it("returns nothing it cannot draw", () => {
    expect(build([])).toEqual([]);
    expect(build([{ name: "a", pct: 0 }])).toEqual([]);
    expect(build(mix, { ...opts, innerRadius: 56, outerRadius: 56 })).toEqual([]);
  });
});
