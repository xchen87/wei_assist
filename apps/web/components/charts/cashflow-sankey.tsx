import { formatMoney, centsToNumber, type Cents } from "@/lib/format/money";

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
  incomeCents: Cents;
  taxesCents: Cents;
  netIncomeCents: Cents;
  spendingCents: Cents;
  savingsCents: Cents;
}) {
  const TOP = 24;
  const SCALE_HEIGHT = 200;
  // Vertical gap between the two stacked nodes in a column (Taxes above Net
  // income; Spending above Savings). Without it the two nodes touch, so a
  // connecting ribbon's edges land on the same y on both sides and a bezier
  // curve between two identical points draws a straight line — the ribbon
  // degenerates into a flat rectangle instead of the tapered shape that
  // signals "flow" in a Sankey. See design/Cashflow.dc.html's node layout.
  const NODE_GAP = 24;

  // Cents arrive as bigint from the database (D-023); ribbon geometry is
  // done in numbers, so convert once here rather than at every call site.
  const income = centsToNumber(incomeCents);
  const taxes = centsToNumber(taxesCents);
  const netIncome = centsToNumber(netIncomeCents);
  const spending = centsToNumber(spendingCents);
  const savings = centsToNumber(savingsCents);

  const scale = income > 0 ? SCALE_HEIGHT / income : 0;

  const incomeH = income * scale;
  const taxesH = taxes * scale;
  const netIncomeH = netIncome * scale;
  const spendingH = spending * scale;
  const savingsH = savings * scale;

  const incomeTop = TOP;
  const taxesTop = TOP;
  const taxesBottom = taxesTop + taxesH;
  const netIncomeTop = taxesBottom + NODE_GAP;
  const netIncomeBottom = netIncomeTop + netIncomeH;
  const spendingTop = netIncomeTop;
  const spendingBottom = spendingTop + spendingH;
  const savingsTop = spendingBottom + NODE_GAP;
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
    <text x={x + w / 2} y={(top + bottom) / 2 + 4} textAnchor="middle" fontSize={12} fill="var(--on-accent)" fontFamily="var(--font-public-sans)">
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
      {valueLabel(col1x, col1w, incomeTop, incomeTop + incomeH, income)}
      {nodeLabel(col2x, col2w, taxesTop, "Taxes")}
      {valueLabel(col2x, col2w, taxesTop, taxesBottom, taxes)}
      <text x={col2x + col2w / 2} y={netIncomeBottom + 16} textAnchor="middle" fontSize={12} fontWeight={600} fill="var(--ink)" fontFamily="var(--font-public-sans)">
        Net income
      </text>
      {valueLabel(col2x, col2w, netIncomeTop, netIncomeBottom, netIncome)}
      {nodeLabel(col3x, col3w, spendingTop, "Spending")}
      {valueLabel(col3x, col3w, spendingTop, spendingBottom, spending)}
      <text x={col3x + col3w / 2} y={savingsBottom + 16} textAnchor="middle" fontSize={12} fontWeight={600} fill="var(--ink)" fontFamily="var(--font-public-sans)">
        Savings
      </text>
      {valueLabel(col3x, col3w, savingsTop, savingsBottom, savings)}
    </svg>
  );
}
