import Link from "next/link";

/** Sort state lives entirely in the URL (?sort=aum&dir=desc) so a view is
 * shareable, per CLAUDE.md §6 — no client JS needed for this. */
export function SortableHeader({
  field,
  label,
  align = "left",
  currentSort,
  currentDir,
}: {
  field: string;
  label: string;
  align?: "left" | "right";
  currentSort: string;
  currentDir: "asc" | "desc";
}) {
  const active = currentSort === field;
  const nextDir = active && currentDir === "desc" ? "asc" : "desc";
  const href = `/clients?sort=${field}&dir=${nextDir}`;

  return (
    <Link
      href={href}
      className={`flex items-center gap-1 text-xs font-semibold uppercase tracking-normal ${
        align === "right" ? "justify-end" : "justify-start"
      } ${active ? "text-pine" : "text-ink-muted"}`}
    >
      {label}
      <svg width={10} height={10} viewBox="0 0 10 10" fill="none" className="shrink-0">
        {active ? (
          currentDir === "desc" ? (
            <path d="M2.3 3.8L5 6.5L7.7 3.8" stroke="var(--pine)" strokeWidth={1.7} strokeLinecap="round" strokeLinejoin="round" />
          ) : (
            <path d="M2.3 6.2L5 3.5L7.7 6.2" stroke="var(--pine)" strokeWidth={1.7} strokeLinecap="round" strokeLinejoin="round" />
          )
        ) : (
          <>
            <path d="M2.5 4.2L5 1.8L7.5 4.2" stroke="var(--rule)" strokeWidth={1.3} strokeLinecap="round" strokeLinejoin="round" />
            <path d="M2.5 5.8L5 8.2L7.5 5.8" stroke="var(--rule)" strokeWidth={1.3} strokeLinecap="round" strokeLinejoin="round" />
          </>
        )}
      </svg>
    </Link>
  );
}
