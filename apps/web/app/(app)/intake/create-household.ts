"use server";

import { prisma } from "@meridian/db";
import { revalidatePath } from "next/cache";
import { scoreRiskTolerance, type RiskAnswers } from "@/lib/calc/risk";
import { parseDollarsToCents } from "@/lib/format/money";

/** Turn a completed intake into a real household (M-demo item 1).
 *
 * The hard part was never the insert — it is what the seventy-odd fields
 * the wizard doesn't collect should start as. Two options were available:
 * invent plausible figures so every section renders like a seeded
 * household, or start them empty and let the completeness rings say so.
 * Empty wins, and not only because inventing a household's allocation is
 * the exact failure CLAUDE.md §1 calls a bug: a brand-new household that
 * reads as 90% complete is a lie the advisor has to un-believe, while one
 * that reads as 23% complete is a worklist.
 *
 * So: figures the wizard actually collected are carried across, everything
 * downstream of a custodian feed is zero, and per-section completeness is
 * computed from what was genuinely provided rather than seeded.
 */

export type IntakeMember = {
  name: string;
  role: string;
  birthDate: string;
  occupation: string;
  annualIncome: string;
  annualExpenses: string;
  assets: string;
  liabilities: string;
  risk: RiskAnswers;
};

export type IntakeGoal = { name: string; priority: string; horizon: string };

export type IntakePayload = {
  name: string;
  segment: string;
  advisorId: string;
  prospectId: string | null;
  members: IntakeMember[];
  goals: IntakeGoal[];
};

export type CreateResult = { ok: true; householdId: string } | { ok: false; error: string };

function ageFrom(birthDate: string): number | null {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(birthDate)) return null;
  const dob = new Date(`${birthDate}T00:00:00Z`);
  if (Number.isNaN(dob.getTime())) return null;
  const now = new Date();
  let age = now.getUTCFullYear() - dob.getUTCFullYear();
  const had =
    now.getUTCMonth() > dob.getUTCMonth() ||
    (now.getUTCMonth() === dob.getUTCMonth() && now.getUTCDate() >= dob.getUTCDate());
  if (!had) age -= 1;
  return age >= 0 && age < 130 ? age : null;
}

const sum = (values: (number | null)[]) => values.reduce<number>((total, v) => total + (v ?? 0), 0);

