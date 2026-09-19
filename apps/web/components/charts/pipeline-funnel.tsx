const STAGES = ["Inquiry", "Discovery", "Proposal", "Agreement"] as const;

const VIEWBOX_W = 900;
const SEG_WIDTH = 200;
const GAP = 20;
const LEFT_MARGIN = 0;

/** Both the funnel and its caption row below are positioned from these same
 * xs/SEG_WIDTH numbers — expressed as percentages of VIEWBOX_W, so a plain
 * CSS-percentage overlay lines up with the SVG's own coordinate space
 * exactly, at any container width. An earlier version positioned the
 * captions with an independent `10fr 1fr 10fr 1fr 10fr 1fr 10fr` CSS grid,
 * which only approximates the SVG's actual segment/gap/margin proportions
 * (10:1 vs. the real 200:20, and the grid had no right-margin column to
 * match the SVG's) — close enough to look right at a glance but drifting
 * visibly out of alignment toward the right edge. */
const xs = STAGES.map((_, i) => LEFT_MARGIN + i * (SEG_WIDTH + GAP));
const pct = (px: number) => `${(px / VIEWBOX_W) * 100}%`;

/** A connected, proportionally-narrowing funnel (not a bar chart) — each
 * segment's height reflects its count, and segments taper continuously
 * into the next rather than jumping. Avg days-in-stage is computed from
 * real prospect data, not hardcoded. */
export function PipelineFunnel({
  counts,
  avgDays,
  stalledStages,
}: {
  counts: Record<string, number>;
  avgDays: Record<string, number>;
  stalledStages: Record<string, boolean>;
}) {
  const values = STAGES.map((s) => counts[s] ?? 0);
  const max = Math.max(...values, 1);
  const heightFor = (v: number) => 24 + (v / max) * 96;
  const heights = values.map(heightFor);

  // Segment i tapers from its own stage's height to the NEXT stage's height,
  // so the funnel narrows exactly where the real counts drop off — the last
  // segment has nothing to taper into and stays flat. (An earlier version
  // duplicated the first stage's height as an artificial "before" boundary,
  // which made the first segment always render flat/square regardless of
  // the data — see design/Prospects.dc.html's continuously-narrowing shape.)
  const polygons = STAGES.map((_, i) => {
    const x0 = xs[i]!;
    const x1 = x0 + SEG_WIDTH;
    const hLeft = heights[i]!;
    const hRight = i < STAGES.length - 1 ? heights[i + 1]! : heights[i]!;
    const topLeft = 100 - hLeft / 2;
    const botLeft = 100 + hLeft / 2;
    const topRight = 100 - hRight / 2;
    const botRight = 100 + hRight / 2;
    return `${x0},${topLeft} ${x1},${topRight} ${x1},${botRight} ${x0},${botLeft}`;
  });

  return (
    <div>
      {/* preserveAspectRatio="none": the viewBox (900x200, aspect 4.5) almost
       * never matches the rendered box (fluid width x fixed 160px height),
       * so the default "xMidYMid meet" scaling shrinks the content to fit
       * and centers it — inset from the edges with empty space on the
       * sides. The caption row below assumes the SVG content spans edge to
       * edge (same percentages, no pillarboxing), so without this the two
       * drift apart by that inset amount. "none" stretches the SVG to fill
       * its box exactly, matching the plain-CSS percentage overlay. */}
      <svg viewBox={`0 0 ${VIEWBOX_W} 200`} preserveAspectRatio="none" className="block w-full" style={{ height: 160 }}>
        {polygons.map((points, i) => (
          <polygon
            key={i}
            points={points}
            fill={stalledStages[STAGES[i]!] ? "var(--brass)" : "var(--pine)"}
          />
        ))}
        {STAGES.map((stage, i) => (
          <text
            key={stage}
            x={xs[i]! + SEG_WIDTH / 2}
            y={106}
            textAnchor="middle"
            fontSize={22}
            fontWeight={600}
            fill="#fff"
            fontFamily="var(--font-public-sans)"
          >
            {values[i]}
          </text>
        ))}
      </svg>

      <div className="relative mt-2.5" style={{ height: 54 }}>
        {STAGES.map((stage, i) => {
          const conversionPct = i > 0 ? Math.round(((values[i] ?? 0) / (values[i - 1] || 1)) * 100) : null;
          return (
            <div
              key={stage}
              className="absolute text-center"
              style={{ left: pct(xs[i]!), width: pct(SEG_WIDTH) }}
            >
              <div className="tabular h-4 text-xs text-ink-muted">{conversionPct !== null ? `${conversionPct}%` : ""}</div>
              <div className="text-sm font-semibold">{stage}</div>
              <div className={`mt-0.5 text-xs ${stalledStages[stage] ? "text-loss" : "text-ink-muted"}`}>
                avg {avgDays[stage] ?? 0}d in stage
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
