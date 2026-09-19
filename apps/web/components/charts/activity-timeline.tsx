import { formatShortDate, formatDaysAgo, formatTime, daysUntil } from "@/lib/format/date";

export type ActivityEventData = {
  id: string;
  kind: string;
  label: string;
  detail: string | null;
  occurredAt: string;
};

const KIND_COLOR: Record<string, string> = {
  Meeting: "var(--pine)",
  Document: "var(--info)",
  TaskCompleted: "var(--gain)",
  Note: "var(--brass)",
  PlanChange: "var(--ink-muted)",
};
const KIND_LABEL: Record<string, string> = {
  Meeting: "Meeting",
  Document: "Document",
  TaskCompleted: "Task completed",
  Note: "Note",
  PlanChange: "Plan change",
};

function whenLabel(occurredAt: string) {
  const days = -daysUntil(occurredAt);
  if (days <= 0) return `Today, ${formatTime(occurredAt)}`;
  if (days <= 6) return `${formatDaysAgo(days)} ago`;
  return formatShortDate(occurredAt);
}

/** Timeline (CLAUDE.md §6/§8, Activity): meetings, notes, documents, and
 * plan changes, most recent first, colored by kind — real events from the
 * database, not hardcoded rows. See design/Activity.dc.html. */
export function ActivityTimeline({ events }: { events: ActivityEventData[] }) {
  const sorted = [...events].sort((a, b) => new Date(b.occurredAt).getTime() - new Date(a.occurredAt).getTime());
  const kindsPresent = Array.from(new Set(sorted.map((e) => e.kind)));

  return (
    <div>
      <div className="relative pl-7">
        <div className="absolute bottom-1.5 left-[7px] top-1.5 w-px bg-rule" />
        {sorted.map((event, i) => (
          <div key={event.id} className={i < sorted.length - 1 ? "relative pb-5" : "relative"}>
            <div
              className="absolute -left-7 top-0.5 h-4 w-4 rounded-full border-[3px] border-surface"
              style={{ background: KIND_COLOR[event.kind] ?? "var(--ink-muted)" }}
            />
            <div className="flex items-baseline justify-between">
              <div className="text-sm">
                <span className="font-semibold">{KIND_LABEL[event.kind] ?? event.kind}</span> — {event.label}
              </div>
              <div className="whitespace-nowrap text-xs text-ink-muted">{whenLabel(event.occurredAt)}</div>
            </div>
            {event.detail && <div className="mt-1 text-xs text-ink-muted">{event.detail}</div>}
          </div>
        ))}
      </div>

      <div className="mt-4 flex flex-wrap gap-3.5 border-t border-rule pt-3.5 text-xs text-ink-muted">
        {kindsPresent.map((kind) => (
          <div key={kind} className="flex items-center gap-1.5">
            <div className="h-2 w-2 rounded-full" style={{ background: KIND_COLOR[kind] ?? "var(--ink-muted)" }} />
            {KIND_LABEL[kind] ?? kind}
          </div>
        ))}
      </div>
    </div>
  );
}
