"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { PLANNING_SECTIONS, SECTION_LABELS, sectionPath } from "@/lib/sections";

/** Scenarios first, then the four disciplines. The scenario explorer is
 * the reason Planning exists as a group, so it is what you land on. */
export function PlanningTabs({ householdId }: { householdId: string }) {
  const pathname = usePathname();

  return (
    <div className="border-b border-rule px-8 pt-6">
      <div className="flex gap-1">
        {PLANNING_SECTIONS.map((section) => {
          const href = sectionPath(householdId, section);
          const active = pathname === href;
          const label = section === "planning" ? "Scenarios" : SECTION_LABELS[section];
          return (
            <Link
              key={section}
              href={href}
              className={`rounded-t-control border-b-2 px-3 py-2 text-sm ${
                active
                  ? "border-pine font-semibold text-pine"
                  : "border-transparent text-ink-muted hover:text-ink"
              }`}
            >
              {label}
            </Link>
          );
        })}
      </div>
    </div>
  );
}
