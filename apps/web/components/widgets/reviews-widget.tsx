import Link from "next/link";
import { WidgetCard } from "./widget-card";

export function ReviewsWidget({ items }: { items: { id: string; name: string; daysOver: number }[] }) {
  return (
    <WidgetCard title="Reviews">
      <div className="flex flex-col gap-2.5">
        {items.map((item) => (
          <Link key={item.id} href={`/clients/${item.id}`} className="flex justify-between text-sm hover:opacity-80">
            <span>{item.name}</span>
            <span className="tabular text-loss">{item.daysOver}d over</span>
          </Link>
        ))}
        {items.length === 0 && <div className="text-sm text-ink-muted">All caught up.</div>}
      </div>
    </WidgetCard>
  );
}
