import type { ReactNode } from "react";
import { CompletenessRing } from "./CompletenessRing";
import { InsightCard, type InsightCardData } from "./InsightCard";

/** The shared scaffold every household-detail section renders through
 * (CLAUDE.md §6): Header, Summary (one primary visual), Detail, Insights,
 * Provenance. Sections should extend this rather than build a bespoke
 * layout — if a section genuinely can't fit it, that's a DECISIONS.md
 * entry, not a silent one-off. */
export function PlanSection({
  title,
  completenessPct,
  updatedLabel,
  actions,
  summary,
  summaryTitle,
  summarySubtitle,
  detailTitle,
  detail,
  insights,
  provenance,
}: {
  title: string;
  completenessPct: number;
  updatedLabel: string;
  actions?: ReactNode;
  summary: ReactNode;
  summaryTitle: string;
  summarySubtitle?: string;
  detailTitle: string;
  detail: ReactNode;
  insights: InsightCardData[];
  provenance: string;
}) {
  return (
    <div className="px-8 pb-10 pt-6">
      {/* Header */}
      <div className="mb-5 flex items-start justify-between border-b border-rule pb-[18px]">
        <div className="flex items-center gap-3.5">
          <CompletenessRing pct={completenessPct} />
          <div>
            <div className="text-lg font-semibold">{title}</div>
            <div className="text-xs text-ink-muted">{updatedLabel}</div>
          </div>
        </div>
        <div className="flex gap-2">{actions}</div>
      </div>

      {/* Summary */}
      <div className="mb-7 rounded-card border border-rule p-5">
        <div className="mb-0.5 text-sm font-semibold">{summaryTitle}</div>
        {summarySubtitle ? <div className="mb-4 text-xs text-ink-muted">{summarySubtitle}</div> : null}
        {summary}
      </div>

      {/* Detail */}
      <div className="mb-7">
        <div className="mb-2.5 text-sm font-semibold">{detailTitle}</div>
        {detail}
      </div>

      {/* Insights */}
      {insights.length > 0 && (
        <div className="mb-7">
          <div className="mb-2.5 text-sm font-semibold">Insights</div>
          <div className="flex flex-col gap-2.5">
            {insights.map((insight) => (
              <InsightCard key={insight.id} insight={insight} />
            ))}
          </div>
        </div>
      )}

      {/* Provenance */}
      <div className="border-t border-rule pt-3 text-xs text-ink-muted">{provenance}</div>
    </div>
  );
}
