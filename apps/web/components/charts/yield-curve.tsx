export type YieldPoint = { label: string; pct: number };

const X0 = 45;
const X1 = 295;
const Y0 = 10;
const Y1 = 110;

/** Treasury yield curve (CLAUDE.md §8, Markets). Axis scale and point
 * positions are computed from the real pct values, not hand-placed. */
export function YieldCurve({ points }: { points: YieldPoint[] }) {
  const values = points.map((p) => p.pct);
  const min = Math.min(...values);
  const max = Math.max(...values);
  const pad = Math.max((max - min) * 0.2, 0.1);
  const niceMin = Math.floor((min - pad) * 2) / 2;
  const niceMax = Math.ceil((max + pad) * 2) / 2;

  const xFor = (i: number) => X0 + (i / (points.length - 1)) * (X1 - X0);
  const yFor = (pct: number) => Y1 - ((pct - niceMin) / (niceMax - niceMin)) * (Y1 - Y0);

  const gridlines = [niceMax, (niceMax + niceMin) / 2, niceMin];
  const linePoints = points.map((p, i) => `${xFor(i)},${yFor(p.pct)}`).join(" ");

  return (
    <div>
      <svg viewBox="0 0 310 150" className="block w-full" style={{ height: 118 }}>
        {gridlines.map((g, i) => (
          <line key={i} x1={X0} y1={Y0 + (i * (Y1 - Y0)) / 2} x2={X1} y2={Y0 + (i * (Y1 - Y0)) / 2} stroke={i === 2 ? "var(--ink-muted)" : "var(--rule)"} strokeWidth={1} />
        ))}
        {gridlines.map((g, i) => (
          <text key={i} x={X0 - 4} y={Y0 + (i * (Y1 - Y0)) / 2 + 4} textAnchor="end" fontSize={12} fill="var(--ink-muted)" fontFamily="var(--font-public-sans)">
            {g.toFixed(1)}%
          </text>
        ))}
        <text x={8} y={(Y0 + Y1) / 2} textAnchor="middle" fontSize={12} fill="var(--ink-muted)" fontFamily="var(--font-public-sans)" transform={`rotate(-90 8 ${(Y0 + Y1) / 2})`}>
          Yield
        </text>
        <polyline points={linePoints} fill="none" stroke="var(--info)" strokeWidth={2} />
        {points.map((p, i) => (
          <circle key={p.label} cx={xFor(i)} cy={yFor(p.pct)} r={4} fill="var(--info)" stroke="var(--surface)" strokeWidth={2} />
        ))}
        {points.map((p, i) => (
          <text key={`${p.label}-tick`} x={xFor(i) + 4} y={Y1 + 14} textAnchor="start" fontSize={12} fill="var(--ink-muted)" fontFamily="var(--font-public-sans)">
            {p.label}
          </text>
        ))}
        <text x={170} y={142} textAnchor="middle" fontSize={12} fill="var(--ink-muted)" fontFamily="var(--font-public-sans)">
          Maturity
        </text>
      </svg>
      <div className="tabular mt-2.5 flex justify-between text-xs text-ink-muted">
        {points.map((p) => (
          <span key={p.label}>{p.pct.toFixed(2)}%</span>
        ))}
      </div>
    </div>
  );
}
