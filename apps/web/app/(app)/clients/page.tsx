import { prisma } from "@meridian/db";
import Link from "next/link";
import { ClientsTable, type ClientRow } from "@/components/clients/clients-table";

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

  const households = await prisma.household.findMany({ include: { advisor: true } });

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
  }));

  if (q) {
    rows = rows.filter((r) => r.name.toLowerCase().includes(q));
  }
  if (view === "needs-review") {
    rows = rows.filter((r) => r.planHealthPct < 70);
  } else if (view === "at-risk") {
    rows = rows.filter((r) => r.driftPct >= 4 || r.reviewStatus === "overdue");
  }

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
            placeholder="Search households…"
            className="flex-1 bg-transparent text-sm outline-none placeholder:text-ink-muted"
          />
        </form>
        <div className="flex gap-1">
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
