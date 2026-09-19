import { prisma } from "@meridian/db";
import { Sparkline } from "@/components/charts/sparkline";
import { YieldCurve, type YieldPoint } from "@/components/charts/yield-curve";
import { CandlestickChart, type Candle } from "@/components/charts/candlestick-chart";
import { formatMoney } from "@/lib/format/money";
import { formatSignedPercent } from "@/lib/format/percent";

export const dynamic = "force-dynamic";

/** No market-data integration exists yet (Phase 8) — index/rate/watchlist
 * price series below are an honest static snapshot, not a live feed,
 * matching design/Markets.dc.html's own numbers where the design specifies
 * them. Two things ARE grounded in real seed data rather than copied from
 * the design: which tickers appear in the Watchlist (every household's
 * actual topHoldingTicker, not an arbitrary list) and the RMD calendar
 * item's household count (a real query against member ages, not the
 * design's example "3 households"). */

const EQUITIES = [
  { label: "S&P 500", value: 5842.1, changePct: 0.4, series: [5810, 5818, 5825, 5832, 5838, 5835, 5842.1] },
  { label: "Nasdaq Composite", value: 18240.55, changePct: 0.7, series: [18100, 18130, 18160, 18190, 18210, 18225, 18240.55] },
  { label: "Dow Jones", value: 42150.3, changePct: 0.3, series: [42080, 42060, 42100, 42115, 42130, 42140, 42150.3] },
  { label: "VIX", value: 14.82, changePct: -3.1, series: [15.6, 15.3, 15.1, 14.9, 14.85, 14.88, 14.82] },
];

const RATES = [
  { label: "10-Year Treasury", value: "4.12%", deltaLabel: "−0.03", positive: false, series: [4.2, 4.18, 4.16, 4.14, 4.13, 4.125, 4.12] },
  { label: "Fed funds rate", value: "3.88%", deltaLabel: "No change since Sep FOMC", positive: null, series: [3.88, 3.88, 3.88, 3.88, 3.88, 3.88, 3.88] },
  { label: "CPI, year over year", value: "2.6%", deltaLabel: "−0.1pt vs. prior month", positive: false, series: [2.9, 2.8, 2.75, 2.7, 2.65, 2.62, 2.6] },
  { label: "Unemployment", value: "4.1%", deltaLabel: "+0.1pt vs. prior month", positive: true, series: [3.7, 3.8, 3.85, 3.9, 3.95, 4.05, 4.1] },
];

const YIELD_POINTS: YieldPoint[] = [
  { label: "2Y", pct: 3.95 },
  { label: "5Y", pct: 4.02 },
  { label: "10Y", pct: 4.12 },
  { label: "30Y", pct: 4.38 },
];

const CALENDAR_ITEMS = [
  { label: "Tax-loss harvesting window closes", date: "Dec 31" },
  { label: "Roth conversion window closes", date: "Dec 31" },
  { label: "Q4 estimated tax payment due", date: "Jan 15" },
];

const WATCHLIST_FIXTURES: Record<string, { price: number; changePct: number; series: number[] }> = {
  HALD: { price: 142.6, changePct: 5.2, series: [135, 137, 139, 140, 141.5, 142, 142.6] },
  VSTA: { price: 58.14, changePct: -1.1, series: [59.2, 59.0, 58.8, 58.6, 58.4, 58.2, 58.14] },
  NPK: { price: 71.35, changePct: 1.2, series: [70.4, 70.6, 70.8, 70.9, 71.0, 71.2, 71.35] },
  BRLN: { price: 204.9, changePct: 1.5, series: [201.8, 202.3, 202.9, 203.5, 204.0, 204.5, 204.9] },
  ARBR: { price: 88.07, changePct: 0.5, series: [87.6, 87.7, 87.8, 87.9, 88.0, 88.05, 88.07] },
};

const NEWS = [
  { headline: "Halden Corp beats Q3 estimates on strong device sales", source: "MarketWire", age: "2h ago" },
  { headline: "Fed minutes show officials divided on pace of rate cuts", source: "Ledger Daily", age: "4h ago" },
  { headline: "Brightline Systems announces expanded cloud services contract", source: "MarketWire", age: "6h ago" },
  { headline: "IRS opens e-file for prior-year returns; advisors urged to review client withholding", source: "Advisor Wire", age: "8h ago" },
];

const RMD_AGE = 73;

