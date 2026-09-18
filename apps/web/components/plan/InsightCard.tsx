"use client";

import { useState, useTransition } from "react";
import { dismissInsight } from "@/app/(app)/clients/[id]/actions";

export type InsightCardData = {
  id: string;
  text: string;
  sourceLabel: string;
};

/** Insights are AI-generated observations, always cited, always a
 * discussion prompt rather than a directive (CLAUDE.md §9 rule 4).
 * Dismissals are remembered (§6) — both buttons persist via a server
 * action rather than just hiding client-side. */
export function InsightCard({ insight }: { insight: InsightCardData }) {
  const [hidden, setHidden] = useState(false);
  const [isPending, startTransition] = useTransition();

  if (hidden) return null;

  function act() {
    startTransition(async () => {
      await dismissInsight(insight.id);
      setHidden(true);
    });
  }

  return (
    <div className="rounded-card border border-rule p-4">
      <div className="mb-2 text-sm leading-relaxed">{insight.text}</div>
      <div className="flex items-center justify-between">
        <div className="text-xs text-ink-muted">Source: {insight.sourceLabel}</div>
        <div className="flex gap-2">
          <button
            disabled={isPending}
            onClick={act}
            className="rounded-control border border-rule px-2.5 py-1 text-xs disabled:opacity-50"
          >
            Dismiss
          </button>
          <button
            disabled={isPending}
            onClick={act}
            className="rounded-control bg-pine px-2.5 py-1 text-xs font-semibold text-white disabled:opacity-50"
          >
            Accept
          </button>
        </div>
      </div>
    </div>
  );
}
