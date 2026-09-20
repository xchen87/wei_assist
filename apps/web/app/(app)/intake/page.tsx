import { prisma } from "@meridian/db";
import { IntakeWizard } from "@/components/intake/intake-wizard";

export const dynamic = "force-dynamic";

export default async function IntakePage() {
  const [prospects, advisors] = await Promise.all([
    prisma.prospect.findMany({
      where: { stage: "Agreement" },
      include: { advisor: { select: { name: true } } },
      orderBy: { daysInStage: "asc" },
    }),
    prisma.advisor.findMany({ select: { id: true, name: true }, orderBy: { name: "asc" } }),
  ]);

  return (
    <div className="mx-auto max-w-[900px] px-8 py-7">
      <h1 className="mb-1 text-lg font-semibold">Intake</h1>
      <p className="mb-6 text-sm text-ink-muted">
        Onboard a new client household — the guided flow from a signed agreement to a plan on file.
      </p>
      <IntakeWizard
        prospects={prospects.map((p) => ({ id: p.id, name: p.name, estValueCents: p.estValueCents, advisorName: p.advisor.name }))}
        advisors={advisors}
      />
    </div>
  );
}
