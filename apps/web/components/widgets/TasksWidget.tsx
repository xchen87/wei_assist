import { WidgetCard } from "./WidgetCard";

/** Derived from open (non-dismissed) insights across households — the
 * closest real signal to a task list until a dedicated Task model exists
 * (see PROGRESS.md). */
export function TasksWidget({ items }: { items: { id: string; householdName: string; text: string }[] }) {
  return (
    <WidgetCard title="Tasks" span={3}>
      <div className="flex flex-col gap-2.5">
        {items.map((item) => (
          <div key={item.id}>
            <div className="text-xs font-semibold text-ink-muted">{item.householdName}</div>
            <div className="text-sm">{item.text}</div>
          </div>
        ))}
        {items.length === 0 && <div className="text-sm text-ink-muted">Nothing open.</div>}
      </div>
    </WidgetCard>
  );
}
