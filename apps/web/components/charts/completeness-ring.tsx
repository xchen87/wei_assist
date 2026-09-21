import Link from "next/link";

export type SectionCompleteness = { label: string; pct: number; href: string };

/** The segmented completeness ring from CLAUDE.md §8 ("plan progress across
 * sections", Overview). Each section owns an equal arc; how much of its arc
 * is filled is how complete it is. A single ring can only say "82%" — this
 * says which twelve things that 82% is made of, and a short arc is a
 * section to go and finish.
 *
 * The legend beside it is the chart's table equivalent (§8), not decoration:
 * it carries the same numbers in reading order and links to each section,
 * which is also the only way to reach this information with a keyboard. */
export function SegmentedCompletenessRing({
  sections,
  size = 148,
}: {
  sections: SectionCompleteness[];
  size?: number;
}) {
  const stroke = 14;
  const radius = (size - stroke) / 2;
  const circumference = 2 * Math.PI * radius;
  const perSegment = circumference / Math.max(sections.length, 1);
  const gap = Math.min(3, perSegment * 0.18);
  const arc = perSegment - gap;

  const average =
    sections.length === 0
      ? 0
      : Math.round(sections.reduce((sum, s) => sum + s.pct, 0) / sections.length);

  return (
    <div className="flex flex-wrap items-center gap-6">
      <svg
        width={size}
        height={size}
        viewBox={`0 0 ${size} ${size}`}
        role="img"
        aria-label={`Plan completeness by section, averaging ${average}%`}
        className="shrink-0"
      >
        <g transform={`rotate(-90 ${size / 2} ${size / 2})`}>
          {sections.map((section, i) => {
            const offset = -i * perSegment;
            const filled = arc * Math.min(Math.max(section.pct, 0), 100) / 100;
            return (
              <g key={section.label}>
                <circle
                  cx={size / 2}
                  cy={size / 2}
                  r={radius}
                  fill="none"
                  stroke="var(--rule)"
                  strokeWidth={stroke}
                  strokeDasharray={`${arc} ${circumference - arc}`}
                  strokeDashoffset={offset}
                />
                {filled > 0 ? (
                  <circle
                    cx={size / 2}
                    cy={size / 2}
                    r={radius}
                    fill="none"
                    stroke={section.pct < 60 ? "var(--brass)" : "var(--pine)"}
                    strokeWidth={stroke}
                    strokeDasharray={`${filled} ${circumference - filled}`}
                    strokeDashoffset={offset}
                  >
                    <title>{`${section.label}: ${section.pct}%`}</title>
                  </circle>
                ) : null}
              </g>
            );
          })}
        </g>
        <text
          x={size / 2}
          y={size / 2 - 2}
          textAnchor="middle"
          className="tabular"
          fontSize={26}
          fontWeight={700}
          fill="var(--ink)"
        >
          {average}%
        </text>
        <text x={size / 2} y={size / 2 + 16} textAnchor="middle" fontSize={11} fill="var(--ink-muted)">
          average
        </text>
      </svg>

      <div className="grid flex-1 grid-cols-2 gap-x-6 gap-y-1">
        {sections.map((section) => (
          <Link
            key={section.label}
            href={section.href}
            className="flex items-baseline justify-between gap-2 border-b border-rule py-1 text-xs hover:bg-paper"
          >
            <span className="truncate">{section.label}</span>
            <span className={`tabular shrink-0 ${section.pct < 60 ? "font-semibold text-brass" : "text-ink-muted"}`}>
              {section.pct}%
            </span>
          </Link>
        ))}
      </div>
    </div>
  );
}
