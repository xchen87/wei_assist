/** Sparkline (CLAUDE.md §8, Markets). Path is computed from a real value
 * series scaled to the box, never hand-picked pixel points — a value
 * series is easy to eyeball-verify trends direction against, a list of x,y
 * pairs is not. */
export function Sparkline({
  values,
  color,
  width = 48,
  height = 20,
}: {
  values: number[];
  color: string;
  width?: number;
  height?: number;
}) {
  const min = Math.min(...values);
  const max = Math.max(...values);
  const range = max - min || 1;
  const stepX = width / (values.length - 1);
  const points = values.map((v, i) => `${i * stepX},${height - ((v - min) / range) * height}`).join(" ");

  return (
    <svg width={width} height={height} viewBox={`0 0 ${width} ${height}`}>
      <polyline points={points} fill="none" stroke={color} strokeWidth={1.6} />
    </svg>
  );
}
