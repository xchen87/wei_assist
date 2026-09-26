import Link from "next/link";
import { WidgetCard } from "./widget-card";

export type MilestoneItem = {
  id: string;
  href: string;
  householdName: string;
  text: string;
  /** Age triggers get the accent; a plain birthday does not. */
  trigger: boolean;
};

/** Birthdays and age-based triggers (59½, 65, 73) in the coming weeks,
 * computed from members' dates of birth by lib/calc/brief.ts. */
export function MilestonesWidget({ items }: { items: MilestoneItem[] }) {
  return (
    <WidgetCard title="Milestones">
      <div className="flex flex-col gap-2.5">
        {items.map((item) => (
          <Link key={item.id} href={item.href} className="text-sm hover:opacity-80">
            <span className={item.trigger ? "font-medium" : ""}>{item.text}</span>{" "}
            <span className="text-ink-muted">— {item.householdName}</span>
          </Link>
        ))}
        {items.length === 0 && <div className="text-sm text-ink-muted">No birthdays or age triggers in the next 60 days.</div>}
      </div>
    </WidgetCard>
  );
}
