import Link from "next/link";
import { WidgetCard } from "./widget-card";

export function AlertsWidget({ items }: { items: { id: string; householdId: string; text: string }[] }) {
  return (
    <WidgetCard title="Alerts" span={3}>
      <div className="flex flex-col gap-2.5">
        {items.map((item) => (
          <Link key={item.id} href={`/clients/${item.householdId}`} className="block text-sm hover:opacity-80">
            {item.text}
          </Link>
        ))}
        {items.length === 0 && <div className="text-sm text-ink-muted">No alerts.</div>}
      </div>
    </WidgetCard>
  );
}
