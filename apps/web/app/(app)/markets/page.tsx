/** No market-data integration exists yet (Phase 8) — this is an honest
 * static snapshot, not a live feed, matching design/Markets.dc.html's
 * framing. Real wiring is a follow-up, not faked here. */
export default function MarketsPage() {
  return (
    <div className="px-8 py-7">
      <h1 className="mb-4 text-lg font-semibold">Markets</h1>
      <div className="grid grid-cols-4 gap-3.5">
        <SnapshotCard label="S&P 500" value="5,842.10" delta="+0.4%" positive />
        <SnapshotCard label="Nasdaq Composite" value="18,240.55" delta="+0.7%" positive />
        <SnapshotCard label="10-Year Treasury" value="4.12%" delta="−0.03" />
        <SnapshotCard label="VIX" value="14.82" delta="−3.1%" />
      </div>
      <div className="mt-6 rounded-card border border-dashed border-rule p-6 text-sm text-ink-muted">
        Watchlists, the fixed-income yield curve, and the tax &amp; regulatory calendar depend on a market-data
        integration (Phase 8) that isn&rsquo;t connected in this build. See design/Markets.dc.html for the intended
        layout.
      </div>
    </div>
  );
}

function SnapshotCard({ label, value, delta, positive }: { label: string; value: string; delta: string; positive?: boolean }) {
  return (
    <div className="rounded-card border border-rule p-3.5">
      <div className="mb-1 text-xs text-ink-muted">{label}</div>
      <div className="tabular text-lg font-semibold">{value}</div>
      <div className={`tabular mt-0.5 text-xs ${positive ? "text-gain" : "text-loss"}`}>{delta}</div>
    </div>
  );
}