export default async function MarketsPage() {
  const [households, rmdMembers] = await Promise.all([
    prisma.household.findMany({ select: { id: true, name: true, topHoldingTicker: true, topHoldingName: true } }),
    prisma.member.findMany({
      where: { age: { gte: RMD_AGE } },
      select: { householdId: true },
      distinct: ["householdId"],
    }),
  ]);

  const watchlistByTicker = new Map<string, { name: string; households: string[] }>();
  for (const h of households) {
    const entry = watchlistByTicker.get(h.topHoldingTicker) ?? { name: h.topHoldingName, households: [] };
    entry.households.push(h.name);
    watchlistByTicker.set(h.topHoldingTicker, entry);
  }
  const watchlist = Array.from(watchlistByTicker.entries())
    .filter(([ticker]) => WATCHLIST_FIXTURES[ticker])
    .map(([ticker, entry]) => ({ ticker, ...entry, ...WATCHLIST_FIXTURES[ticker]! }))
    .sort((a, b) => b.households.length - a.households.length);

  const gainers = watchlist.filter((w) => w.changePct > 0).sort((a, b) => b.changePct - a.changePct).slice(0, 2);
  const losers = watchlist.filter((w) => w.changePct < 0).sort((a, b) => a.changePct - b.changePct).slice(0, 2);

  const featured = watchlist[0];
  const closes = [122, 118, 124, 120, 126, 131, 127, 133, 137, 132, 138, 142, 139, 143, featured ? featured.series[0]! : 135.5, featured?.price ?? 142.6];
  const candles: Candle[] = closes.slice(1).map((close, i) => ({ open: closes[i]!, close }));

  return (
    <div className="px-8 py-7">
      <h1 className="mb-4 text-lg font-semibold">Markets</h1>

      <div className="mb-2.5 text-xs font-semibold text-ink-muted">Equities</div>
      <div className="mb-5 grid grid-cols-4 gap-3.5">
        {EQUITIES.map((e) => (
          <SnapshotCard key={e.label} label={e.label} value={e.value.toLocaleString("en-US", { minimumFractionDigits: 2 })} changePct={e.changePct} series={e.series} />
        ))}
      </div>

      <div className="mb-2.5 text-xs font-semibold text-ink-muted">Rates &amp; economy</div>
      <div className="mb-6 grid grid-cols-4 gap-3.5">
        {RATES.map((r) => (
          <RateCard key={r.label} {...r} />
        ))}
      </div>

      <div className="mb-6 grid grid-cols-2 gap-5">
        <div>
          <div className="mb-0.5 text-sm font-semibold">Fixed income</div>
          <div className="mb-2.5 text-xs text-ink-muted">Treasury yield curve</div>
          <div className="rounded-card border border-rule p-4">
            <YieldCurve points={YIELD_POINTS} />
          </div>
        </div>

        <div>
          <div className="mb-0.5 text-sm font-semibold">Tax &amp; regulatory calendar</div>
          <div className="mb-2.5 text-xs text-ink-muted">Deadlines that may affect client conversations</div>
          <div className="rounded-card border border-rule px-4">
            <CalendarRow label="RMD deadline" date="Dec 31" badge={`${rmdMembers.length} household${rmdMembers.length === 1 ? "" : "s"}`} />
            {CALENDAR_ITEMS.map((c) => (
              <CalendarRow key={c.label} label={c.label} date={c.date} />
            ))}
          </div>
        </div>
      </div>

      <div className="mb-6 grid grid-cols-[1.4fr_1fr] gap-5">
        <div>
          <div className="mb-2.5 flex items-center justify-between">
            <div className="text-sm font-semibold">Watchlist</div>
            <button disabled title="Not wired up in this build" className="text-xs text-ink-muted">
              + Add ticker
            </button>
          </div>
          <table className="w-full border-collapse text-sm">
            <thead>
              <tr className="border-b border-rule text-xs font-semibold text-ink-muted">
                <th className="py-1.5 text-left">TICKER</th>
                <th className="py-1.5 text-left">NAME</th>
                <th className="py-1.5 text-right">PRICE</th>
                <th className="py-1.5 text-right">CHANGE</th>
                <th className="py-1.5 text-right">HELD BY</th>
                <th className="py-1.5" />
              </tr>
            </thead>
            <tbody>
              {watchlist.map((w, i) => (
                <tr key={w.ticker} className={`border-b border-rule ${i === 0 ? "bg-pine-tint" : ""}`}>
                  <td className="py-2.5 font-semibold">{w.ticker}</td>
                  <td className="py-2.5 text-ink-muted">{w.name}</td>
                  <td className="tabular py-2.5 text-right">{formatMoney(Math.round(w.price * 100))}</td>
                  <td className={`tabular py-2.5 text-right font-semibold ${w.changePct >= 0 ? "text-gain" : "text-loss"}`}>
                    {formatSignedPercent(w.changePct)}
                  </td>
                  <td className="tabular py-2.5 text-right text-xs text-ink-muted">
                    {w.households.length} household{w.households.length === 1 ? "" : "s"}
                  </td>
                  <td className="py-2.5 text-right">
                    <Sparkline values={w.series} color={w.changePct >= 0 ? "var(--gain)" : "var(--loss)"} width={44} height={18} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div>
          <div className="mb-2.5 text-sm font-semibold">Movers</div>
          <div className="rounded-card border border-rule p-4">
            <div className="mb-2 text-xs font-semibold text-ink-muted">Gainers</div>
            {gainers.length > 0 ? (
              gainers.map((g) => (
                <div key={g.ticker} className="mb-2 flex justify-between text-sm">
                  <span>{g.name}</span>
                  <span className="tabular font-semibold text-gain">{formatSignedPercent(g.changePct)}</span>
                </div>
              ))
            ) : (
              <div className="mb-2 text-sm text-ink-muted">No gainers today.</div>
            )}
            <div className="my-3.5 h-px w-full bg-rule" />
            <div className="mb-2 text-xs font-semibold text-ink-muted">Losers</div>
            {losers.length > 0 ? (
              losers.map((l) => (
                <div key={l.ticker} className="mb-2 flex justify-between text-sm last:mb-0">
                  <span>{l.name}</span>
                  <span className="tabular font-semibold text-loss">{formatSignedPercent(l.changePct)}</span>
                </div>
              ))
            ) : (
              <div className="text-sm text-ink-muted">No losers today.</div>
            )}
          </div>
        </div>
      </div>

      {featured && (
        <div className="mb-6 rounded-card border border-rule p-5">
          <div className="mb-3.5 flex items-baseline justify-between">
            <div className="text-sm font-semibold">
              {featured.name} · {featured.ticker} · 30 days
            </div>
            <div className="tabular text-xs text-gain">{formatSignedPercent(featured.changePct)} today</div>
          </div>
          <CandlestickChart candles={candles} fromLabel="30 days ago" toLabel="Today" />
          <div className="mt-2 text-xs text-ink-muted">
            Held as the top holding by {featured.households.length} household{featured.households.length === 1 ? "" : "s"}: {featured.households.join(", ")}
          </div>
        </div>
      )}

      <div className="mb-2.5 text-sm font-semibold">News</div>
      <div className="mb-6 flex flex-col gap-3">
        {NEWS.map((n) => (
          <div key={n.headline} className="border-b border-rule pb-3 last:border-0">
            <div className="mb-1 text-sm">{n.headline}</div>
            <div className="text-xs text-ink-muted">
              {n.source} · {n.age}
            </div>
          </div>
        ))}
      </div>

      <div className="rounded-card border border-dashed border-rule p-4 text-xs text-ink-muted">
        Index levels, rates, watchlist prices, and news above are a static snapshot — no market-data integration
        (Phase 8) is connected in this build. Which tickers appear in the Watchlist, the RMD household count, and the
        candlestick&rsquo;s household attribution are real, computed from the 10 seeded households.
      </div>
    </div>
  );
}

function SnapshotCard({ label, value, changePct, series }: { label: string; value: string; changePct: number; series: number[] }) {
  const positive = changePct >= 0;
  return (
    <div className="rounded-card border border-rule p-3.5">
      <div className="mb-1 text-xs text-ink-muted">{label}</div>
      <div className="flex items-end justify-between">
        <div className="tabular text-lg font-semibold">{value}</div>
        <Sparkline values={series} color={positive ? "var(--gain)" : "var(--loss)"} />
      </div>
      <div className={`tabular mt-0.5 text-xs ${positive ? "text-gain" : "text-loss"}`}>{formatSignedPercent(changePct)}</div>
    </div>
  );
}

function RateCard({
  label,
  value,
  deltaLabel,
  positive,
  series,
}: {
  label: string;
  value: string;
  deltaLabel: string;
  positive: boolean | null;
  series: number[];
}) {
  const color = positive === null ? "var(--ink-muted)" : positive ? "var(--gain)" : "var(--loss)";
  return (
    <div className="rounded-card border border-rule p-3.5">
      <div className="mb-1 text-xs text-ink-muted">{label}</div>
      <div className="flex items-end justify-between">
        <div className="tabular text-lg font-semibold">{value}</div>
        <Sparkline values={series} color={color} />
      </div>
      <div className="tabular mt-0.5 text-xs" style={{ color }}>
        {deltaLabel}
      </div>
    </div>
  );
}

function CalendarRow({ label, date, badge }: { label: string; date: string; badge?: string }) {
  return (
    <div className="flex items-center justify-between border-b border-rule py-2.5 last:border-0">
      <div className="flex items-center gap-2.5">
        <svg width={16} height={16} viewBox="0 0 20 20" fill="none" stroke="var(--ink-muted)" strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round">
          <rect x="2.5" y="3.8" width="15" height="13.4" rx="1.6" />
          <path d="M2.5 7.8h15M6.4 2v3.2M13.6 2v3.2" />
        </svg>
        <div className="text-sm">{label}</div>
      </div>
      <div className="flex items-center gap-2">
        {badge && <span className="rounded-control bg-brass-tint px-2 py-0.5 text-xs text-brass">{badge}</span>}
        <span className="tabular w-14 text-right text-xs text-ink-muted">{date}</span>
      </div>
    </div>
  );
}
