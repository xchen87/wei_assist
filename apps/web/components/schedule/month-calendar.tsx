import Link from "next/link";

export type CalendarEvent = { id: string; date: Date; label: string; tone: "gain" | "brass" | "loss" };

const WEEKDAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
const DOT_CLASS: Record<CalendarEvent["tone"], string> = {
  gain: "bg-gain",
  brass: "bg-brass",
  loss: "bg-loss",
};

function toKey(d: Date) {
  return d.toISOString().slice(0, 10);
}

/** A real month grid — leading/trailing cells, today, and event dots are
 * all computed from the given month and event dates, not hand-laid-out. */
export function MonthCalendar({
  year,
  month, // 0-indexed, matches Date's convention
  events,
  today,
}: {
  year: number;
  month: number;
  events: CalendarEvent[];
  today: Date;
}) {
  const firstOfMonth = new Date(Date.UTC(year, month, 1));
  const startWeekday = firstOfMonth.getUTCDay();
  const daysInMonth = new Date(Date.UTC(year, month + 1, 0)).getUTCDate();
  const totalCells = Math.ceil((startWeekday + daysInMonth) / 7) * 7;

  const eventsByDay = new Map<string, CalendarEvent[]>();
  for (const e of events) {
    const key = toKey(e.date);
    const list = eventsByDay.get(key) ?? [];
    list.push(e);
    eventsByDay.set(key, list);
  }
  const todayKey = toKey(today);

  const cells = Array.from({ length: totalCells }, (_, i) => {
    const dayNum = i - startWeekday + 1;
    if (dayNum < 1 || dayNum > daysInMonth) return null;
    return new Date(Date.UTC(year, month, dayNum));
  });

  return (
    <div className="rounded-card border border-rule p-4">
      <div className="mb-2 grid grid-cols-7 gap-1">
        {WEEKDAYS.map((w) => (
          <div key={w} className="text-center text-xs font-semibold text-ink-muted">
            {w}
          </div>
        ))}
      </div>
      <div className="grid grid-cols-7 gap-1">
        {cells.map((d, i) => {
          if (!d) return <div key={i} className="h-16" />;
          const key = toKey(d);
          const dayEvents = eventsByDay.get(key) ?? [];
          const isToday = key === todayKey;
          return (
            <div key={i} className={`h-16 rounded-control border p-1.5 ${isToday ? "border-pine bg-pine-tint" : "border-rule"}`}>
              <div className={`tabular text-xs ${isToday ? "font-semibold text-pine" : "text-ink-muted"}`}>{d.getUTCDate()}</div>
              <div className="mt-1 flex flex-wrap gap-0.5">
                {dayEvents.slice(0, 4).map((e) => (
                  <Link key={e.id} href={`/clients/${e.id}`} title={e.label}>
                    <span className={`block h-1.5 w-1.5 rounded-full ${DOT_CLASS[e.tone]}`} />
                  </Link>
                ))}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
