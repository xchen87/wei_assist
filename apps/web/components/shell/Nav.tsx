"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import type { ComponentType, SVGProps } from "react";
import {
  TodayIcon,
  ScheduleIcon,
  TasksIcon,
  ClientsIcon,
  ProspectsIcon,
  IntakeIcon,
  MarketsIcon,
  InsightsIcon,
  DocumentsIcon,
  ReportsIcon,
  ComplianceIcon,
  SettingsIcon,
} from "@/components/ui/icons";

type NavItem = {
  href: string;
  label: string;
  Icon: ComponentType<SVGProps<SVGSVGElement>>;
};

const GROUPS: NavItem[][] = [
  [
    { href: "/today", label: "Today", Icon: TodayIcon },
    { href: "/schedule", label: "Schedule", Icon: ScheduleIcon },
    { href: "/tasks", label: "Tasks", Icon: TasksIcon },
  ],
  [
    { href: "/clients", label: "Clients", Icon: ClientsIcon },
    { href: "/prospects", label: "Prospects", Icon: ProspectsIcon },
    { href: "/intake", label: "Intake", Icon: IntakeIcon },
  ],
  [
    { href: "/markets", label: "Markets", Icon: MarketsIcon },
    { href: "/insights", label: "Insights", Icon: InsightsIcon },
  ],
  [
    { href: "/documents", label: "Documents", Icon: DocumentsIcon },
    { href: "/reports", label: "Reports", Icon: ReportsIcon },
    { href: "/compliance", label: "Compliance", Icon: ComplianceIcon },
  ],
];

export function Nav() {
  const pathname = usePathname();

  return (
    <nav className="flex h-full w-[72px] shrink-0 flex-col items-center border-r border-rule bg-surface py-4">
      <div className="mb-[22px] flex h-8 w-8 items-center justify-center rounded-control bg-pine text-sm font-bold text-white">
        M
      </div>

      <div className="flex flex-col items-center gap-1">
        {GROUPS.map((group, gi) => (
          <div key={gi} className="flex flex-col items-center gap-1">
            {gi > 0 && <div className="my-2 h-px w-7 bg-rule" />}
            {group.map(({ href, label, Icon }) => {
              const active = pathname?.startsWith(href);
              return (
                <Link
                  key={href}
                  href={href}
                  title={label}
                  aria-current={active ? "page" : undefined}
                  className={`flex h-10 w-10 items-center justify-center rounded-control ${
                    active ? "bg-pine-tint text-pine" : "text-ink-muted hover:bg-paper hover:text-ink"
                  }`}
                >
                  <Icon />
                </Link>
              );
            })}
          </div>
        ))}
      </div>

      <div className="mt-auto flex flex-col items-center">
        <div className="mb-2 h-px w-7 bg-rule" />
        <Link
          href="/settings"
          title="Settings"
          className={`flex h-10 w-10 items-center justify-center rounded-control ${
            pathname?.startsWith("/settings") ? "bg-pine-tint text-pine" : "text-ink-muted hover:bg-paper hover:text-ink"
          }`}
        >
          <SettingsIcon />
        </Link>
      </div>
    </nav>
  );
}
