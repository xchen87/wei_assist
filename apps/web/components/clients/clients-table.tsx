"use client";

import Link from "next/link";
import { useState } from "react";
import { formatMoney } from "@/lib/format/money";
import { formatPercent, formatSignedPercent } from "@/lib/format/percent";
import { formatShortDate } from "@/lib/format/date";
import { formatShortName } from "@/lib/format/name";
import { SortableHeader } from "./sortable-header";

export type ClientRow = {
  id: string;
  name: string;
  segment: string;
  aumCents: number;
  netWorthCents: number;
  heldAwayCents: number;
  ytdReturnPct: number;
  cashPct: number;
  driftPct: number;
  planHealthPct: number;
  lastContactDays: number;
  nextReviewDate: string;
  reviewStatus: string;
  advisorName: string;
};

const ACTIONS = ["Assign", "Tag", "Add to campaign", "Schedule review", "Export"];

/** Drift threshold for the "worth flagging" red highlight — matches the
 * Clients page's own "At risk" saved-view filter (driftPct >= 4), so the
 * table and the filter never disagree about what counts as concerning. */
const DRIFT_ALERT_THRESHOLD = 4;

export function ClientsTable({
  rows,
  activeSort,
  activeDir,
}: {
  rows: ClientRow[];
  activeSort: string;
  activeDir: "asc" | "desc";
}) {
  const [selected, setSelected] = useState<Set<string>>(new Set());

  function toggle(id: string) {
    setSelected((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  }

  return (
    <div>
      {selected.size > 0 && (
        <div className="mb-0.5 flex items-center gap-4 rounded-control bg-pine-tint px-3.5 py-2">
          <div className="text-xs font-semibold text-pine">{selected.size} selected</div>
          {ACTIONS.map((action) => (
            <button
              key={action}
              disabled
              title="Not wired up in this build"
              className="text-xs text-pine opacity-70"
            >
              {action}
            </button>
          ))}
        </div>
      )}

      <table className="w-full table-fixed border-collapse text-sm">
        <colgroup>
          <col style={{ width: 32 }} />
          <col style={{ width: 200 }} />
          <col style={{ width: 90 }} />
          <col style={{ width: 110 }} />
          <col style={{ width: 110 }} />
          <col style={{ width: 100 }} />
          <col style={{ width: 76 }} />
          <col style={{ width: 70 }} />
          <col style={{ width: 70 }} />
          <col style={{ width: 90 }} />
          <col style={{ width: 84 }} />
          <col style={{ width: 92 }} />
          <col style={{ width: 100 }} />
        </colgroup>
        <thead>
          <tr className="border-b border-rule">
            <th />
            {(
              [
                ["name", "HOUSEHOLD", "left"],
                ["segment", "SEGMENT", "left"],
                ["aum", "AUM", "right"],
                ["netWorth", "NET WORTH", "right"],
                ["heldAway", "HELD-AWAY", "right"],
                ["ytd", "YTD", "right"],
                ["cash", "CASH", "right"],
                ["drift", "DRIFT", "right"],
                ["plan", "PLAN", "right"],
                ["contact", "CONTACT", "right"],
                ["review", "REVIEW", "right"],
                ["advisor", "ADVISOR", "left"],
              ] as const
            ).map(([field, label, align]) => (
              <th key={field} className="px-1.5 py-2">
                <SortableHeader field={field} label={label} align={align} currentSort={activeSort} currentDir={activeDir} />
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => {
            const isSelected = selected.has(row.id);
            return (
              <tr
                key={row.id}
                className={`border-b border-rule ${isSelected ? "bg-pine-tint" : ""}`}
              >
                <td className="py-2.5">
                  <button
                    onClick={() => toggle(row.id)}
                    aria-pressed={isSelected}
                    aria-label={`Select ${row.name}`}
                    className={`h-3.5 w-3.5 rounded-control border ${
                      isSelected ? "border-pine bg-pine" : "border-rule bg-transparent"
                    }`}
                  />
                </td>
                <Td strong={activeSort === "name"}>
                  <Link href={`/clients/${row.id}`} className="font-medium hover:underline">
                    {row.name}
                  </Link>
                </Td>
                <Td muted strong={activeSort === "segment"}>
                  {row.segment}
                </Td>
                <Td align="right" strong={activeSort === "aum"}>
                  {formatMoney(row.aumCents, { compact: true })}
                </Td>
                <Td align="right" strong={activeSort === "netWorth"}>
                  {formatMoney(row.netWorthCents, { compact: true })}
                </Td>
                <Td align="right" strong={activeSort === "heldAway"}>
                  {formatMoney(row.heldAwayCents, { compact: true })}
                </Td>
                <Td
                  align="right"
                  strong={activeSort === "ytd"}
                  className={row.ytdReturnPct >= 0 ? "text-gain" : "text-loss"}
                >
                  {formatSignedPercent(row.ytdReturnPct)}
                </Td>
                <Td align="right" strong={activeSort === "cash"}>
                  {formatPercent(row.cashPct)}
                </Td>
                <Td
                  align="right"
                  strong={activeSort === "drift"}
                  className={row.driftPct >= DRIFT_ALERT_THRESHOLD ? "font-semibold text-loss" : undefined}
                >
                  {formatPercent(row.driftPct)}
                </Td>
                <Td
                  align="right"
                  strong={activeSort === "plan"}
                  className={row.planHealthPct < 60 ? "text-loss" : undefined}
                >
                  {row.planHealthPct}%
                </Td>
                <Td
                  align="right"
                  muted
                  strong={activeSort === "contact"}
                  className={row.reviewStatus === "overdue" ? "text-loss" : undefined}
                >
                  {row.lastContactDays}d
                </Td>
                <Td
                  align="right"
                  strong={activeSort === "review"}
                  className={row.reviewStatus === "overdue" ? "text-loss" : undefined}
                >
                  {row.reviewStatus === "overdue" ? "Overdue" : formatShortDate(row.nextReviewDate)}
                </Td>
                <Td muted strong={activeSort === "advisor"}>
                  {formatShortName(row.advisorName)}
                </Td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

function Td({
  children,
  align = "left",
  muted,
  strong,
  className,
}: {
  children: React.ReactNode;
  align?: "left" | "right";
  muted?: boolean;
  strong?: boolean;
  className?: string;
}) {
  return (
    <td
      className={`tabular px-1.5 py-2.5 ${align === "right" ? "text-right" : "text-left"} ${
        muted ? "text-ink-muted" : ""
      } ${strong ? "bg-pine-tint font-semibold" : ""} ${className ?? ""}`}
    >
      {children}
    </td>
  );
}
