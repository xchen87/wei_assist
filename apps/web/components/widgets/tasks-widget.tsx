import Link from "next/link";
import { WidgetCard } from "./widget-card";

export type TaskWidgetItem = {
  id: string;
  subject: string;
  href: string | null;
  title: string;
  due: { text: string; tone: "loss" | "brass" | "neutral" };
};

const DUE_CLASS = { loss: "text-loss", brass: "text-brass", neutral: "text-ink-muted" };

/** The signed-in advisor's open tasks from Task rows (D-034): overdue
 * first, then due soonest, grouped by who they are about. */
export function TasksWidget({ items, openCount }: { items: TaskWidgetItem[]; openCount: number }) {
  const groups = new Map<string, TaskWidgetItem[]>();
  for (const item of items) {
    const list = groups.get(item.subject) ?? [];
    list.push(item);
    groups.set(item.subject, list);
  }
  const shown = items.length;
  return (
    <WidgetCard title="Tasks">
      <div className="flex flex-col gap-2.5">
        {Array.from(groups.entries()).map(([subject, list]) => (
          <div key={subject}>
            {list[0]!.href ? (
              <Link href={list[0]!.href} className="text-xs font-semibold text-ink-muted hover:underline">
                {subject}
              </Link>
            ) : (
              <div className="text-xs font-semibold text-ink-muted">{subject}</div>
            )}
            {list.map((item) => (
              <div key={item.id} className="flex items-baseline justify-between gap-2">
                <span className="min-w-0 flex-1 truncate text-sm">{item.title}</span>
                <span className={`shrink-0 text-xs ${DUE_CLASS[item.due.tone]}`}>{item.due.text}</span>
              </div>
            ))}
          </div>
        ))}
        {items.length === 0 && <div className="text-sm text-ink-muted">Nothing open.</div>}
        {openCount > shown && (
          <Link href="/tasks" className="text-xs text-ink-muted hover:underline">
            {openCount - shown} more in Tasks
          </Link>
        )}
      </div>
    </WidgetCard>
  );
}
