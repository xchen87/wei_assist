import { Fragment } from "react";

const STAGES = ["Inquiry", "Discovery", "Proposal", "Agreement"] as const;

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

  const segWidth = 190;
  const gap = 20;
  const xs = STAGES.map((_, i) => 20 + i * (segWidth + gap));

  // Segment i tapers from its own stage's height to the NEXT stage's height,
  // so the funnel narrows exactly where the real counts drop off — the last
  // segment has nothing to taper into and stays flat. (An earlier version
  // duplicated the first stage's height as an artificial "before" boundary,
  // which made the first segment always render flat/square regardless of
  // the data — see design/Prospects.dc.html's continuously-narrowing shape.)
  const polygons = STAGES.map((_, i) => {
    const x0 = xs[i]!;
    const x1 = x0 + segWidth;
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
      <svg viewBox="0 0 900 200" className="block w-full" style={{ height: 160 }}>
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
            x={xs[i]! + segWidth / 2}
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
      <div className="mt-2.5 grid grid-cols-[10fr_1fr_10fr_1fr_10fr_1fr_10fr]">
        {STAGES.map((stage, i) => (
          <Fragment key={stage}>
            <div className="text-center">
              <div className="text-sm font-semibold">{stage}</div>
              <div className={`mt-0.5 text-xs ${stalledStages[stage] ? "text-loss" : "text-ink-muted"}`}>
                avg {avgDays[stage] ?? 0}d in stage
              </div>
            </div>
            {i < STAGES.length - 1 && (
              <div className="tabular self-center text-center text-xs text-ink-muted">
                {values[i] ? Math.round(((values[i + 1] ?? 0) / values[i]!) * 100) : 0}%
              </div>
            )}
          </Fragment>
        ))}
      </div>
    </div>
  );
}
