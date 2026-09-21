/**
 * The saved scenarios a fresh demo opens with on Planning → Compare.
 *
 * Two, chosen to show the comparison doing the one thing that makes it
 * trustworthy. The first is a like-for-like plan change: four levers, no
 * assumptions touched, so the whole difference is the household's to
 * decide. The second changes a lever *and* the return assumption, which
 * is the case an advisor gets wrong by eye — the headline falls hard and
 * the obvious culprit is the plan change, when in fact the plan change is
 * worth nothing and the assumption is worth all of it. The page splits
 * them and says so.
 *
 *   pnpm --filter @meridian/web demo:plans
 */
import { prisma } from "@meridian/db";

async function main() {
  const household = await prisma.household.findFirst({
    where: { name: { contains: "Whitaker" } },
    include: { members: true },
  });
  if (!household) {
    console.error("No Whitaker household — seed first.");
    process.exit(1);
  }
  const primary = household.members.find((m) => m.role === "Primary");
  if (!primary) {
    console.error("No primary member on that household.");
    process.exit(1);
  }

  await prisma.planScenario.deleteMany({ where: { householdId: household.id } });

  await prisma.planScenario.create({
    data: {
      householdId: household.id,
      name: "Karen to 65, trim later spending",
      kind: "recommended",
      retirementSpendingCents: 40_000_000n,
      spendingShiftPct: -15,
      spendingShiftAge: 80,
      members: {
        create: [
          { memberId: primary.id, retirementAge: 65, ssMonthlyBenefitCents: 320_000n },
        ],
      },
    },
  });

  await prisma.planScenario.create({
    data: {
      householdId: household.id,
      name: "Retire 65 and assume 3% returns",
      kind: "whatif",
      realReturnPct: 3,
      members: { create: [{ memberId: primary.id, retirementAge: 65 }] },
    },
  });

  console.log(`Seeded 2 comparison scenarios on ${household.name}.`);
  await prisma.$disconnect();
}

main();
