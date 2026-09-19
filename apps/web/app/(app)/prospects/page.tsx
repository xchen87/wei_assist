import { prisma } from "@meridian/db";
import { PipelineFunnel } from "@/components/charts/pipeline-funnel";
import { formatMoney } from "@/lib/format/money";

export const dynamic = "force-dynamic";

const STAGES = ["Inquiry", "Discovery", "Proposal", "Agreement"] as const;

export default async function ProspectsPage() {
  const prospects = await prisma.prospect.findMany({ include: { advisor: true } });

  const counts: Record<string, number> = {};
  const daysSum: Record<string, number> = {};
  for (const p of prospects) {
    counts[p.stage] = (counts[p.stage] ?? 0) + 1;
    daysSum[p.stage] = (daysSum[p.stage] ?? 0) + p.daysInStage;
  }
  const avgDays: Record<string, number> = {};
  const stalledStages: Record<string, boolean> = {};
  for (const stage of STAGES) {
    avgDays[stage] = counts[stage] ? Math.round(daysSum[stage]! / counts[stage]!) : 0;
    stalledStages[stage] = prospects.some((p) => p.stage === stage && p.stalled);
  }
  const stalledCount = prospects.filter((p) => p.stalled).length;

  return (
    <div className="px-8 py-7">
      <div className="mb-4 flex items-center justify-between">
        <h1 className="text-lg font-semibold">Prospects</h1>
        <button disabled title="Not wired up in this build" className="rounded-control bg-pine px-3.5 py-1.5 text-sm font-semibold text-on-accent opacity-90">
          New prospect
        </button>
      </div>

      {stalledCount > 0 && (
        <div className="mb-4 inline-block rounded-control border border-loss px-2.5 py-1.5 text-xs text-loss">
          {stalledCount} stalled
        </div>
      )}

      <div className="mb-5 rounded-card border border-rule p-5">
        <div className="mb-3.5 text-sm font-semibold">Pipeline funnel</div>
        <PipelineFunnel counts={counts} avgDays={avgDays} stalledStages={stalledStages} />
      </div>

      <div className="grid grid-cols-4 gap-3.5">
        {STAGES.map((stage) => {
          const items = prospects.filter((p) => p.stage === stage);
          return (
            <div key={stage}>
              <div className="mb-2.5 flex items-center justify-between border-b-2 border-rule pb-2.5">
                <div className="text-sm font-semibold">{stage}</div>
                <div className="tabular text-xs text-ink-muted">{items.length}</div>
              </div>
              <div className="flex flex-col gap-2.5">
                {items.map((p) => (
                  <div
                    key={p.id}
                    className={`rounded-card border p-3 ${p.stalled ? "border-loss bg-loss-tint" : "border-rule"}`}
                  >
                    <div className="mb-1 text-sm font-semibold">{p.name}</div>
                    <div className="mb-2.5 text-xs text-ink-muted">{p.source}</div>
                    <div className="flex items-center justify-between">
                      <div className="tabular text-xs font-semibold">
                        {formatMoney(p.estValueCents, { compact: true })} est.
                      </div>
                      <div className={`tabular text-xs ${p.stalled ? "font-semibold text-loss" : "text-ink-muted"}`}>
                        {p.daysInStage}d{p.stalled ? " · stalled" : ""}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
