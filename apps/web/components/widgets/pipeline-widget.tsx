import { WidgetCard } from "./widget-card";

const STAGES = ["Inquiry", "Discovery", "Proposal", "Agreement"] as const;

export function PipelineWidget({ counts }: { counts: Record<string, number> }) {
  const max = Math.max(1, ...STAGES.map((s) => counts[s] ?? 0));
  return (
    <WidgetCard title="Pipeline" span={4}>
      {/* No fixed height here on purpose: a flex row's cross-size is the
       * tallest item's natural height, so this always fits count number +
       * bar + label for whichever stage has the tallest bar. A hardcoded
       * height (h-16 = 64px, sized to the 44px max bar alone, forgetting
       * the count/label text stacked around it) overflowed upward into the
       * "Pipeline" title above whenever the tallest bar's stage actually
       * hit max height — e.g. once Inquiry became the largest stage. */}
      <div className="flex items-end gap-2">
        {STAGES.map((stage) => {
          const count = counts[stage] ?? 0;
          const height = Math.max(4, (count / max) * 44);
          return (
            <div key={stage} className="flex flex-1 flex-col items-center gap-1">
              <div className="tabular text-xs font-semibold">{count}</div>
              <div className="w-full rounded-cell bg-pine" style={{ height }} />
              <div className="text-xs text-ink-muted">{stage}</div>
            </div>
          );
        })}
      </div>
    </WidgetCard>
  );
}
