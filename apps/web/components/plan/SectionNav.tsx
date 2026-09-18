"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect } from "react";
import { useChatContext } from "@/lib/chat-store";
import { formatMoney } from "@/lib/format/money";

const SECTIONS = [
  { slug: "", label: "Overview" },
  { slug: "household", label: "Household" },
  { slug: "cashflow", label: "Cashflow" },
  { slug: "balance", label: "Balance" },
  { slug: "allocation", label: "Allocation" },
  { slug: "goals", label: "Goals" },
  { slug: "retirement", label: "Retirement" },
  { slug: "tax", label: "Tax" },
  { slug: "protection", label: "Protection" },
  { slug: "estate", label: "Estate" },
  { slug: "documents", label: "Documents" },
  { slug: "activity", label: "Activity" },
  { slug: "compliance", label: "Compliance" },
];

export function SectionNav({
  householdId,
  name,
  segment,
  aumCents,
}: {
  householdId: string;
  name: string;
  segment: string;
  aumCents: number;
}) {
  const pathname = usePathname();
  const setContext = useChatContext((s) => s.setContext);

  useEffect(() => {
    setContext(name, `/clients/${householdId}`);
  }, [name, householdId, setContext]);

  const base = `/clients/${householdId}`;

  return (
    <div className="w-[200px] shrink-0 overflow-y-auto border-r border-rule bg-surface px-3 py-5">
      <div className="px-2 text-xs text-ink-muted">Clients</div>
      <div className="px-2 pb-1 text-lg font-semibold">{name}</div>
      <div className="px-2 pb-5 text-xs text-ink-muted">
        {segment} &middot; {formatMoney(aumCents, { compact: true })} AUM
      </div>

      <div className="flex flex-col gap-px">
        {SECTIONS.map((s, i) => {
          const href = s.slug ? `${base}/${s.slug}` : base;
          const active = pathname === href;
          return (
            <Link
              key={s.slug || "overview"}
              href={href}
              className={`rounded-control px-2.5 py-2 text-sm ${
                active ? "bg-pine-tint font-semibold text-pine" : "text-ink"
              }`}
            >
              {i + 1}&nbsp;&nbsp;{s.label}
            </Link>
          );
        })}
      </div>
    </div>
  );
}
