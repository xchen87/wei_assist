import { WidgetCard } from "./widget-card";
import { formatMoney } from "@/lib/format/money";

export function BookWidget({ aumCents, monthlyFlowCents }: { aumCents: number; monthlyFlowCents: number }) {
  const revenueRunRateCents = Math.round(aumCents * 0.0085);
  return (
    <WidgetCard title="Book" span={4}>
      <div className="tabular text-lg font-semibold">{formatMoney(aumCents, { compact: true })}</div>
      <div className="mb-2.5 text-xs text-ink-muted">AUM</div>
      <div className="flex gap-4 border-t border-rule pt-2">
        <div className="text-xs">
          Flows MTD{" "}
          <span className="tabular font-semibold text-gain">
            +{formatMoney(monthlyFlowCents, { compact: true })}
          </span>
        </div>
        <div className="text-xs">
          Revenue <span className="tabular font-semibold">{formatMoney(revenueRunRateCents, { compact: true })}</span>
        </div>
      </div>
    </WidgetCard>
  );
}
