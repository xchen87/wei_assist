/** A real Lorenz-style concentration curve computed from each household's
 * actual revenue (AUM × blended expense ratio), sorted descending —
 * not a hardcoded "top 10% = X%" figure. */
export function RevenueConcentrationCurve({ revenues }: { revenues: number[] }) {
  const sorted = [...revenues].sort((a, b) => b - a);
  const total = sorted.reduce((s, r) => s + r, 0) || 1;
  const n = sorted.length;

  const points: { xPct: number; yPct: number }[] = [{ xPct: 0, yPct: 0 }];
  let cumulative = 0;
  sorted.forEach((r, i) => {
    cumulative += r;
    points.push({ xPct: ((i + 1) / n) * 100, yPct: (cumulative / total) * 100 });
  });

  const top10 = points.find((p) => p.xPct >= 10) ?? points[1]!;

  const X0 = 55, X1 = 320, Y0 = 170, Y1 = 10;
  const toX = (pct: number) => X0 + (pct / 100) * (X1 - X0);
  const toY = (pct: number) => Y0 - (pct / 100) * (Y0 - Y1);

  const path = points.map((p) => `${toX(p.xPct)},${toY(p.yPct)}`).join(" ");

  return (
    <div>
      <svg viewBox="0 0 340 210" className="block w-full" style={{ height: 210 }}>
        <line x1={X0} y1={Y1} x2={X1} y2={Y1} stroke="var(--rule)" strokeWidth={1} />
        <line x1={X0} y1={100} x2={X1} y2={100} stroke="var(--rule)" strokeWidth={1} />
        <line x1={X0} y1={Y0} x2={X1} y2={Y0} stroke="var(--ink-muted)" strokeWidth={1} />
        <text x={48} y={14} textAnchor="end" fontSize={12} fill="var(--ink-muted)" fontFamily="var(--font-public-sans)">100%</text>
        <text x={48} y={94} textAnchor="end" fontSize={12} fill="var(--ink-muted)" fontFamily="var(--font-public-sans)">50%</text>
        <text x={48} y={174} textAnchor="end" fontSize={12} fill="var(--ink-muted)" fontFamily="var(--font-public-sans)">0%</text>
        <text x={16} y={90} textAnchor="middle" fontSize={12} fill="var(--ink-muted)" fontFamily="var(--font-public-sans)" transform="rotate(-90 16 90)">
          Cumulative revenue
        </text>

        <text x={X0} y={188} fontSize={12} fill="var(--ink-muted)" fontFamily="var(--font-public-sans)">0%</text>
        <text x={(X0 + X1) / 2} y={188} textAnchor="middle" fontSize={12} fill="var(--ink-muted)" fontFamily="var(--font-public-sans)">50%</text>
        <text x={X1} y={188} textAnchor="end" fontSize={12} fill="var(--ink-muted)" fontFamily="var(--font-public-sans)">100%</text>
        <text x={(X0 + X1) / 2} y={206} textAnchor="middle" fontSize={12} fill="var(--ink-muted)" fontFamily="var(--font-public-sans)">
          Cumulative share of households
        </text>

        <polyline points={path} fill="none" stroke="var(--pine)" strokeWidth={2} />
        <line x1={toX(top10.xPct)} y1={toY(top10.yPct)} x2={toX(top10.xPct)} y2={Y0} stroke="var(--brass)" strokeWidth={1} strokeDasharray="3,3" />
        <circle cx={toX(top10.xPct)} cy={toY(top10.yPct)} r={4} fill="var(--brass)" stroke="var(--surface)" strokeWidth={2} />
        <text x={toX(top10.xPct) + 8} y={toY(top10.yPct) - 4} fontSize={12} fontWeight={600} fill="var(--ink)" fontFamily="var(--font-public-sans)">
          Top 10% → {top10.yPct.toFixed(0)}% of revenue
        </text>
      </svg>
    </div>
  );
}
