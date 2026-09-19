import { notFound } from "next/navigation";
import { prisma } from "@meridian/db";
import { PlanSection } from "@/components/plan/plan-section";
import { SectionActions } from "@/components/plan/section-actions";
import { Badge } from "@/components/ui/badge";

export const dynamic = "force-dynamic";

const BUCKET_COLOR: Record<string, string> = {
  complete: "var(--pine)",
  needsAttention: "var(--brass)",
  missing: "var(--loss)",
};
const BUCKET_LABEL: Record<string, string> = {
  complete: "complete",
  needsAttention: "need attention",
  missing: "missing",
};
const STATUS_TONE: Record<string, "pine" | "brass" | "loss"> = {
  complete: "pine",
  needsAttention: "brass",
  missing: "loss",
};

export default async function HouseholdDocumentsPage({ params }: { params: { id: string } }) {
  const household = await prisma.household.findUnique({
    where: { id: params.id },
    include: {
      documents: { orderBy: { id: "asc" } },
      insights: { where: { dismissed: false, section: "Documents" } },
    },
  });
  if (!household) notFound();

  const counts = household.documents.reduce<Record<string, number>>((acc, d) => {
    acc[d.bucket] = (acc[d.bucket] ?? 0) + 1;
    return acc;
  }, {});
  const buckets = ["complete", "needsAttention", "missing"];

  return (
    <PlanSection
      title="Documents"
      completenessPct={household.documentsCompletenessPct}
      updatedLabel={`${household.documents.length} documents on file`}
      actions={<SectionActions />}
      summaryTitle="Vault status"
      summarySubtitle={`${household.documents.length} documents on file for this household`}
      summary={
        household.documents.length > 0 ? (
          <div>
            <div className="mb-2.5 flex h-4 w-full overflow-hidden rounded-control">
              {buckets.map((b) =>
                counts[b] ? <div key={b} style={{ flexGrow: counts[b], background: BUCKET_COLOR[b] }} /> : null,
              )}
            </div>
            <div className="flex gap-4 text-xs text-ink-muted">
              {buckets
                .filter((b) => counts[b])
                .map((b) => (
                  <div key={b} className="flex items-center gap-1.5">
                    <div className="h-2 w-2 rounded-full" style={{ background: BUCKET_COLOR[b] }} />
                    {counts[b]} {BUCKET_LABEL[b]}
                  </div>
                ))}
            </div>
          </div>
        ) : (
          <div className="text-sm text-ink-muted">No documents on file for this household yet.</div>
        )
      }
      detailTitle="All documents"
      detail={
        <table className="w-full border-collapse text-sm">
          <thead>
            <tr className="border-b border-rule text-xs font-semibold text-ink-muted">
              <th className="py-2 text-left">NAME</th>
              <th className="py-2 text-left">TYPE</th>
              <th className="py-2 text-left">STATUS</th>
              <th className="py-2 text-right">UPLOADED</th>
              <th className="py-2 text-left">SOURCE</th>
            </tr>
          </thead>
          <tbody>
            {household.documents.map((d) => (
              <tr
                key={d.id}
                className={`border-b border-rule ${d.bucket === "missing" ? "bg-loss-tint" : d.bucket === "needsAttention" ? "bg-brass-tint" : ""}`}
              >
                <td className="py-2.5 font-medium">{d.name}</td>
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
      }
      insights={household.insights.map((i) => ({ id: i.id, text: i.text, sourceLabel: i.sourceLabel, householdId: i.householdId, section: i.section }))}
      provenance="Vault status: computed from documents on file · Firm-wide documents live under Documents in the main nav — this list is household-scoped."
    />
  );
}
