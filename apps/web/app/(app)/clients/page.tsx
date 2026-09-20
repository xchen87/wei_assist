import { prisma } from "@meridian/db";
import Link from "next/link";
import { ClientsTable, type ClientRow } from "@/components/clients/clients-table";
import { AnalyzeButton } from "@/components/clients/analyze-button";

export const dynamic = "force-dynamic";

const SORT_ACCESSORS: Record<string, (r: ClientRow) => number | string> = {
  name: (r) => r.name,
  segment: (r) => r.segment,
  aum: (r) => r.aumCents,
  netWorth: (r) => r.netWorthCents,
  heldAway: (r) => r.heldAwayCents,
  ytd: (r) => r.ytdReturnPct,
  cash: (r) => r.cashPct,
  drift: (r) => r.driftPct,
  plan: (r) => r.planHealthPct,
  contact: (r) => r.lastContactDays,
  review: (r) => new Date(r.nextReviewDate).getTime(),
  advisor: (r) => r.advisorName,
};

const VIEWS = [
  { key: "all", label: "My book" },
  { key: "needs-review", label: "Needs review" },
  { key: "at-risk", label: "At risk" },
] as const;

export default async function ClientsPage({
  searchParams,
}: {
  searchParams: { sort?: string; dir?: string; q?: string; view?: string };
}) {
  const sort = searchParams.sort && SORT_ACCESSORS[searchParams.sort] ? searchParams.sort : "aum";
  const dir = searchParams.dir === "asc" ? "asc" : "desc";
  const q = (searchParams.q ?? "").trim().toLowerCase();
  const view = searchParams.view ?? "all";

  const households = await prisma.household.findMany({
    include: { advisor: true, members: { select: { name: true } } },
  });

  let rows: ClientRow[] = households.map((h) => ({
    id: h.id,
    name: h.name,
    segment: h.segment,
    aumCents: h.aumCents,
    netWorthCents: h.netWorthCents,
    heldAwayCents: h.heldAwayCents,
    ytdReturnPct: h.ytdReturnPct,
    cashPct: h.cashPct,
    driftPct: h.driftPct,
    planHealthPct: h.planHealthPct,
    lastContactDays: h.lastContactDays,
    nextReviewDate: h.nextReviewDate.toISOString(),
    reviewStatus: h.reviewStatus,
    advisorName: h.advisor.name,
    memberNames: h.members.map((m) => m.name),
  }));

  if (q) {
    // Household name or any member's name — CLAUDE.md §6 also lists email
    // and tags, neither of which is modelled yet. The assistant's
    // search_households tool matches the same two fields.
    rows = rows.filter(
      (r) =>
        r.name.toLowerCase().includes(q) ||
        r.memberNames.some((m) => m.toLowerCase().includes(q)),
    );
  }
  if (view === "needs-review") {
    rows = rows.filter((r) => r.planHealthPct < 70);
  } else if (view === "at-risk") {
    rows = rows.filter((r) => r.driftPct >= 4 || r.reviewStatus === "overdue");
  }

  // What the chat chip should say, and what it should link back to: the
  // cohort as the advisor sees it, filters and search included.
  const viewLabel = VIEWS.find((v) => v.key === view)?.label ?? "My book";
  const cohortLabel =
    `${rows.length} household${rows.length === 1 ? "" : "s"} · ${viewLabel}` + (q ? ` · "${searchParams.q}"` : "");
  const cohortPath =
    "/clients?" + new URLSearchParams({ view, sort, dir, ...(q ? { q: searchParams.q! } : {}) }).toString();

  const accessor = SORT_ACCESSORS[sort]!;
  rows.sort((a, b) => {
    const av = accessor(a);
    const bv = accessor(b);
    const cmp = typeof av === "string" ? av.localeCompare(bv as string) : (av as number) - (bv as number);
    return dir === "asc" ? cmp : -cmp;
  });

  return (
    <div className="px-8 py-7">
      <div className="mb-4 flex items-center justify-between">
        <h1 className="text-lg font-semibold">Clients</h1>
      </div>

      <div className="mb-4 flex items-center justify-between">
        <form className="flex w-60 items-center gap-2 rounded-control border border-rule bg-surface px-2.5 py-2">
          <svg width={14} height={14} viewBox="0 0 20 20" fill="none" stroke="var(--ink-muted)" strokeWidth={1.6} strokeLinecap="round" strokeLinejoin="round">
            <circle cx="8.3" cy="8.3" r="5" />
            <path d="M12.2 12.2l4.3 4.3" />
          </svg>
          <input
            type="text"
            name="q"
            defaultValue={q}
            placeholder="Search households or people…"
            className="flex-1 bg-transparent text-sm outline-none placeholder:text-ink-muted"
          />
        </form>
        <div className="flex items-center gap-1">
          <AnalyzeButton label={cohortLabel} path={cohortPath} householdIds={rows.map((r) => r.id)} />
          <span className="mx-1 h-5 w-px bg-rule" />
          {VIEWS.map((v) => (
            <Link
              key={v.key}
              href={`/clients?view=${v.key}`}
              className={`rounded-control px-3 py-1.5 text-sm ${
                view === v.key ? "bg-pine-tint font-semibold text-pine" : "text-ink-muted"
              }`}
            >
              {v.label}
            </Link>
          ))}
        </div>
      </div>

      <ClientsTable rows={rows} activeSort={sort} activeDir={dir} />
    </div>
  );
}
