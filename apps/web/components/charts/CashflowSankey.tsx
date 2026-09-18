import { formatMoney } from "@/lib/format/money";

/**
 * Income -> {Taxes, Net income} -> {Spending, Savings}, drawn as tapered
 * ribbons whose edges are glued exactly to their source/destination node
 * boundaries (the fix design/README.md calls out after the mockup shipped
 * with a visible gap at this exact junction — see DECISIONS.md/PROGRESS.md).
 * Node heights and ribbon widths are computed from the real values, not
 * hardcoded, so this reflows correctly for any household.
 */
export function CashflowSankey({
  incomeCents,
  taxesCents,
  netIncomeCents,
  spendingCents,
  savingsCents,
}: {
  incomeCents: number;
  taxesCents: number;
  netIncomeCents: number;
  spendingCents: number;
  savingsCents: number;
}) {
  const TOP = 24;
  const SCALE_HEIGHT = 200;
  const scale = SCALE_HEIGHT / incomeCents;

  const incomeH = incomeCents * scale;
  const taxesH = taxesCents * scale;
  const netIncomeH = netIncomeCents * scale;
  const spendingH = spendingCents * scale;
  const savingsH = savingsCents * scale;

  const incomeTop = TOP;
  const taxesTop = TOP;
  const taxesBottom = taxesTop + taxesH;
  const netIncomeTop = taxesBottom;
  const netIncomeBottom = netIncomeTop + netIncomeH;
  const spendingTop = netIncomeTop;
  const spendingBottom = spendingTop + spendingH;
  const savingsTop = spendingBottom;
  const savingsBottom = savingsTop + savingsH;

  const height = Math.max(savingsBottom, netIncomeBottom) + TOP;

  const col1x = 60;
  const col1w = 90;
  const col2x = 310;
  const col2w = 90;
  const col3x = 560;
  const col3w = 60;

  const ribbon = (x1: number, y1a: number, y1b: number, x2: number, y2a: number, y2b: number) =>
    `M${x1},${y1a} C${(x1 + x2) / 2},${y1a} ${(x1 + x2) / 2},${y2a} ${x2},${y2a} L${x2},${y2b} C${(x1 + x2) / 2},${y2b} ${(x1 + x2) / 2},${y1b} ${x1},${y1b} Z`;

  const nodeLabel = (x: number, w: number, y: number, title: string) => (
    <text x={x + w / 2} y={y - 6} textAnchor="middle" fontSize={12} fontWeight={600} fill="var(--ink)" fontFamily="var(--font-public-sans)">
      {title}
    </text>
  );
  const valueLabel = (x: number, w: number, top: number, bottom: number, cents: number) => (
    <text x={x + w / 2} y={(top + bottom) / 2 + 4} textAnchor="middle" fontSize={12} fill="#fff" fontFamily="var(--font-public-sans)">
      {formatMoney(cents)}
    </text>
  );

  return (
    <svg viewBox={`0 0 620 ${height + 10}`} className="block w-full" style={{ height: 260 }}>
      <path
        d={ribbon(col1x + col1w, incomeTop, taxesBottom, col2x, taxesTop, taxesBottom)}
        fill="var(--brass)"
        fillOpacity={0.5}
      />
      <path
        d={ribbon(col1x + col1w, taxesBottom, incomeTop + incomeH, col2x, netIncomeTop, netIncomeBottom)}
        fill="var(--pine)"
        fillOpacity={0.35}
      />
      <path
        d={ribbon(col2x + col2w, netIncomeTop, spendingBottom, col3x, spendingTop, spendingBottom)}
        fill="var(--info)"
        fillOpacity={0.45}
      />
      <path
        d={ribbon(col2x + col2w, spendingBottom, netIncomeBottom, col3x, savingsTop, savingsBottom)}
        fill="var(--gain)"
        fillOpacity={0.45}
      />

      <rect x={col1x} y={incomeTop} width={col1w} height={incomeH} fill="var(--pine)" />
      <rect x={col2x} y={taxesTop} width={col2w} height={taxesH} fill="var(--brass)" />
      <rect x={col2x} y={netIncomeTop} width={col2w} height={netIncomeH} fill="var(--pine)" />
      <rect x={col3x} y={spendingTop} width={col3w} height={spendingH} fill="var(--info)" />
      <rect x={col3x} y={savingsTop} width={col3w} height={savingsH} fill="var(--gain)" />

      {nodeLabel(col1x, col1w, incomeTop, "Income")}
      {valueLabel(col1x, col1w, incomeTop, incomeTop + incomeH, incomeCents)}
      {nodeLabel(col2x, col2w, taxesTop, "Taxes")}
      {valueLabel(col2x, col2w, taxesTop, taxesBottom, taxesCents)}
      <text x={col2x + col2w / 2} y={netIncomeBottom + 16} textAnchor="middle" fontSize={12} fontWeight={600} fill="var(--ink)" fontFamily="var(--font-public-sans)">
        Net income
      </text>
      {valueLabel(col2x, col2w, netIncomeTop, netIncomeBottom, netIncomeCents)}
      {nodeLabel(col3x, col3w, spendingTop, "Spending")}
      {valueLabel(col3x, col3w, spendingTop, spendingBottom, spendingCents)}
      <text x={col3x + col3w / 2} y={savingsBottom + 16} textAnchor="middle" fontSize={12} fontWeight={600} fill="var(--ink)" fontFamily="var(--font-public-sans)">
        Savings
      </text>
      {valueLabel(col3x, col3w, savingsTop, savingsBottom, savingsCents)}
    </svg>
  );
}
