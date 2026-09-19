import { notFound } from "next/navigation";
import { prisma } from "@meridian/db";
import { PlanSection } from "@/components/plan/plan-section";
import { EmptySection } from "@/components/plan/empty-section";
import { SectionActions } from "@/components/plan/section-actions";
import { Badge } from "@/components/ui/badge";
import {
  AttestationTimeline,
  attestationState,
  type AttestationData,
} from "@/components/charts/attestation-timeline";
import { formatDate } from "@/lib/format/date";

export const dynamic = "force-dynamic";

const BUCKET_TONE: Record<string, "pine" | "brass" | "loss"> = {
  inForce: "pine",
  needsAttention: "brass",
  missing: "loss",
};
const ROW_TINT: Record<string, string> = {
  inForce: "",
  needsAttention: "bg-brass-tint",
  missing: "bg-loss-tint",
};
const STATE_TONE: Record<string, "pine" | "brass" | "loss" | "neutral"> = {
  attested: "pine",
  unattested: "brass",
  missed: "loss",
  scheduled: "neutral",
};
const STATE_LABEL: Record<string, string> = {
  attested: "Attested",
  unattested: "Not attested",
  missed: "Missed",
  scheduled: "Scheduled",
};

/** The last of the fourteen household sections, and the one with no design
 * mockup (D-013) — built to the shared PlanSection scaffold like the rest
 * rather than as a one-off, so it reads as part of the same record.
 *
 * The summary visual is the review-attestation timeline rather than another
 * status bar: the Documents section already breaks its vault down that way,
 * and what makes a compliance record auditable is the cadence — whether
 * each periodic review happened and whether it was signed off. A review
 * held but never attested is its own failure mode, distinct from one not
 * yet due, and the timeline is the only place that distinction is visible
 * at a glance. */
export default async function HouseholdCompliancePage({ params }: { params: { id: string } }) {
  const household = await prisma.household.findUnique({
    where: { id: params.id },
    include: {
      complianceItems: { orderBy: { sortOrder: "asc" } },
      attestations: { orderBy: { occurredAt: "asc" } },
      insights: { where: { dismissed: false, section: "Compliance" } },
      advisor: { select: { name: true } },
    },
  });
  if (!household) notFound();

  if (household.complianceItems.length === 0 && household.attestations.length === 0) {
    return (
      <EmptySection
        title="Compliance"
        description="IPS, suitability, disclosures, and review attestations for this household will show here once its compliance record is on file."
      />
    );
  }

  const attestations: AttestationData[] = household.attestations.map((a) => ({
    id: a.id,
    periodLabel: a.periodLabel,
    occurredAt: a.occurredAt.toISOString(),
    held: a.held,
    attested: a.attested,
    scope: a.scope,
    notes: a.notes,
  }));

  const inForce = household.complianceItems.filter((c) => c.bucket === "inForce").length;
  const openItems = household.complianceItems.length - inForce;
  const upcoming = attestations.find((a) => !a.held);
  const gaps = attestations.filter((a) => attestationState(a) === "unattested" || attestationState(a) === "missed");

  return (
    <PlanSection
      title="Compliance"
      completenessPct={household.complianceCompletenessPct}
      updatedLabel={
        `${inForce} of ${household.complianceItems.length} items in force` +
        (upcoming
          ? ` · ${household.reviewStatus === "overdue" ? "review overdue since" : "next review"} ${formatDate(upcoming.occurredAt)}`
          : "")
      }
      actions={<SectionActions />}
      summaryTitle="Review attestations"
      summarySubtitle={
        gaps.length > 0
          ? `${gaps.length} review${gaps.length === 1 ? "" : "s"} without a signed attestation`
          : "Every review on record has been attested"
      }
      summary={<AttestationTimeline attestations={attestations} />}
      detailTitle={`Required items${openItems > 0 ? ` · ${openItems} need attention` : ""}`}
      detail={
        <>
          <table className="w-full border-collapse text-sm">
            <thead>
              <tr className="border-b border-rule text-xs font-semibold text-ink-muted">
                <th className="w-[42%] py-2 text-left">ITEM</th>
                <th className="py-2 text-left">CATEGORY</th>
                <th className="py-2 text-left">STATUS</th>
                <th className="py-2 pl-4 text-right">EFFECTIVE</th>
                <th className="py-2 pl-4 text-right">NEXT DUE</th>
              </tr>
            </thead>
            <tbody>
              {household.complianceItems.map((c) => (
                <tr key={c.id} className={`border-b border-rule ${ROW_TINT[c.bucket] ?? ""}`}>
                  <td className="py-2.5">
                    <div className="font-medium">{c.name}</div>
                    <div className="text-xs text-ink-muted">{c.detail}</div>
                  </td>
                  <td className="py-2.5 text-ink-muted">{c.category}</td>
                  <td className="py-2.5">
                    <Badge tone={BUCKET_TONE[c.bucket] ?? "neutral"}>{c.statusLabel}</Badge>
                  </td>
                  <td className="tabular whitespace-nowrap py-2.5 pl-4 text-right text-ink-muted">{c.effectiveLabel}</td>
                  <td className="tabular whitespace-nowrap py-2.5 pl-4 text-right text-ink-muted">{c.nextDueLabel}</td>
                </tr>
              ))}
            </tbody>
          </table>

          {/* The timeline's table equivalent (CLAUDE.md §8), and the only
              place a review's scope and notes are readable. */}
          <div className="mb-2.5 mt-7 text-sm font-semibold">Review history</div>
          <table className="w-full border-collapse text-sm">
            <thead>
              <tr className="border-b border-rule text-xs font-semibold text-ink-muted">
                <th className="py-2 text-left">PERIOD</th>
                <th className="w-32 py-2 pr-6 text-right">DATE</th>
                <th className="py-2 text-left">SCOPE</th>
                <th className="py-2 text-left">ATTESTATION</th>
                <th className="py-2 text-left">ATTESTED BY</th>
              </tr>
            </thead>
            <tbody>
              {[...attestations].reverse().map((a) => {
                const state = attestationState(a);
                return (
                  <tr key={a.id} className={`border-b border-rule ${state === "missed" ? "bg-loss-tint" : state === "unattested" ? "bg-brass-tint" : ""}`}>
                    <td className="py-2.5 font-medium">{a.periodLabel}</td>
                    <td className="tabular whitespace-nowrap py-2.5 pr-6 text-right text-ink-muted">{formatDate(a.occurredAt)}</td>
                    <td className="py-2.5 text-ink-muted">
                      {a.scope}
                      {a.notes ? <div className="text-xs">{a.notes}</div> : null}
                    </td>
                    <td className="py-2.5">
                      <Badge tone={STATE_TONE[state] ?? "neutral"}>{STATE_LABEL[state]}</Badge>
                    </td>
                    <td className="py-2.5 text-ink-muted">{a.attested ? household.advisor.name : "—"}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </>
      }
      insights={household.insights.map((i) => ({
        id: i.id,
        text: i.text,
        sourceLabel: i.sourceLabel,
        householdId: i.householdId,
        section: i.section,
      }))}
      provenance={`Items and attestations: advisor-maintained, seeded fixtures in this build · Review dates follow this household's own cadence and the next review date shown on the Clients list · Attested by reflects the assigned advisor — there's no separate compliance reviewer until RBAC exists (CLAUDE.md §11) · No filing deadline or regulatory rule is asserted here; the firm-wide review queue lives under Compliance in the main nav.`}
    />
  );
}
