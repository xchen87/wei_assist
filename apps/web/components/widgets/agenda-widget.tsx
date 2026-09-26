import Link from "next/link";
import { WidgetCard } from "./widget-card";

export type AgendaItem = {
  id: string;
  href: string;
  day: string; // "Today" | "Tomorrow"
  time: string;
  title: string;
  kind: string;
  /** Prep readiness for a household meeting; "pine" for a prospect. */
  tone: "gain" | "brass" | "loss" | "pine";
};

const DOT: Record<AgendaItem["tone"], string> = { gain: "bg-gain", brass: "bg-brass", loss: "bg-loss", pine: "bg-pine" };

/** Today and tomorrow's meetings for the signed-in advisor, from Meeting
 * rows (D-034), with a prep-readiness dot per household meeting. When both
 * days are clear, the next thing on the calendar is named so the card is
 * never a blank. */
export function AgendaWidget({ items, nextUp }: { items: AgendaItem[]; nextUp: { href: string; when: string; title: string } | null }) {
  const days = Array.from(new Set(items.map((i) => i.day)));
  return (
    <WidgetCard title="Agenda">
      <div className="flex flex-col gap-3">
        {days.map((day) => (
          <div key={day}>
            {days.length > 1 && <div className="mb-1.5 text-xs font-semibold text-ink-muted">{day}</div>}
            <div className="flex flex-col gap-2.5">
              {items
                .filter((i) => i.day === day)
                .map((item) => (
                  <Link key={item.id} href={item.href} className="flex items-center gap-2.5 hover:opacity-80">
                    <span className={`h-1.5 w-1.5 shrink-0 rounded-full ${DOT[item.tone]}`} />
                    <span className="tabular w-16 shrink-0 text-xs text-ink-muted">{item.time}</span>
                    <span className="min-w-0 flex-1 truncate text-sm">{item.title}</span>
                    <span className="shrink-0 text-xs text-ink-muted">{item.kind}</span>
                  </Link>
                ))}
            </div>
          </div>
        ))}
        {items.length === 0 && (
          <div className="text-sm text-ink-muted">
            Nothing today or tomorrow.
            {nextUp && (
              <>
                {" "}
                Next up:{" "}
                <Link href={nextUp.href} className="text-ink hover:underline">
                  {nextUp.title}
                </Link>
                , {nextUp.when}.
              </>
            )}
          </div>
        )}
      </div>
    </WidgetCard>
  );
}
