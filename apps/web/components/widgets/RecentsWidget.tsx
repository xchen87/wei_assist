import Link from "next/link";
import { WidgetCard } from "./WidgetCard";

/** Placeholder ordering (most recently reviewed) until real view-tracking
 * exists — see PROGRESS.md. */
export function RecentsWidget({ items }: { items: { id: string; name: string }[] }) {
  return (
    <WidgetCard title="Recents" span={3}>
      <div className="flex flex-col gap-2.5">
        {items.map((item) => (
          <Link key={item.id} href={`/clients/${item.id}`} className="text-sm hover:opacity-80">
            {item.name}
          </Link>
        ))}
      </div>
    </WidgetCard>
  );
}
