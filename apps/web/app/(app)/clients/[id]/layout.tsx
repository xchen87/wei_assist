import { notFound } from "next/navigation";
import { prisma } from "@meridian/db";
import { SectionNav } from "@/components/plan/section-nav";

export default async function HouseholdLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: { id: string };
}) {
  const household = await prisma.household.findUnique({
    where: { id: params.id },
    select: { id: true, name: true, segment: true, aumCents: true },
  });

  if (!household) notFound();

  return (
    <div className="flex h-full">
      <SectionNav
        householdId={household.id}
        name={household.name}
        segment={household.segment}
        aumCents={household.aumCents}
      />
      <div className="flex-1 overflow-y-auto">{children}</div>
    </div>
  );
}
