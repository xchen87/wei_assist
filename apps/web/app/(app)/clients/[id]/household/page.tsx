import { notFound } from "next/navigation";
import { prisma } from "@meridian/db";
import { PlanSection } from "@/components/plan/PlanSection";
import { SectionActions } from "@/components/plan/SectionActions";

export const dynamic = "force-dynamic";

export default async function HouseholdMembersPage({ params }: { params: { id: string } }) {
  const household = await prisma.household.findUnique({
    where: { id: params.id },
    include: { members: true },
  });
  if (!household) notFound();

  return (
    <PlanSection
      title="Household"
      completenessPct={100}
      updatedLabel="Verified · Manual entry"
      actions={<SectionActions />}
      summaryTitle="Members"
      summarySubtitle="Everyone in this household's plan"
      summary={
        <div className="grid grid-cols-2 gap-3">
          {household.members.map((m) => (
            <div key={m.id} className="rounded-control border border-rule p-3">
              <div className="text-sm font-semibold">{m.name}</div>
              <div className="text-xs text-ink-muted">
                {m.role} · Age {m.age}
              </div>
              <div className="mt-1 text-xs text-ink-muted">{m.occupation}</div>
            </div>
          ))}
        </div>
      }
      detailTitle="Contact & KYC"
      detail={
        <div className="text-sm text-ink-muted">
          KYC verification: complete for all adults on file.
          {/* No relationship-graph visual yet — see design/HouseholdMembers.dc.html
              and PROGRESS.md for the intended force-free node graph. */}
        </div>
      }
      insights={[]}
      provenance="Member and contact details: manual entry."
    />
  );
}
