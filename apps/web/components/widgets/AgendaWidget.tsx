import Link from "next/link";
import { WidgetCard } from "./WidgetCard";
import { formatShortDate } from "@/lib/format/date";

export function AgendaWidget({
  items,
}: {
  items: { id: string; name: string; date: Date; readiness: "ready" | "partial" | "not-started" }[];
}) {
  const dot = { ready: "bg-gain", partial: "bg-brass", "not-started": "bg-loss" };
  return (
    <WidgetCard title="Agenda" span={6}>
      <div className="flex flex-col gap-2.5">
        {items.map((item) => (
          <Link key={item.id} href={`/clients/${item.id}`} className="flex items-center gap-2.5 hover:opacity-80">
            <span className={`h-1.5 w-1.5 shrink-0 rounded-full ${dot[item.readiness]}`} />
            <span className="tabular w-16 shrink-0 text-xs text-ink-muted">{formatShortDate(item.date)}</span>
            <span className="flex-1 text-sm">{item.name} &mdash; Review</span>
          </Link>
        ))}
        {items.length === 0 && <div className="text-sm text-ink-muted">Nothing scheduled.</div>}
      </div>
    </WidgetCard>
  );
}
