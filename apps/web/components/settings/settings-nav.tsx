"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const SECTIONS = [
  { slug: "", label: "Organization" },
  { slug: "team", label: "Team" },
  { slug: "appearance", label: "Appearance" },
  { slug: "integrations", label: "Integrations" },
  { slug: "ai", label: "AI" },
  { slug: "billing", label: "Billing" },
];

/** Same left-rail pattern as a household's SectionNav: one subpage per
 * area, every area always listed whether or not it has anything
 * configured. */
export function SettingsNav({ advisorName, orgLabel }: { advisorName: string; orgLabel: string }) {
  const pathname = usePathname();

  return (
    <div className="w-[200px] shrink-0 overflow-y-auto border-r border-rule bg-surface px-3 py-5">
      <div className="px-2 text-xs text-ink-muted">Settings</div>
      <div className="px-2 pb-1 text-lg font-semibold">{advisorName}</div>
      <div className="px-2 pb-5 text-xs text-ink-muted">{orgLabel}</div>

      <div className="flex flex-col gap-px">
        {SECTIONS.map((s) => {
          const href = s.slug ? `/settings/${s.slug}` : "/settings";
          const active = pathname === href;
          return (
            <Link
              key={s.slug || "organization"}
              href={href}
              className={`rounded-control px-2.5 py-2 text-sm ${
                active ? "bg-pine-tint font-semibold text-pine" : "text-ink"
              }`}
            >
              {s.label}
            </Link>
          );
        })}
      </div>
    </div>
  );
}
