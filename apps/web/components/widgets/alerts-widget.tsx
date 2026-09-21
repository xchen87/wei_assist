import Link from "next/link";
import { WidgetCard } from "./widget-card";

export type AlertItem = {
  id: string;
  householdId: string;
  householdName: string;
  severity: string;
  title: string;
  /** "Signals" for engine alerts, or the inline condition that raised it. */
  source: string;
};

const DOT: Record<string, string> = { high: "bg-loss", medium: "bg-brass", low: "bg-ink-muted" };

/** Open signals first, then the inline conditions (drift, overdue reviews)
 * the page computes itself. Both are alerts to an advisor; only the first
 * kind knows *why* a particular household matched, which is why it leads. */
export function AlertsWidget({ items }: { items: AlertItem[] }) {
  return (
    <WidgetCard title="Alerts">
      <div className="flex flex-col gap-2.5">
        {items.map((item) => (
          <Link
            key={item.id}
            href={`/clients/${item.householdId}`}
            className="flex items-start gap-2 text-sm hover:opacity-80"
          >
            <span className={`mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full ${DOT[item.severity] ?? "bg-ink-muted"}`} />
            <span>
              {item.title} — <span className="text-ink-muted">{item.householdName}</span>
            </span>
          </Link>
        ))}
        {items.length === 0 && <div className="text-sm text-ink-muted">Nothing open.</div>}
      </div>
    </WidgetCard>
  );
}
