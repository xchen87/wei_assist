"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState, type ComponentType, type SVGProps } from "react";
import {
  SignalsIcon,
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
  PinIcon,
} from "@/components/ui/icons";
import { applyNavMode, type NavMode } from "@/lib/preferences";
import { OPEN_PALETTE_EVENT } from "./command-palette";

type NavItem = {
  href: string;
  label: string;
  Icon: ComponentType<SVGProps<SVGSVGElement>>;
};

/** Group labels are visible only when expanded (CLAUDE.md §4) — in the rail
 * they would be four unreadable stubs. */
const GROUPS: { label: string; items: NavItem[] }[] = [
  {
    label: "Work",
    items: [
      { href: "/today", label: "Today", Icon: TodayIcon },
      { href: "/schedule", label: "Schedule", Icon: ScheduleIcon },
      { href: "/tasks", label: "Tasks", Icon: TasksIcon },
    ],
  },
  {
    label: "Relationships",
    items: [
      { href: "/clients", label: "Clients", Icon: ClientsIcon },
      { href: "/prospects", label: "Prospects", Icon: ProspectsIcon },
      { href: "/intake", label: "Intake", Icon: IntakeIcon },
    ],
  },
  {
    label: "Intelligence",
    items: [
      { href: "/signals", label: "Signals", Icon: SignalsIcon },
      { href: "/markets", label: "Markets", Icon: MarketsIcon },
      { href: "/insights", label: "Insights", Icon: InsightsIcon },
    ],
  },
  {
    label: "Records",
    items: [
      { href: "/documents", label: "Documents", Icon: DocumentsIcon },
      { href: "/reports", label: "Reports", Icon: ReportsIcon },
      { href: "/compliance", label: "Compliance", Icon: ComplianceIcon },
    ],
  },
];

export function Nav() {
  const pathname = usePathname();
  const [pinned, setPinned] = useState(false);
  const [hovered, setHovered] = useState(false);

  // The boot script has already set data-nav from storage, so read the
  // attribute rather than storage: one source of truth, and no flash.
  useEffect(() => {
    setPinned(document.documentElement.getAttribute("data-nav") === "pinned");
  }, []);

  const expanded = pinned || hovered;

  function togglePin() {
    const next: NavMode = pinned ? "rail" : "pinned";
    setPinned(!pinned);
    setHovered(false);
    applyNavMode(next);
  }

  return (
    // The shell holds the space; the panel inside it is what expands, so a
    // hover overlays the workspace instead of reflowing it.
    <div className="nav-shell relative h-full shrink-0">
      <nav
        onMouseEnter={() => setHovered(true)}
        onMouseLeave={() => setHovered(false)}
        aria-label="Main"
        className={`absolute inset-y-0 left-0 z-30 flex flex-col overflow-hidden border-r border-rule bg-surface py-4 transition-[width] duration-150 ${
          expanded ? "w-[232px] shadow-sm" : "w-[72px]"
        }`}
      >
        <div className={`mb-nav-logo flex items-center ${expanded ? "px-4" : "justify-center"}`}>
          <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-control bg-pine text-sm font-bold text-on-accent">
            M
          </div>
          {expanded ? (
            <>
              <div className="ml-2.5 flex-1 truncate text-sm font-semibold">Meridian</div>
              <button
                onClick={togglePin}
                aria-pressed={pinned}
                title={pinned ? "Unpin the nav" : "Keep the nav open"}
                className={`flex h-7 w-7 items-center justify-center rounded-control ${
                  pinned ? "bg-pine-tint text-pine" : "text-ink-muted hover:bg-paper hover:text-ink"
                }`}
              >
                <PinIcon />
              </button>
            </>
          ) : null}
        </div>

        <button
          onClick={() => window.dispatchEvent(new CustomEvent(OPEN_PALETTE_EVENT))}
          title="Search households and pages (⌘K)"
          className={`mb-2 flex h-10 items-center rounded-control text-ink-muted hover:bg-paper hover:text-ink ${
            expanded ? "mx-2 gap-2.5 px-2.5" : "mx-auto w-10 justify-center"
          }`}
        >
          <svg
            width={18}
            height={18}
            viewBox="0 0 20 20"
            fill="none"
            stroke="currentColor"
            strokeWidth={1.6}
            strokeLinecap="round"
            className="shrink-0"
          >
            <circle cx="8.8" cy="8.8" r="5.2" />
            <path d="M12.6 12.6l4 4" />
          </svg>
          {expanded ? (
            <>
              <span className="flex-1 truncate text-left text-sm">Search</span>
              <span className="tabular rounded-control border border-rule px-1.5 text-xs">⌘K</span>
            </>
          ) : null}
        </button>

        <div className="flex flex-col gap-1 overflow-y-auto">
          {GROUPS.map((group, gi) => (
            <div key={group.label} className="flex flex-col gap-1">
              {expanded ? (
                <div className={`px-4 pb-0.5 text-xs text-ink-muted ${gi > 0 ? "pt-3" : ""}`}>{group.label}</div>
              ) : (
                gi > 0 && <div className="mx-auto my-2 h-px w-7 bg-rule" />
              )}
              {group.items.map(({ href, label, Icon }) => (
                <NavLink key={href} href={href} label={label} Icon={Icon} expanded={expanded} pathname={pathname} />
              ))}
            </div>
          ))}
        </div>

        <div className="mt-auto flex flex-col">
          <div className={`mb-2 h-px bg-rule ${expanded ? "mx-4" : "mx-auto w-7"}`} />
          <NavLink
            href="/settings"
            label="Settings"
            Icon={SettingsIcon}
            expanded={expanded}
            pathname={pathname}
          />
        </div>
      </nav>
    </div>
  );
}

function NavLink({
  href,
  label,
  Icon,
  expanded,
  pathname,
}: NavItem & { expanded: boolean; pathname: string | null }) {
  const active = pathname?.startsWith(href);
  return (
    <Link
      href={href}
      title={expanded ? undefined : label}
      aria-current={active ? "page" : undefined}
      className={`flex h-10 items-center rounded-control ${
        expanded ? "mx-2 gap-2.5 px-2.5" : "mx-auto w-10 justify-center"
      } ${active ? "bg-pine-tint text-pine" : "text-ink-muted hover:bg-paper hover:text-ink"}`}
    >
      <span className="shrink-0">
        <Icon />
      </span>
      {expanded ? <span className="truncate text-sm">{label}</span> : null}
    </Link>
  );
}
