import type { SVGProps } from "react";

/** The nav icon set, redrawn identically from design/Main.dc.html so the
 * shell matches the design record exactly. One consistent style: 20px
 * grid, stroke-based, no fills. */

const base = { viewBox: "0 0 20 20", fill: "none", stroke: "currentColor", strokeWidth: 1.6, strokeLinecap: "round" as const, strokeLinejoin: "round" as const };

export function TodayIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <svg {...base} width={20} height={20} {...props}>
      <circle cx="10" cy="10" r="3.2" />
      <path d="M10 2.2v2M10 15.8v2M2.2 10h2M15.8 10h2M4.6 4.6l1.4 1.4M14 14l1.4 1.4M15.4 4.6L14 6M6 14l-1.4 1.4" />
    </svg>
  );
}

export function ScheduleIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <svg {...base} width={20} height={20} {...props}>
      <rect x="2.5" y="3.8" width="15" height="13.4" rx="1.6" />
      <path d="M2.5 7.8h15M6.4 2v3.2M13.6 2v3.2" />
    </svg>
  );
}

export function TasksIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <svg {...base} width={20} height={20} {...props}>
      <rect x="3" y="3" width="14" height="14" rx="2" />
      <path d="M6.5 10.2l2.3 2.3 4.7-5" />
    </svg>
  );
}

export function ClientsIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <svg {...base} width={20} height={20} {...props}>
      <circle cx="7.2" cy="7" r="2.4" />
      <path d="M2.6 16.4c0-2.7 2-4.4 4.6-4.4s4.6 1.7 4.6 4.4" />
      <circle cx="14.5" cy="7.6" r="1.9" />
      <path d="M12.9 12.1c1.6-.4 3.2.2 4.5 1.6.6.7 1 1.6 1 2.7" />
    </svg>
  );
}

export function ProspectsIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <svg {...base} width={20} height={20} {...props}>
      <path d="M3 3.5h14l-5.2 6.4v5.4l-3.6 2v-7.4z" />
    </svg>
  );
}

export function IntakeIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <svg {...base} width={20} height={20} {...props}>
      <circle cx="8" cy="7" r="3" />
      <path d="M2.5 17c0-3.2 2.4-5.3 5.5-5.3s5.5 2.1 5.5 5.3" />
      <path d="M15 6.5v4M13 8.5h4" />
    </svg>
  );
}

export function MarketsIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <svg {...base} width={20} height={20} {...props}>
      <path d="M2.5 14.5l5-5.2 3.4 3 6.1-6.8" />
      <path d="M13.3 4.8h3.7v3.7" />
    </svg>
  );
}

export function InsightsIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <svg {...base} width={20} height={20} {...props}>
      <path d="M4 16.5V10M9.6 16.5V5.5M15.2 16.5v-8" />
    </svg>
  );
}

export function DocumentsIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <svg {...base} width={20} height={20} {...props}>
      <path d="M5 2.7h7l3.5 3.5v11.1H5z" />
      <path d="M7 9h6M7 12h6M7 15h4" />
    </svg>
  );
}

export function ReportsIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <svg {...base} width={20} height={20} {...props}>
      <rect x="4" y="3.6" width="12" height="14" rx="1.6" />
      <rect x="7" y="2" width="6" height="3" rx="1" />
      <path d="M7 9.5h6M7 12.5h6M7 15.5h3.5" />
    </svg>
  );
}

export function ComplianceIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <svg {...base} width={20} height={20} {...props}>
      <path d="M10 2.4l6.2 2.4v5.1c0 4.3-2.7 7.1-6.2 8.3-3.5-1.2-6.2-4-6.2-8.3V4.8z" />
      <path d="M7.2 10.1l2 2 3.6-4" />
    </svg>
  );
}

export function SettingsIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <svg {...base} width={20} height={20} {...props}>
      <circle cx="10" cy="10" r="2.6" />
      <path d="M10 2.6v2M10 15.4v2M17.4 10h-2M4.6 10h-2M15.1 4.9l-1.4 1.4M6.3 13.7l-1.4 1.4M15.1 15.1l-1.4-1.4M6.3 6.3L4.9 4.9" />
    </svg>
  );
}

export function ChatIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <svg {...base} width={18} height={18} {...props}>
      <path d="M3 4.5h14v9H8.5L5 16.5v-3H3z" />
    </svg>
  );
}

export function ChevronRightIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <svg {...base} width={16} height={16} {...props}>
      <path d="M13 3.5l-6 6.5 6 6.5" />
    </svg>
  );
}

export function CloseIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <svg {...base} width={10} height={10} viewBox="0 0 20 20" {...props}>
      <path d="M5 5l6 6M11 5l-6 6" strokeWidth={1.8} />
    </svg>
  );
}

/** Pin / unpin the nav rail open. */
export function PinIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <svg width={14} height={14} viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth={1.6} strokeLinecap="round" strokeLinejoin="round" {...props}>
      <path d="M8 3h4l-.6 4.2 2.6 2.3v1.3H6v-1.3l2.6-2.3L8 3Z" />
      <path d="M10 10.8V17" />
    </svg>
  );
}

/** Signals — a pulse crossing a threshold. */
export function SignalsIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <svg width={18} height={18} viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth={1.6} strokeLinecap="round" strokeLinejoin="round" {...props}>
      <path d="M2 12h3.2l2-6 2.8 11 2.4-7 1.6 2H18" />
    </svg>
  );
}
