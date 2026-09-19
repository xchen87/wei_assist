export type Candle = { open: number; close: number };

const X0 = 20;
const X1 = 600;
const Y0 = 20;
const Y1 = 120;
const CANDLE_W = 10;

/** Candlestick, on demand (CLAUDE.md §8, Markets). Bar positions and the
 * price-axis scale are computed from the real open/close series, not
 * hand-placed rects. Open/close only (no real high/low tick data exists
 * for this fixture series) — each candle's body spans open to close. */
export function CandlestickChart({ candles, fromLabel, toLabel }: { candles: Candle[]; fromLabel: string; toLabel: string }) {
  const values = candles.flatMap((c) => [c.open, c.close]);
  const min = Math.min(...values);
  const max = Math.max(...values);
  const pad = (max - min) * 0.1;
  const niceMin = min - pad;
  const niceMax = max + pad;

  const xFor = (i: number) => X0 + ((i + 0.5) / candles.length) * (X1 - X0);
  const yFor = (v: number) => Y1 - ((v - niceMin) / (niceMax - niceMin)) * (Y1 - Y0);

  const gridValues = [niceMax, (niceMax + niceMin) / 2, niceMin];

  return (
    <svg viewBox="0 0 700 165" className="block w-full" style={{ height: 145 }}>
      {gridValues.map((g, i) => (
        <line key={i} x1={X0} y1={Y0 + (i * (Y1 - Y0)) / 2} x2={X1} y2={Y0 + (i * (Y1 - Y0)) / 2} stroke={i === 2 ? "var(--ink-muted)" : "var(--rule)"} strokeWidth={1} />
      ))}
      {gridValues.map((g, i) => (
        <text key={i} x={X1 + 6} y={Y0 + (i * (Y1 - Y0)) / 2 + 4} textAnchor="start" fontSize={12} fill="var(--ink-muted)" fontFamily="var(--font-public-sans)">
          ${Math.round(g)}
        </text>
      ))}
      <text x={686} y={70} textAnchor="middle" fontSize={12} fill="var(--ink-muted)" fontFamily="var(--font-public-sans)" transform="rotate(-90 686 70)">
        Price (USD)
      </text>
      <text x={X0} y={144} textAnchor="start" fontSize={12} fill="var(--ink-muted)" fontFamily="var(--font-public-sans)">
        {fromLabel}
      </text>
      <text x={X1} y={144} textAnchor="end" fontSize={12} fill="var(--ink-muted)" fontFamily="var(--font-public-sans)">
        {toLabel}
      </text>
      {candles.map((c, i) => {
        const up = c.close >= c.open;
        const color = up ? "var(--gain)" : "var(--loss)";
        const top = yFor(Math.max(c.open, c.close));
        const bottom = yFor(Math.min(c.open, c.close));
        const x = xFor(i);
        return (
          <g key={i} stroke={color} strokeWidth={2}>
            <line x1={x} y1={top} x2={x} y2={bottom} />
            <rect x={x - CANDLE_W / 2} y={top} width={CANDLE_W} height={Math.max(2, bottom - top)} fill={color} />
          </g>
        );
      })}
    </svg>
  );
}
