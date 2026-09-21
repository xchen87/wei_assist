"use client";

import Link from "next/link";
import { useTransition } from "react";
import { setAlertStatus } from "@/app/(app)/signals/actions";
import { Badge } from "@/components/ui/badge";

export type AlertCardData = {
  id: string;
  householdId: string;
  householdName: string;
  severity: string;
  title: string;
  rationale: string;
  suggestedAction: string;
  section: string | null;
  status: string;
};

const SEVERITY_TONE: Record<string, "loss" | "brass" | "neutral"> = {
  high: "loss",
  medium: "brass",
  low: "neutral",
};

/** One household, one reason, one next step. The rationale is the point:
 * it is built from that household's own figures, so an advisor can check
 * the claim before acting on it rather than trusting the feed. */
export function AlertCard({ alert, showHousehold = true }: { alert: AlertCardData; showHousehold?: boolean }) {
  const [isPending, startTransition] = useTransition();
  const resolved = alert.status !== "open";

  return (
    <div className={`rounded-card border p-3.5 ${resolved ? "border-rule opacity-60" : "border-rule"}`}>
      <div className="mb-1.5 flex items-baseline justify-between gap-3">
        <div className="flex items-baseline gap-2">
          <Badge tone={SEVERITY_TONE[alert.severity] ?? "neutral"}>{alert.severity}</Badge>
          <span className="text-sm font-semibold">{alert.title}</span>
        </div>
        {showHousehold ? (
          <Link href={`/clients/${alert.householdId}`} className="shrink-0 text-xs font-semibold text-pine hover:underline">
            {alert.householdName}
          </Link>
        ) : null}
      </div>

      <div className="mb-2 text-sm leading-relaxed text-ink">{alert.rationale}</div>
      <div className="mb-2.5 text-sm leading-relaxed text-ink-muted">{alert.suggestedAction}</div>

      <div className="flex items-center gap-2">
        {alert.section ? (
          <Link
            href={`/clients/${alert.householdId}/${alert.section}`}
            className="rounded-control border border-rule px-2.5 py-1 text-xs font-semibold hover:bg-paper"
          >
            Open {alert.section}
          </Link>
        ) : null}
        {resolved ? (
          <span className="text-xs text-ink-muted">{alert.status === "acknowledged" ? "Acknowledged" : "Dismissed"}</span>
        ) : (
          <>
            <button
              disabled={isPending}
              onClick={() => startTransition(() => setAlertStatus(alert.id, "acknowledged"))}
              className="rounded-control bg-pine px-2.5 py-1 text-xs font-semibold text-on-accent disabled:opacity-50"
            >
              Acknowledge
            </button>
            <button
              disabled={isPending}
              onClick={() => startTransition(() => setAlertStatus(alert.id, "dismissed"))}
              className="rounded-control border border-rule px-2.5 py-1 text-xs disabled:opacity-50"
            >
              Not relevant
            </button>
          </>
        )}
      </div>
    </div>
  );
}
