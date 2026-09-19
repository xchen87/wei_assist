import Link from "next/link";
import { prisma } from "@meridian/db";
import { InsightCard } from "@/components/plan/insight-card";
import { EmptyState } from "@/components/ui/empty-state";
import { FilterSelect } from "@/components/ui/filter-select";
import { formatMoney } from "@/lib/format/money";

export const dynamic = "force-dynamic";

/** There's no dedicated Task model yet (see PROGRESS.md) — this inbox is
 * every open (non-dismissed) Insight across every household, the same real
 * signal Today's Tasks widget already stands in with. Insights don't carry
 * a due date, so "due and overdue" (CLAUDE.md §5) isn't literal here; what
 * IS real is that dismissing an item here calls the same dismissInsight
 * server action the household detail pages use, so it actually persists —
 * this inbox is a real, filtered view of real data, not a mockup. */
export default async function TasksPage({
  searchParams,
}: {
  searchParams: { q?: string; household?: string; section?: string };
}) {
  const q = (searchParams.q ?? "").trim().toLowerCase();
  const householdId = searchParams.household ?? "";
  const section = searchParams.section ?? "";

  const [insights, households, allOpenSections] = await Promise.all([
    prisma.insight.findMany({
      where: {
        dismissed: false,
        ...(householdId ? { householdId } : {}),
        ...(section ? { section } : {}),
      },
      include: { household: { select: { id: true, name: true, segment: true, aumCents: true } } },
      orderBy: { createdAt: "asc" },
    }),
    prisma.household.findMany({ select: { id: true, name: true }, orderBy: { name: "asc" } }),
    // Independent of the current household/section filters, so selecting one
    // filter doesn't shrink the other's own dropdown down to whatever's left.
    prisma.insight.findMany({ where: { dismissed: false }, select: { section: true }, distinct: ["section"] }),
  ]);

  const filtered = q ? insights.filter((i) => i.text.toLowerCase().includes(q) || i.household.name.toLowerCase().includes(q)) : insights;

  const sections = allOpenSections.map((s) => s.section).sort();

  const byHousehold = new Map<string, { household: (typeof insights)[number]["household"]; items: typeof insights }>();
  for (const i of filtered) {
    const entry = byHousehold.get(i.householdId) ?? { household: i.household, items: [] };
    entry.items.push(i);
    byHousehold.set(i.householdId, entry);
  }
  const groups = Array.from(byHousehold.values()).sort((a, b) => a.household.name.localeCompare(b.household.name));

  return (
    <div className="px-8 py-7">
      <div className="mb-4 flex items-center justify-between">
        <h1 className="text-lg font-semibold">Tasks</h1>
        <div className="text-sm text-ink-muted">
          {filtered.length} open across {groups.length} household{groups.length === 1 ? "" : "s"}
        </div>
      </div>

      <div className="mb-5 flex flex-wrap items-center gap-2">
        <form className="flex w-60 items-center gap-2 rounded-control border border-rule bg-surface px-2.5 py-2">
          <svg width={14} height={14} viewBox="0 0 20 20" fill="none" stroke="var(--ink-muted)" strokeWidth={1.6} strokeLinecap="round" strokeLinejoin="round">
            <circle cx="8.3" cy="8.3" r="5" />
            <path d="M12.2 12.2l4.3 4.3" />
          </svg>
          <input
            type="text"
            name="q"
            defaultValue={q}
            placeholder="Search tasks…"
            className="flex-1 bg-transparent text-sm outline-none placeholder:text-ink-muted"
          />
        </form>
        <FilterSelect paramKey="household" label="Household" options={households.map((h) => ({ value: h.id, label: h.name }))} />
        <FilterSelect paramKey="section" label="Section" options={sections.map((s) => ({ value: s, label: s }))} />
      </div>

      {groups.length === 0 ? (
        <EmptyState
          title={insights.length === 0 ? "Nothing open" : "No tasks match"}
          description={
            insights.length === 0
              ? "Every insight across every household has been accepted or dismissed. New ones show up here as they're surfaced."
              : "Try a different search term or clear the household/section filters."
          }
        />
      ) : (
        <div className="flex flex-col gap-6">
          {groups.map(({ household, items }) => (
            <div key={household.id}>
              <div className="mb-2.5 flex items-baseline justify-between border-b border-rule pb-2">
                <Link href={`/clients/${household.id}`} className="text-sm font-semibold hover:underline">
                  {household.name}
                </Link>
                <div className="text-xs text-ink-muted">
                  {household.segment} · {formatMoney(household.aumCents, { compact: true })} AUM · {items.length} open
                </div>
              </div>
              <div className="flex flex-col gap-2.5">
                {items.map((i) => (
                  <InsightCard key={i.id} insight={{ id: i.id, text: i.text, sourceLabel: i.sourceLabel }} />
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
