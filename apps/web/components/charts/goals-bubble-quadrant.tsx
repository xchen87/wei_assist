type Goal = { id: string; name: string; priority: string; targetCents: number; fundedPct: number };

const PRIORITY_Y: Record<string, number> = { High: 50, Medium: 145, Low: 240 };

function tierColor(fundedPct: number) {
  if (fundedPct >= 90) return "var(--gain)";
  if (fundedPct >= 50) return "var(--brass)";
  return "var(--loss)";
}

/** Bubble size is area-proportional (radius ~ sqrt(value)), not linear —
 * a linear radius scale would make a $6.5M goal look only ~3x a $150K one
 * instead of the ~6.6x their areas actually differ by. */
export function GoalsBubbleQuadrant({ goals }: { goals: Goal[] }) {
  const maxTarget = Math.max(...goals.map((g) => g.targetCents), 1);
  const radiusFor = (cents: number) => 4.5 + 25.5 * Math.sqrt(cents / maxTarget);
  const xFor = (fundedPct: number) => 70 + Math.min(120, fundedPct) * 3.25;

  return (
    <svg viewBox="0 0 500 300" className="block w-full" style={{ height: 270 }}>
      <line x1={70} y1={10} x2={70} y2={240} stroke="var(--ink-muted)" strokeWidth={1} />
      <line x1={70} y1={240} x2={460} y2={240} stroke="var(--ink-muted)" strokeWidth={1} />
      <line x1={70 + 100 * 3.25} y1={10} x2={70 + 100 * 3.25} y2={240} stroke="var(--rule)" strokeWidth={1} strokeDasharray="3,3" />
      <text x={70 + 100 * 3.25} y={20} textAnchor="middle" fontSize={12} fill="var(--ink-muted)" fontFamily="var(--font-public-sans)">
        Fully funded
      </text>

      <text x={64} y={54} textAnchor="end" fontSize={12} fill="var(--ink-muted)" fontFamily="var(--font-public-sans)">High</text>
      <text x={64} y={149} textAnchor="end" fontSize={12} fill="var(--ink-muted)" fontFamily="var(--font-public-sans)">Medium</text>
      <text x={64} y={244} textAnchor="end" fontSize={12} fill="var(--ink-muted)" fontFamily="var(--font-public-sans)">Low</text>
      <text x={14} y={145} textAnchor="middle" fontSize={12} fill="var(--ink-muted)" fontFamily="var(--font-public-sans)" transform="rotate(-90 14 145)">
        Priority
      </text>

      <text x={70} y={256} fontSize={12} fill="var(--ink-muted)" fontFamily="var(--font-public-sans)">0%</text>
      <text x={232.5} y={256} textAnchor="middle" fontSize={12} fill="var(--ink-muted)" fontFamily="var(--font-public-sans)">50%</text>
      <text x={395} y={256} textAnchor="middle" fontSize={12} fill="var(--ink-muted)" fontFamily="var(--font-public-sans)">100%</text>
      <text x={265} y={274} textAnchor="middle" fontSize={12} fill="var(--ink-muted)" fontFamily="var(--font-public-sans)">Funded</text>

      {goals.map((g) => {
        const cx = xFor(g.fundedPct);
        const cy = PRIORITY_Y[g.priority] ?? 145;
        const r = radiusFor(g.targetCents);
        return <circle key={g.id} cx={cx} cy={cy} r={r} fill={tierColor(g.fundedPct)} fillOpacity={0.85} />;
      })}
      {goals.slice(0, 2).map((g) => {
        const cx = xFor(g.fundedPct);
        const cy = PRIORITY_Y[g.priority] ?? 145;
        const r = radiusFor(g.targetCents);
        return (
          <text key={g.id} x={cx} y={cy + r + 14} textAnchor="middle" fontSize={12} fill="var(--ink-muted)" fontFamily="var(--font-public-sans)">
            {g.name}
          </text>
        );
      })}
    </svg>
  );
}
