import { PlanningTabs } from "@/components/plan/planning-tabs";

/** Planning holds the scenario explorer and the four planning disciplines
 * it works across. They were four sibling sections until now; grouping
 * them is what lets a scenario change a retirement age and have the tax
 * and estate views sit one tab away rather than three clicks back. */
export default function PlanningLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: { id: string };
}) {
  return (
    <div>
      <PlanningTabs householdId={params.id} />
      {children}
    </div>
  );
}