export async function createHouseholdFromIntake(payload: IntakePayload): Promise<CreateResult> {
  const name = payload.name.trim();
  const members = payload.members.filter((m) => m.name.trim());
  const goals = payload.goals.filter((g) => g.name.trim());

  if (!name) return { ok: false, error: "The household needs a name." };
  if (members.length === 0) return { ok: false, error: "Add at least one member." };

  const advisor = await prisma.advisor.findUnique({ where: { id: payload.advisorId } });
  if (!advisor) return { ok: false, error: "Pick an advisor for this household." };

  const income = sum(members.map((m) => parseDollarsToCents(m.annualIncome)));
  const expenses = sum(members.map((m) => parseDollarsToCents(m.annualExpenses)));
  const assets = sum(members.map((m) => parseDollarsToCents(m.assets)));
  const liabilities = sum(members.map((m) => parseDollarsToCents(m.liabilities)));
  const savings = Math.max(income - expenses, 0);
  const netWorth = assets - liabilities;

  const hasCashflow = income > 0 || expenses > 0;
  const hasBalance = assets > 0 || liabilities > 0;
  const membersComplete = members.filter((m) => m.birthDate && m.occupation.trim()).length;
  const riskComplete = members.filter((m) => scoreRiskTolerance(m.risk).complete).length;

  // Completeness reflects what is on file, nothing more. Sections that need
  // a custodian feed, a document, or a planning conversation start at zero —
  // which is the true answer on day one.
  //
  // Two different numbers, and conflating them was the first bug here: the
  // Household *section* can legitimately be 100% when every member has a
  // name, a date of birth, an occupation and a completed questionnaire,
  // while plan health is the roll-up across all twelve sections and should
  // read around 18% for a household created this morning. Showing the
  // section score as plan health made a brand-new household look finished.
  const householdPct = Math.round(
    (members.length > 0 ? 40 : 0) +
      (membersComplete / members.length) * 40 +
      (riskComplete / members.length) * 20,
  );

  const sectionCompleteness = {
    householdCompletenessPct: householdPct,
    cashflowCompletenessPct: hasCashflow ? 45 : 0,
    balanceCompletenessPct: hasBalance ? 35 : 0,
    allocationCompletenessPct: 0,
    goalsCompletenessPct: goals.length > 0 ? 30 : 0,
    retirementCompletenessPct: 0,
    taxCompletenessPct: 0,
    protectionCompletenessPct: 0,
    estateCompletenessPct: 0,
    documentsCompletenessPct: 0,
    activityCompletenessPct: 10,
    complianceCompletenessPct: 0,
  };

  const sectionValues = Object.values(sectionCompleteness);
  // The same mean the Overview ring shows in its centre, so the two agree.
  const planHealthPct = Math.round(sectionValues.reduce((a, b) => a + b, 0) / sectionValues.length);

  // Review cadence starts a quarter out: the first review is the natural
  // next step after onboarding, and an empty next-review date would make
  // this household invisible to Schedule and the Reviews widget.
  const nextReview = new Date();
  nextReview.setUTCMonth(nextReview.getUTCMonth() + 3);
  nextReview.setUTCHours(0, 0, 0, 0);

  const household = await prisma.household.create({
    data: {
      name,
      segment: payload.segment,
      advisorId: advisor.id,
      clientSinceYear: new Date().getUTCFullYear(),

      // Nothing is custodied on day one. AUM stays zero until a feed or a
      // manual account entry says otherwise — the Clients list showing $0
      // is the honest reading, not a bug.
      aumCents: 0,
      heldAwayCents: 0,
      netWorthCents: netWorth,
      ytdReturnPct: 0,
      cashPct: 0,
      targetCashPct: 0,
      driftPct: 0,
      planHealthPct,
      lastContactDays: 0,
      nextReviewDate: nextReview,
      reviewStatus: "scheduled",
      completenessPct: planHealthPct,
      whatChanged: "Household created from intake\nNo plan sections completed yet",

      incomeCents: income,
      // Taxes aren't assessed at intake, so net income is income until a
      // tax position exists. Zero here means "not yet known", and the Tax
      // section's completeness says so.
      taxesCents: 0,
      netIncomeCents: income,
      spendingCents: expenses,
      savingsCents: savings,
      savingsRatePct: income > 0 ? Math.round((savings / income) * 1000) / 10 : 0,

      balanceStartCents: 0,
      balanceContributionsCents: 0,
      balanceGrowthCents: 0,
      balanceTaxesCents: 0,
      balanceSpendingCents: 0,
      investmentAccountsCents: 0,
      realEstateCents: 0,
      cashCents: 0,
      otherAssetsCents: assets,
      mortgageCents: liabilities,

      equityTargetPct: 0,
      equityActualPct: 0,
      fixedIncomeTargetPct: 0,
      fixedIncomeActualPct: 0,
      topHoldingName: "—",
      topHoldingTicker: "—",
      topHoldingPct: 0,
      distinctHoldings: 0,
      blendedExpenseRatioPct: 0,

      retirementAgePrimary: 65,
      retirementAgeSpouse: null,
      ssClaimAgePrimary: 67,
      ssClaimAgeSpouse: null,
      monthlySpendingNeedCents: 0,
      withdrawalSequencing: "Not set",
      retirementSuccessDeltaPts: 0,

      filingStatus: "Not set",
      taxableIncomeCents: 0,
      effectiveRatePct: 0,
      realizedGainsCents: 0,
      unrealizedGainsCents: 0,
      harvestableLossesCents: 0,

      openTasksCount: 0,

      ...sectionCompleteness,

      members: {
        create: members.map((m) => ({
          name: m.name.trim(),
          role: m.role,
          age: ageFrom(m.birthDate) ?? 0,
          occupation: m.occupation.trim() || "Not given",
          birthDate: m.birthDate ? new Date(`${m.birthDate}T00:00:00Z`) : null,
          riskProfile: scoreRiskTolerance(m.risk).profile,
        })),
      },
      goals: {
        create: goals.map((g) => ({
          name: g.name.trim(),
          priority: g.priority,
          // Named, not costed: the target and funded percentage come out of
          // the first planning conversation, not the intake form.
          targetCents: null,
          fundedPct: 0,
          status: "unset",
          horizonLabel: g.horizon,
        })),
      },
      activityEvents: {
        create: [
          {
            kind: "PlanChange",
            label: "Household created from intake",
            detail: payload.prospectId ? "Converted from a prospect at Agreement stage." : null,
            occurredAt: new Date(),
          },
        ],
      },
      // The worklist this household starts with, written as insights so it
      // shows up in Tasks and on each section exactly like every other
      // open item in the app.
      insights: {
        create: [
          {
            section: "Allocation",
            text: "No accounts are on file yet — allocation, drift, and AUM stay empty until this household's accounts are connected or entered.",
            sourceLabel: "Intake, today",
          },
          {
            section: "Goals",
            text:
              goals.length > 0
                ? `${goals.length} goal${goals.length === 1 ? "" : "s"} captured at intake without target amounts — worth costing them at the first planning meeting.`
                : "No goals captured yet — worth agreeing the first two or three at the opening meeting.",
            sourceLabel: "Intake, today",
          },
          {
            section: "Compliance",
            text: "Onboarding documents aren't on file yet: IPS, advisory agreement, and disclosures all need to be issued and signed.",
            sourceLabel: "Intake, today",
          },
        ],
      },
    },
    select: { id: true },
  });

  // A converted prospect shouldn't stay in the pipeline competing for
  // attention with live ones.
  if (payload.prospectId) {
    await prisma.prospect.deleteMany({ where: { id: payload.prospectId } });
    revalidatePath("/prospects");
  }

  revalidatePath("/clients");
  revalidatePath("/today");
  return { ok: true, householdId: household.id };
}
