import { formatCompactMoney } from "@/lib/format/money";
import type { RetirementProjectionResult } from "@/lib/calc/retirement";

const X0 = 70;
const X1 = 590;
const Y0 = 20;
const Y1 = 190;

/** Monte Carlo fan chart (CLAUDE.md §8, Retirement) — percentile bands and
 * axis scale are computed from the real projection result, not hand-tuned
 * pixel positions. See design/Retirement.dc.html for the visual reference. */
export function RetirementFanChart({ projection }: { projection: RetirementProjectionResult }) {
  const { ages, p10, p25, median, p75, p90 } = projection;
  const maxValue = Math.max(...p90, 1);
  const niceMaxCents = Math.max(Math.ceil(maxValue / 100_000_00) * 100_000_00, 100_000_00);
  const step = niceMaxCents / 3;

  const xForAge = (age: number) => X0 + ((age - ages[0]!) / (ages[ages.length - 1]! - ages[0]!)) * (X1 - X0);
  const yForValue = (v: number) => Y1 - (v / niceMaxCents) * (Y1 - Y0);

  const bandPoints = (upper: number[], lower: number[]) =>
    [
      ...ages.map((age, i) => `${xForAge(age)},${yForValue(upper[i]!)}`),
      ...ages
        .slice()
        .reverse()
        .map((age, ri) => `${xForAge(age)},${yForValue(lower[lower.length - 1 - ri]!)}`),
    ].join(" ");

  const medianPoints = ages.map((age, i) => `${xForAge(age)},${yForValue(median[i]!)}`).join(" ");

  return (
    <svg viewBox="0 0 620 210" className="block w-full" style={{ height: 210 }}>
      {[0, 1, 2, 3].map((i) => (
        <line key={i} x1={X0} y1={Y0 + (i * (Y1 - Y0)) / 3} x2={X1} y2={Y0 + (i * (Y1 - Y0)) / 3} stroke="var(--rule)" strokeWidth={1} />
      ))}
      {[0, 1, 2, 3].map((i) => (
        <text key={i} x={X0 - 6} y={Y0 + (i * (Y1 - Y0)) / 3 + 4} textAnchor="end" fontSize={12} fill="var(--ink-muted)" fontFamily="var(--font-public-sans)">
          {formatCompactMoney((3 - i) * (step / 100))}
        </text>
      ))}
      <text x={20} y={(Y0 + Y1) / 2} textAnchor="middle" fontSize={12} fill="var(--ink-muted)" fontFamily="var(--font-public-sans)" transform={`rotate(-90 20 ${(Y0 + Y1) / 2})`}>
        Projected portfolio value
      </text>

      <line x1={X0} y1={Y1} x2={X1} y2={Y1} stroke="var(--ink-muted)" strokeWidth={1} />
      {ages.map((age, i) => (
        <text key={i} x={xForAge(age)} y={Y1 + 16} textAnchor="middle" fontSize={12} fill="var(--ink-muted)" fontFamily="var(--font-public-sans)">
          {i === 0 ? `${age} (now)` : age}
        </text>
      ))}
      <text x={(X0 + X1) / 2} y={Y1 + 34} textAnchor="middle" fontSize={12} fill="var(--ink-muted)" fontFamily="var(--font-public-sans)">
        Age
      </text>

      <polygon points={bandPoints(p90, p10)} fill="var(--pine)" fillOpacity={0.12} stroke="none" />
      <polygon points={bandPoints(p75, p25)} fill="var(--pine)" fillOpacity={0.28} stroke="none" />
      <polyline points={medianPoints} fill="none" stroke="var(--pine)" strokeWidth={2} />
      <circle cx={xForAge(ages[0]!)} cy={yForValue(median[0]!)} r={4} fill="var(--pine)" stroke="var(--surface)" strokeWidth={2} />
    </svg>
  );
}
