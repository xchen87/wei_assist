import { formatCompactMoney } from "@/lib/format/money";
import type { ScenarioResult } from "@/lib/calc/planning";

/** Portfolio value over the plan's horizon: a p10–p90 band with the median
 * through it, and — when a lever has moved — the plan of record's median as
 * a dashed line behind it. The comparison line is the point. A single fan
 * says "here is a range"; two medians say "this choice is worth that much",
 * which is the sentence the advisor is actually trying to finish. */
export function ScenarioFanChart({
  current,
  baseline,
}: {
  current: ScenarioResult;
  baseline: ScenarioResult | null;
}) {
  const W = 620;
  const H = 210;
  const PAD_L = 52;
  const PAD_R = 12;
  const PAD_T = 12;
  const PAD_B = 26;

  const years = current.years;
  const maxValue = Math.max(
    ...current.p90,
    ...(baseline ? baseline.median : [0]),
    1,
  );

  const x = (i: number) => PAD_L + (i / Math.max(years.length - 1, 1)) * (W - PAD_L - PAD_R);
  const y = (v: number) => H - PAD_B - (v / maxValue) * (H - PAD_T - PAD_B);

  const line = (values: number[]) => values.map((v, i) => `${i === 0 ? "M" : "L"}${x(i)},${y(v)}`).join(" ");
  const band =
    current.p90.map((v, i) => `${i === 0 ? "M" : "L"}${x(i)},${y(v)}`).join(" ") +
    " " +
    [...current.p10].reverse().map((v, i) => `L${x(years.length - 1 - i)},${y(v)}`).join(" ") +
    " Z";

  // The year the household stops contributing and starts drawing: the one
  // moment on this axis an advisor navigates by.
  const retirementX = x(
    Math.min(
      years.length - 1,
      years.findIndex((yr) => yr >= current.firstRetirementYear) === -1
        ? years.length - 1
        : years.findIndex((yr) => yr >= current.firstRetirementYear),
    ),
  );

  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="block w-full" style={{ height: 210 }} role="img"
      aria-label={`Projected portfolio value, ${current.successProbabilityPct}% of paths funded to the end of the plan`}>
      {[0, 0.5, 1].map((f) => (
        <g key={f}>
          <line x1={PAD_L} y1={y(maxValue * f)} x2={W - PAD_R} y2={y(maxValue * f)} stroke="var(--rule)" strokeWidth={1} />
          <text x={PAD_L - 6} y={y(maxValue * f) + 4} textAnchor="end" fontSize={10} fill="var(--ink-muted)" fontFamily="var(--font-public-sans)">
            {formatCompactMoney((maxValue * f) / 100)}
          </text>
        </g>
      ))}

      <line x1={retirementX} y1={PAD_T} x2={retirementX} y2={H - PAD_B} stroke="var(--brass)" strokeWidth={1} strokeDasharray="3,3" />
      <text x={retirementX + 4} y={PAD_T + 9} fontSize={10} fill="var(--brass)" fontFamily="var(--font-public-sans)">
        first retirement
      </text>

      <path d={band} fill="var(--pine-tint)" />
      <path d={line(current.median)} fill="none" stroke="var(--pine)" strokeWidth={2} />

      {baseline ? (
        <path d={line(baseline.median)} fill="none" stroke="var(--ink-muted)" strokeWidth={1.5} strokeDasharray="4,3" />
      ) : null}

      {years.map((yr, i) => (
        <text key={yr} x={x(i)} y={H - 8} textAnchor="middle" fontSize={10} fill="var(--ink-muted)" fontFamily="var(--font-public-sans)">
          {yr === 0 ? "now" : `+${yr}y`}
        </text>
      ))}
    </svg>
  );
}
