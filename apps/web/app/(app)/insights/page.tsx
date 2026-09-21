import { prisma } from "@meridian/db";
import { BookTreemap } from "@/components/charts/book-treemap";
import { RevenueConcentrationCurve } from "@/components/charts/revenue-concentration-curve";
import { centsToNumber, formatMoney } from "@/lib/format/money";

export const dynamic = "force-dynamic";

export default async function InsightsPage() {
  const households = await prisma.household.findMany({ include: { advisor: true } });

  // Ratios and running totals are number math; cents come out of the
  // database as bigint (D-023).
  const revenues = households.map((h) =>
    Math.round(centsToNumber(h.aumCents) * (h.blendedExpenseRatioPct / 100)),
  );
  const totalAum = households.reduce((s, h) => s + centsToNumber(h.aumCents), 0);
  const totalRevenue = revenues.reduce((s, r) => s + r, 0);

  const bySegment = households.reduce<Record<string, number>>((acc, h) => {
    acc[h.segment] = (acc[h.segment] ?? 0) + 1;
    return acc;
  }, {});

  const byAdvisor = households.reduce<Record<string, { count: number; capacityTarget: number }>>(
    (acc, h) => {
      const entry = acc[h.advisor.name] ?? { count: 0, capacityTarget: h.advisor.capacityTarget };
      entry.count += 1;
      acc[h.advisor.name] = entry;
      return acc;
    },
    {},
  );

  const total10 = revenues
    .slice()
    .sort((a, b) => b - a)
    .slice(0, Math.max(1, Math.round(households.length * 0.1)))
    .reduce((s, r) => s + r, 0);
  const top10Pct = Math.round((total10 / totalRevenue) * 100);

  return (
    <div className="px-8 py-7">
      <h1 className="mb-4 text-lg font-semibold">Insights</h1>

      <div className="mb-6 grid grid-cols-4 gap-3.5">
        <StatCard label="Total AUM" value={formatMoney(totalAum, { compact: true })} />
        <StatCard label="Revenue run rate" value={formatMoney(totalRevenue, { compact: true })} />
        <StatCard
          label="Revenue from top 10% of households"
          value={`${top10Pct}%`}
          tone="brass"
        />
        <StatCard label="Households" value={String(households.length)} />
      </div>

      <div className="mb-6 grid grid-cols-2 gap-5">
        <div>
          <div className="mb-0.5 text-sm font-semibold">Book composition</div>
          <div className="mb-2.5 text-xs text-ink-muted">By AUM, colored by segment · select one to open it</div>
          <BookTreemap
            items={households.map((h) => ({
              id: h.id,
              name: h.name,
              aumCents: centsToNumber(h.aumCents),
              segment: h.segment,
            }))}
          />
          <div className="mt-3 flex gap-3.5 text-xs text-ink-muted">
            <Legend color="var(--pine)" label="Founding" />
            <Legend color="var(--brass)" label="Premier" />
            <Legend color="var(--info)" label="Core" />
          </div>
        </div>
        <div>
          <div className="mb-0.5 text-sm font-semibold">Revenue concentration</div>
          <div className="mb-2.5 text-xs text-ink-muted">How much of total revenue comes from how few households</div>
          <RevenueConcentrationCurve revenues={revenues} />
        </div>
      </div>

      <div className="grid grid-cols-2 gap-5">
        <div className="rounded-card border border-rule p-4">
          <div className="mb-3 text-sm font-semibold">Segment mix</div>
          <div className="mb-2.5 flex h-3.5 overflow-hidden rounded-control">
            {(["Founding", "Premier", "Core"] as const).map((seg) => (
              <div
                key={seg}
                style={{
                  flexGrow: bySegment[seg] ?? 0,
                  background: seg === "Founding" ? "var(--pine)" : seg === "Premier" ? "var(--brass)" : "var(--info)",
                }}
              />
            ))}
          </div>
          <div className="flex gap-4 text-xs text-ink-muted">
            <span>Founding · {bySegment.Founding ?? 0}</span>
            <span>Premier · {bySegment.Premier ?? 0}</span>
            <span>Core · {bySegment.Core ?? 0}</span>
          </div>
        </div>
        <div className="rounded-card border border-rule p-4">
          <div className="mb-3 text-sm font-semibold">Advisor capacity</div>
          {Object.entries(byAdvisor).map(([name, { count, capacityTarget }]) => (
            <div key={name} className="mb-2.5">
              <div className="mb-1 flex justify-between text-sm">
                <span>{name}</span>
                <span className="tabular text-ink-muted">
                  {count} of {capacityTarget}
                </span>
              </div>
              <div className="h-2 overflow-hidden rounded-control bg-paper">
                <div
                  className="h-full bg-pine"
                  style={{ width: `${Math.min(100, (count / capacityTarget) * 100)}%` }}
                />
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function StatCard({ label, value, tone }: { label: string; value: string; tone?: "brass" }) {
  return (
    <div className={`rounded-card border p-3.5 ${tone === "brass" ? "border-brass bg-brass-tint" : "border-rule"}`}>
      <div className={`tabular text-xl font-semibold ${tone === "brass" ? "text-brass" : ""}`}>{value}</div>
      <div className="mt-0.5 text-xs text-ink-muted">{label}</div>
    </div>
  );
}

function Legend({ color, label }: { color: string; label: string }) {
  return (
    <div className="flex items-center gap-1.5">
      <span className="h-2 w-2 rounded-full" style={{ background: color }} />
      {label}
    </div>
  );
}
