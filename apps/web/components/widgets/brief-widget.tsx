import Link from "next/link";
import type { BriefItem } from "@/lib/calc/brief";
import { AskButton } from "./ask-button";
import { WidgetCard } from "./widget-card";

const DOT: Record<BriefItem["severity"], string> = { high: "bg-loss", medium: "bg-brass", low: "bg-ink-muted" };

export const BRIEF_PROMPT = "What should I do first today, and why?";

/** The daily brief (M-assist item 3): what needs attention, ranked by
 * lib/calc/brief.ts, each line with its reason. "Ask" hands the same list
 * to the assistant, which reads it through get_agenda — the widget and the
 * answer come from one ranking. */
export function BriefWidget({ items, shown }: { items: BriefItem[]; shown: number }) {
  const top = items.slice(0, shown);
  const more = items.length - top.length;
  return (
    <WidgetCard title="Brief">
      <div className="flex h-full flex-col">
        <div className="flex flex-1 flex-col gap-2.5">
          {top.map((item) => (
            <Link key={item.id} href={item.href} title={item.adjustment} className="group flex items-start gap-2.5 hover:opacity-80">
              <span className={`mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full ${DOT[item.severity]}`} />
              <span className="min-w-0 flex-1">
                <span className="block truncate text-sm">
                  {item.title} <span className="text-ink-muted">— {item.subject}</span>
                </span>
                <span className="block truncate text-xs text-ink-muted">{item.why}</span>
              </span>
            </Link>
          ))}
          {items.length === 0 && <div className="text-sm text-ink-muted">Nothing needs attention. Every review is booked, no signals are open, and nothing is overdue.</div>}
        </div>
        <div className="mt-3 flex shrink-0 items-center justify-between border-t border-rule pt-2.5">
          <span className="text-xs text-ink-muted">{more > 0 ? `${more} more` : `${items.length} item${items.length === 1 ? "" : "s"}`}</span>
          <AskButton prompt={BRIEF_PROMPT} className="text-xs font-semibold text-pine hover:underline">
            Walk me through it
          </AskButton>
        </div>
      </div>
    </WidgetCard>
  );
}
