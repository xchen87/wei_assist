export type CoverageGap = {
  id: string;
  label: string;
  gapPct: number | null; // null = "at target", no bar drawn
  gapLabel: string | null;
};

/** Diverging gap bars (CLAUDE.md §8, Protection): each row's bar extends
 * left (underinsured, --loss) or right (overinsured, --gain) from a center
 * "need met" line, magnitude driven directly by the household's real gap.
 * See design/Protection.dc.html. */
export function ProtectionGapBars({ coverage }: { coverage: CoverageGap[] }) {
  return (
    <div>
      <div className="flex flex-col gap-3.5">
        {coverage.map((c) => {
          const width = c.gapPct === null ? 0 : Math.min(50, Math.abs(c.gapPct) / 2);
          const tone = c.gapPct === null ? "muted" : c.gapPct < 0 ? "loss" : "gain";
          return (
            <div key={c.id} className="grid grid-cols-[130px_1fr_64px] items-center gap-2.5">
              <div className="text-sm">{c.label}</div>
              <div className="relative h-[18px]">
                <div className="absolute inset-y-0 left-1/2 w-px bg-ink-muted" />
                {c.gapPct !== null && (
                  <div
                    className={`absolute inset-y-0.5 ${tone === "loss" ? "bg-loss" : "bg-gain"}`}
                    style={c.gapPct < 0 ? { right: "50%", width: `${width}%` } : { left: "50%", width: `${width}%` }}
                  />
                )}
              </div>
              <div className={`tabular text-right text-xs ${tone === "loss" ? "text-loss" : tone === "gain" ? "text-gain" : "text-ink-muted"}`}>
                {c.gapLabel ?? "At target"}
              </div>
            </div>
          );
        })}
      </div>
      <div className="mt-2 flex justify-between border-t border-rule pt-2 text-xs text-ink-muted">
        <span>← Underinsured</span>
        <span>Need met</span>
        <span>Overinsured →</span>
      </div>
    </div>
  );
}
