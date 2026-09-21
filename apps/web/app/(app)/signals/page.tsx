import { prisma } from "@meridian/db";
import { ScenarioRunner } from "@/components/signals/scenario-runner";
import { AlertCard } from "@/components/signals/alert-card";
import { Badge } from "@/components/ui/badge";
import { EmptyState } from "@/components/ui/empty-state";
import { formatDate } from "@/lib/format/date";
import { formatMoney } from "@/lib/format/money";
import { SIGNAL_RULE_COUNT, bySeverity } from "@/lib/calc/signals";

export const dynamic = "force-dynamic";

/** Signals: what this book is watching, what moved, and who it touched.
 *
 * The page is arranged in that order on purpose — an advisor's first
 * question about an alert is "why me, and why this household", so the
 * indicator and its move sit above the households it named, and every
 * alert carries the household's own figures as its reason. */
export default async function SignalsPage() {
  const [indicators, changes, openCount] = await Promise.all([
    prisma.indicator.findMany({
      include: { watches: { include: { advisor: { select: { name: true } } } } },
      orderBy: [{ category: "asc" }, { name: "asc" }],
    }),
    prisma.indicatorChange.findMany({
      include: {
        indicator: true,
        alerts: {
          include: { household: { select: { id: true, name: true } } },
          orderBy: { createdAt: "asc" },
        },
      },
      orderBy: { occurredAt: "desc" },
      take: 6,
    }),
    prisma.alert.count({ where: { status: "open" } }),
  ]);

  const formatValue = (value: number, unit: string) =>
    unit === "%" ? `${value}%` : unit === "USD" ? formatMoney(value * 100, { compact: true }) : String(value);

  return (
    <div className="px-8 py-7">
      <div className="mb-1 flex items-baseline justify-between">
        <h1 className="text-lg font-semibold">Signals</h1>
        <div className="text-sm text-ink-muted">
          {openCount} open alert{openCount === 1 ? "" : "s"} · {SIGNAL_RULE_COUNT} rules
        </div>
      </div>
      <p className="mb-5 max-w-[760px] text-sm text-ink-muted">
        Indicators this practice watches. When one moves, every household is run against the rules and
        the ones actually affected are named, with the figures that made them match.
      </p>

      <div className="mb-6">
        <ScenarioRunner
          indicators={indicators.map((i) => ({
            key: i.key,
            name: i.name,
            unit: i.unit,
            value: i.value,
            category: i.category,
          }))}
        />
      </div>

      <div className="mb-2.5 text-sm font-semibold">Watched indicators</div>
      <table className="mb-7 w-full border-collapse text-sm">
        <thead>
          <tr className="border-b border-rule text-xs font-semibold text-ink-muted">
            <th className="py-2 text-left">INDICATOR</th>
            <th className="py-2 text-left">CATEGORY</th>
            <th className="py-2 text-right">CURRENT</th>
            <th className="py-2 pr-6 text-right">PREVIOUS</th>
            <th className="py-2 text-left">WATCHED BY</th>
            <th className="py-2 text-left">SOURCE</th>
          </tr>
        </thead>
        <tbody>
          {indicators.map((i) => {
            const moved = i.previousValue !== null && i.previousValue !== i.value;
            return (
              <tr key={i.id} className="border-b border-rule">
                <td className="py-2.5 font-medium">{i.name}</td>
                <td className="py-2.5 text-ink-muted">{i.category}</td>
                <td className={`tabular py-2.5 text-right ${moved ? "font-semibold" : ""}`}>
                  {formatValue(i.value, i.unit)}
                </td>
                <td className="tabular whitespace-nowrap py-2.5 pr-6 text-right text-ink-muted">
                  {i.previousValue === null ? "—" : formatValue(i.previousValue, i.unit)}
                </td>
                <td className="py-2.5 text-ink-muted">
                  {i.watches.length === 0
                    ? "Nobody"
                    : i.watches.map((w) => w.advisor.name.split(" ")[0]).join(", ")}
                </td>
                <td className="py-2.5 text-xs text-ink-muted">{i.sourceLabel}</td>
              </tr>
            );
          })}
        </tbody>
      </table>

      <div className="mb-2.5 text-sm font-semibold">What moved, and who it touched</div>
      {changes.length === 0 ? (
        <EmptyState
          title="Nothing has moved yet"
          description="Run a scenario above to see which households a change would affect and why."
        />
      ) : (
        <div className="flex flex-col gap-5">
          {changes.map((change) => {
            const open = change.alerts.filter((a) => a.status === "open");
            const households = new Set(change.alerts.map((a) => a.householdId)).size;
            return (
              <div key={change.id} className="rounded-card border border-rule">
                <div className="flex flex-wrap items-baseline justify-between gap-2 border-b border-rule px-4 py-3">
                  <div>
                    <div className="text-sm font-semibold">
                      {change.indicator.name}{" "}
                      <span className="tabular font-normal text-ink-muted">
                        {formatValue(change.fromValue, change.indicator.unit)} →{" "}
                        {formatValue(change.toValue, change.indicator.unit)}
                      </span>
                    </div>
                    <div className="mt-0.5 text-xs text-ink-muted">{change.note}</div>
                  </div>
                  <div className="flex items-center gap-2 text-xs text-ink-muted">
                    <Badge tone={open.length > 0 ? "brass" : "neutral"}>
                      {households} household{households === 1 ? "" : "s"}
                    </Badge>
                    <span className="tabular">{formatDate(change.occurredAt)}</span>
                  </div>
                </div>

                <div className="flex flex-col gap-2.5 p-4">
                  {change.alerts.length === 0 ? (
                    <div className="text-sm text-ink-muted">
                      No household in the book matched the rules for this move.
                    </div>
                  ) : (
                    [...change.alerts].sort(bySeverity).map((alert) => (
                      <AlertCard
                        key={alert.id}
                        alert={{
                          id: alert.id,
                          householdId: alert.householdId,
                          householdName: alert.household.name,
                          severity: alert.severity,
                          title: alert.title,
                          rationale: alert.rationale,
                          suggestedAction: alert.suggestedAction,
                          section: alert.section,
                          status: alert.status,
                        }}
                      />
                    ))
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      <div className="mt-7 border-t border-rule pt-3 text-xs text-ink-muted">
        Every indicator here is a simulated fixture, labelled as one — no rate, threshold or rule text
        on this page is a statement about the real world (CLAUDE.md §13). The engine is what&rsquo;s real:
        the rules in <span className="tabular">lib/calc/signals.ts</span> run against each household&rsquo;s
        own figures, and every suggested action is a prompt to review with the household or their tax
        or legal adviser, never advice from here (§9 rule 4).
      </div>
    </div>
  );
}
