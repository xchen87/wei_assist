import { WidgetCard } from "./widget-card";

/** Illustrative — members are seeded with an age, not a birthdate, so
 * exact milestone dates can't be derived yet (see PROGRESS.md). */
export function MilestonesWidget({ items }: { items: string[] }) {
  return (
    <WidgetCard title="Milestones">
      <div className="flex flex-col gap-2.5">
        {items.map((text, i) => (
          <div key={i} className="text-sm">
            {text}
          </div>
        ))}
      </div>
    </WidgetCard>
  );
}
