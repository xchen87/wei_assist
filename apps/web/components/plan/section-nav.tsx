"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect } from "react";
import { useChatContext } from "@/lib/chat-store";
import { formatMoney } from "@/lib/format/money";
import { NAV_SECTIONS, SECTION_LABELS, sectionPath } from "@/lib/sections";

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

  return (
    <div className="w-[200px] shrink-0 overflow-y-auto border-r border-rule bg-surface px-3 py-5">
      <div className="px-2 text-xs text-ink-muted">Clients</div>
      <div className="px-2 pb-1 text-lg font-semibold">{name}</div>
      <div className="px-2 pb-5 text-xs text-ink-muted">
        {segment} &middot; {formatMoney(aumCents, { compact: true })} AUM
      </div>

      <div className="flex flex-col gap-px">
        {NAV_SECTIONS.map((section, i) => {
          const href = sectionPath(householdId, section);
          // Planning owns four sub-pages, so it stays highlighted while
          // you are inside any of them.
          const active = section === "planning" ? pathname.startsWith(href) : pathname === href;
          return (
            <Link
              key={section}
              href={href}
              className={`rounded-control px-2.5 py-2 text-sm ${
                active ? "bg-pine-tint font-semibold text-pine" : "text-ink"
              }`}
            >
              {i + 1}&nbsp;&nbsp;{SECTION_LABELS[section]}
            </Link>
          );
        })}
      </div>
    </div>
  );
}
