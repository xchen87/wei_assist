import { formatMoney, formatSignedMoney } from "@/lib/format/money";

type Step = { label: string; deltaCents: number; kind: "total" | "increase" | "decrease" };

/** A zero-based waterfall (no axis truncation, so the anchor "Start"/"End"
 * bars stay proportionally honest) with direct value labels above every
 * bar, since some flows will always be thin relative to a multi-million
 * dollar net worth. */
export function NetWorthWaterfall({
  startCents,
  contributionsCents,
  growthCents,
  taxesCents,
  spendingCents,
  endCents,
}: {
  startCents: number;
  contributionsCents: number;
  growthCents: number;
  taxesCents: number;
  spendingCents: number;
  endCents: number;
}) {
  const steps: Step[] = [
    { label: "Start", deltaCents: startCents, kind: "total" },
    { label: "Contributions", deltaCents: contributionsCents, kind: "increase" },
    { label: "Market growth", deltaCents: growthCents, kind: "increase" },
    { label: "Taxes paid", deltaCents: -taxesCents, kind: "decrease" },
    { label: "Spending", deltaCents: -spendingCents, kind: "decrease" },
    { label: "End", deltaCents: endCents, kind: "total" },
  ];

  const maxValue = Math.max(startCents, endCents) * 1.08;
  const PLOT_TOP = 20;
  const PLOT_BOTTOM = 190;
  const plotHeight = PLOT_BOTTOM - PLOT_TOP;
  const yFor = (cents: number) => PLOT_BOTTOM - (cents / maxValue) * plotHeight;

  let running = 0;
  const bars = steps.map((step, i) => {
    let top: number, bottom: number;
    if (step.kind === "total") {
      top = yFor(step.deltaCents);
      bottom = PLOT_BOTTOM;
      running = step.deltaCents;
    } else {
      const before = running;
      running += step.deltaCents;
      top = yFor(Math.max(before, running));
      bottom = yFor(Math.min(before, running));
    }
    const x = 75 + i * 90;
    return { x, top, bottom, step };
  });

  const gridLines = [0, 0.25, 0.5, 0.75, 1].map((f) => ({
    y: PLOT_BOTTOM - f * plotHeight,
    value: maxValue * f,
  }));

  const color = { total: "var(--pine)", increase: "var(--gain)", decrease: "var(--loss)" };

  return (
    <svg viewBox="0 0 620 262" className="block w-full" style={{ height: 230 }}>
      {gridLines.map((g, i) => (
        <line key={i} x1={70} y1={g.y} x2={570} y2={g.y} stroke={i === 0 ? "var(--ink-muted)" : "var(--rule)"} strokeWidth={1} />
      ))}
      {gridLines.map((g, i) => (
        <text key={i} x={64} y={g.y + 4} textAnchor="end" fontSize={12} fill="var(--ink-muted)" fontFamily="var(--font-public-sans)">
          {formatMoney(g.value, { compact: true })}
        </text>
      ))}
      <text x={20} y={105} textAnchor="middle" fontSize={12} fill="var(--ink-muted)" fontFamily="var(--font-public-sans)" transform="rotate(-90 20 105)">
        Net worth
      </text>

      {bars.slice(0, -1).map((bar, i) => {
        const next = bars[i + 1]!;
        // The level a bar leaves the running total at is its top edge for
        // "total"/"increase" steps, but its bottom edge for "decrease"
        // steps (a downward bar's new, lower total is its bottom).
        const levelY = bar.step.kind === "decrease" ? bar.bottom : bar.top;
        return (
          <line key={i} x1={bar.x + 60} y1={levelY} x2={next.x} y2={levelY} stroke="var(--rule)" strokeDasharray="3,3" />
        );
      })}

      {bars.map((bar, i) => (
        <rect key={i} x={bar.x} y={bar.top} width={60} height={Math.max(1, bar.bottom - bar.top)} fill={color[bar.step.kind]} />
      ))}

      {bars.map((bar, i) => (
        <text key={i} x={bar.x + 30} y={bar.top - 8} textAnchor="middle" fontSize={12} fontWeight={600} fill="var(--ink)" fontFamily="var(--font-public-sans)">
          {bar.step.kind === "total" ? formatMoney(bar.step.deltaCents, { compact: true }) : formatSignedMoney(bar.step.deltaCents, { compact: true })}
        </text>
      ))}
      {bars.map((bar, i) => (
        <text key={i} x={bar.x + 30} y={212} textAnchor="middle" fontSize={12} fill="var(--ink-muted)" fontFamily="var(--font-public-sans)">
          {bar.step.label}
        </text>
      ))}
    </svg>
  );
}
