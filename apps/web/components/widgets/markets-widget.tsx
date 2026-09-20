import { WidgetCard } from "./widget-card";

/** Illustrative — no market-data integration exists yet (Phase 8). Static
 * on purpose rather than faking a live feed. */
export function MarketsWidget() {
  return (
    <WidgetCard title="Markets">
      <div className="mb-2 flex items-center justify-between">
        <div className="text-sm">S&amp;P 500</div>
        <div className="tabular text-sm text-gain">+0.4%</div>
      </div>
      <div className="mb-2.5 flex items-center justify-between">
        <div className="text-sm">10Y Treasury</div>
        <div className="tabular text-sm">4.12%</div>
      </div>
      <div className="border-t border-rule pt-2 text-xs text-ink-muted">
        Mover: Halden Corp <span className="text-gain">+5.2%</span> on earnings
      </div>
    </WidgetCard>
  );
}
