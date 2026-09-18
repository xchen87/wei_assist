import { WidgetCard } from "./WidgetCard";

const STAGES = ["Inquiry", "Discovery", "Proposal", "Agreement"] as const;

export function PipelineWidget({ counts }: { counts: Record<string, number> }) {
  const max = Math.max(1, ...STAGES.map((s) => counts[s] ?? 0));
  return (
    <WidgetCard title="Pipeline" span={4}>
      <div className="flex h-16 items-end gap-2">
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
