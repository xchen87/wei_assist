import { ILLUSTRATIVE_BRACKETS, bracketPosition } from "@/lib/calc/tax";

/** Stepped bracket bar with fill (CLAUDE.md §8, Tax). Segment widths are the
 * illustrative bracket structure from lib/calc/tax.ts; which segment is
 * "current" and how far it's filled comes from the household's real
 * taxable income. See design/Tax.dc.html. */
export function TaxBracketBar({ taxableIncomeCents }: { taxableIncomeCents: number }) {
  const position = bracketPosition(taxableIncomeCents);
  const widths = ILLUSTRATIVE_BRACKETS.map((b) => (b.widthCents === Infinity ? 15 : b.widthCents / 100 / 1000));

  return (
    <div>
      <div className="mb-2 flex h-9 overflow-hidden rounded-control">
        {ILLUSTRATIVE_BRACKETS.map((b, i) => {
          const reached = i < position.marginalBracketIndex;
          const current = i === position.marginalBracketIndex;
          const background = reached
            ? "var(--pine)"
            : current
              ? `linear-gradient(to right, var(--pine) 0%, var(--pine) ${position.fillPct}%, var(--rule) ${position.fillPct}%, var(--rule) 100%)`
              : "var(--rule)";
          return (
            <div
              key={b.ratePct}
              style={{ flex: widths[i], background }}
              className={`flex items-center justify-center text-xs font-semibold ${reached || current ? "text-white" : "text-ink-muted"}`}
            >
              {b.ratePct}%
            </div>
          );
        })}
      </div>
      <div className="mb-4 flex justify-between text-xs text-ink-muted">
        <span>$0</span>
        <span>Marginal rate by bracket, low to high income →</span>
        <span>Top bracket</span>
      </div>
    </div>
  );
}
