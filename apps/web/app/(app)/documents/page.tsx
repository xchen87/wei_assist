import Link from "next/link";
import { prisma } from "@meridian/db";
import { Badge } from "@/components/ui/badge";
import { EmptyState } from "@/components/ui/empty-state";
import { FilterSelect } from "@/components/ui/filter-select";

export const dynamic = "force-dynamic";

const STATUS_TONE: Record<string, "pine" | "brass" | "loss"> = {
  complete: "pine",
  needsAttention: "brass",
  missing: "loss",
};

/** Firm-wide document vault — every household's Document rows in one table,
 * filterable by household and status, per design/Documents.dc.html. The
 * household-scoped vault under Clients → household → Documents is the same
 * underlying model, just pre-filtered to one household. */
export default async function DocumentsPage({
  searchParams,
}: {
  searchParams: { q?: string; household?: string; status?: string };
}) {
  const q = (searchParams.q ?? "").trim().toLowerCase();
  const householdId = searchParams.household ?? "";
  const status = searchParams.status ?? "";

  const [documents, households] = await Promise.all([
    prisma.document.findMany({
      where: {
        ...(householdId ? { householdId } : {}),
        ...(status ? { bucket: status } : {}),
      },
      include: { household: { select: { id: true, name: true } } },
      orderBy: { id: "asc" },
    }),
    prisma.household.findMany({ select: { id: true, name: true }, orderBy: { name: "asc" } }),
  ]);

  const filtered = q ? documents.filter((d) => d.name.toLowerCase().includes(q)) : documents;

  return (
    <div className="px-8 py-7">
      <div className="mb-4 flex items-center justify-between">
        <h1 className="text-lg font-semibold">Documents</h1>
        <button
          disabled
          title="Not wired up in this build"
          className="rounded-control bg-pine px-3.5 py-1.5 text-sm font-semibold text-on-accent opacity-90"
        >
          Upload
        </button>
      </div>

      <div className="mb-4 flex flex-wrap items-center gap-2">
        <form className="flex w-60 items-center gap-2 rounded-control border border-rule bg-surface px-2.5 py-2">
          <svg width={14} height={14} viewBox="0 0 20 20" fill="none" stroke="var(--ink-muted)" strokeWidth={1.6} strokeLinecap="round" strokeLinejoin="round">
            <circle cx="8.3" cy="8.3" r="5" />
            <path d="M12.2 12.2l4.3 4.3" />
          </svg>
          <input
            type="text"
            name="q"
            defaultValue={q}
            placeholder="Search documents…"
            className="flex-1 bg-transparent text-sm outline-none placeholder:text-ink-muted"
          />
        </form>
        <FilterSelect
          paramKey="household"
          label="Household"
          options={households.map((h) => ({ value: h.id, label: h.name }))}
        />
        <FilterSelect
          paramKey="status"
          label="Status"
          options={[
            { value: "complete", label: "Complete" },
            { value: "needsAttention", label: "Needs attention" },
            { value: "missing", label: "Missing" },
          ]}
        />
      </div>

      {filtered.length === 0 ? (
        <EmptyState
          title="No documents match"
          description="Try a different search term or clear the household/status filters."
        />
      ) : (
        <table className="w-full border-collapse text-sm">
          <thead>
            <tr className="border-b border-rule text-xs font-semibold text-ink-muted">
              <th className="py-2 text-left">NAME</th>
              <th className="py-2 text-left">HOUSEHOLD</th>
              <th className="py-2 text-left">TYPE</th>
              <th className="py-2 text-left">STATUS</th>
              <th className="py-2 text-right">UPLOADED</th>
              <th className="py-2 text-left">SOURCE</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((d) => (
              <tr
                key={d.id}
                className={`border-b border-rule ${d.bucket === "missing" ? "bg-loss-tint" : d.bucket === "needsAttention" ? "bg-brass-tint" : ""}`}
              >
                <td className="py-2.5 font-medium">{d.name}</td>
                <td className="py-2.5 text-ink-muted">
                  <Link href={`/clients/${d.household.id}/documents`} className="hover:underline">
                    {d.household.name}
                  </Link>
                </td>
                <td className="py-2.5 text-ink-muted">{d.type}</td>
                <td className="py-2.5">
                  <Badge tone={STATUS_TONE[d.bucket]}>{d.statusLabel}</Badge>
                </td>
                <td className="tabular py-2.5 text-right text-ink-muted">{d.uploadedLabel}</td>
                <td className="py-2.5 text-ink-muted">{d.source}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}
