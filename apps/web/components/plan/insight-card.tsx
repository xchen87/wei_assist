"use client";

import Link from "next/link";
import { useState, useTransition } from "react";
import { usePathname } from "next/navigation";
import { dismissInsight } from "@/app/(app)/clients/[id]/actions";

export type InsightCardData = {
  id: string;
  text: string;
  sourceLabel: string;
  /** When present (Overview and Tasks show insights from every section, so
   * these are always known there), renders a "View in {section}" link that
   * deep-links to the actual section the insight is about — real navigation
   * to where the underlying data can actually be reviewed or changed, not
   * just Accept/Dismiss. Section-scoped pages (Goals, Allocation, etc.)
   * already show only their own section's insights, so the link would just
   * point at the page you're already on — InsightCard detects that via the
   * current pathname and skips it there. */
  householdId?: string;
  section?: string;
};

const SECTION_SLUGS: Record<string, string> = {
  Overview: "",
  Household: "household",
  Cashflow: "cashflow",
  Balance: "balance",
  Allocation: "allocation",
  Goals: "goals",
  Retirement: "retirement",
  Tax: "tax",
  Protection: "protection",
  Estate: "estate",
  Documents: "documents",
  Activity: "activity",
  Compliance: "compliance",
};

/** Insights are AI-generated observations, always cited, always a
 * discussion prompt rather than a directive (CLAUDE.md §9 rule 4).
 * Dismissals are remembered (§6) — both buttons persist via a server
 * action rather than just hiding client-side.
 *
 * Accept and Dismiss currently resolve an insight the SAME way (see
 * actions.ts) — there's no follow-up-task model yet to make "Accept" do
 * anything more than clear the card, so pretending otherwise would be
 * dishonest. The real way to act on something that needs more than a
 * yes/no is the "View in {section}" link below, which takes you to the
 * actual section (Allocation, Goals, ...) where the underlying record
 * lives and can be reviewed or changed for real. */
export function InsightCard({ insight }: { insight: InsightCardData }) {
  const [hidden, setHidden] = useState(false);
  const [isPending, startTransition] = useTransition();
  const pathname = usePathname();

  if (hidden) return null;

  function act() {
    startTransition(async () => {
      await dismissInsight(insight.id, pathname ?? undefined);
      setHidden(true);
    });
  }

  const slug = insight.section ? SECTION_SLUGS[insight.section] : undefined;
  const sectionHref = insight.householdId !== undefined && slug !== undefined ? `/clients/${insight.householdId}${slug ? `/${slug}` : ""}` : null;
  const alreadyThere = sectionHref !== null && pathname === sectionHref;
  const showSectionLink = sectionHref !== null && !alreadyThere;

  return (
    <div className="rounded-card border border-rule p-4">
      <div className="mb-2 text-sm leading-relaxed">{insight.text}</div>
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2.5 text-xs text-ink-muted">
          <span>Source: {insight.sourceLabel}</span>
          {showSectionLink && (
            <Link href={sectionHref} className="font-semibold text-pine hover:underline">
              View in {insight.section}
            </Link>
          )}
        </div>
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
            className="rounded-control bg-pine px-2.5 py-1 text-xs font-semibold text-on-accent disabled:opacity-50"
          >
            Accept
          </button>
        </div>
      </div>
    </div>
  );
}
