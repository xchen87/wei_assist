/**
 * Demo seed data: 10 households + 10 prospects.
 *
 * Ramirez Household and the seven other named households below carry the
 * exact figures from design/Clients.dc.html so the running app matches the
 * design record. Delacroix-Wu and Bergström are new, added to reach 10.
 * Prospect names/sources mirror design/Prospects.dc.html; two are new to
 * reach 10.
 *
 * Cashflow/Balance/Allocation/Goals detail exists in the design record only
 * for Ramirez. For the other nine households that section-level detail is
 * derived here by `deriveFinancials()` — a pure function, not hand-typed —
 * so the numbers stay internally consistent (income vs. taxes vs. savings,
 * balance waterfall reconciling to net worth, allocation summing to 100%)
 * without nine sets of manually-invented figures that could quietly
 * contradict each other.
 */
import { PrismaClient } from "@prisma/client";

// SQLite has no native enum type (see schema.prisma) — these unions are the
// app-layer substitute, kept next to the seed data that uses them.
type Segment = "Core" | "Premier" | "Founding";
type ReviewStatus = "scheduled" | "due" | "overdue";
type GoalStatus = "onTrack" | "fullyFunded" | "behind";
type PipelineStage = "Inquiry" | "Discovery" | "Proposal" | "Agreement";

const prisma = new PrismaClient();

function centsFrom(dollars: number) {
  return Math.round(dollars * 100);
}

type HouseholdSeed = {
  name: string;
  segment: Segment;
  advisor: "dana" | "maya";
  aum: number;
  netWorth: number;
  heldAway: number;
  ytdReturnPct: number;
  cashPct: number;
  driftPct: number;
  planHealthPct: number;
  lastContactDays: number;
  nextReviewDate: string;
  reviewStatus: ReviewStatus;
  clientSinceYear: number;
  members: { name: string; role: string; age: number; occupation: string }[];
};

// Clients-list figures below match design/Clients.dc.html exactly for the
// eight named households that already appear there.
const HOUSEHOLDS: HouseholdSeed[] = [
  {
    name: "Ramirez Household",
    segment: "Premier",
    advisor: "dana",
    aum: 8_420_000,
    netWorth: 11_200_000,
    heldAway: 1_150_000,
    ytdReturnPct: 9.4,
    cashPct: 6.1,
    driftPct: 1.8,
    planHealthPct: 82,
    lastContactDays: 4,
    nextReviewDate: "2026-10-03",
    reviewStatus: "scheduled",
    clientSinceYear: 2019,
    members: [
      { name: "Elena Ramirez", role: "Primary", age: 52, occupation: "VP Marketing, Halden Corp" },
      { name: "Marcus Ramirez", role: "Spouse", age: 54, occupation: "Architect, self-employed" },
      { name: "Sophia Ramirez", role: "Dependent", age: 16, occupation: "Student" },
      { name: "Lucas Ramirez", role: "Dependent", age: 14, occupation: "Student" },
    ],
  },
  {
    name: "The Whitakers",
    segment: "Premier",
    advisor: "dana",
    aum: 6_180_000,
    netWorth: 7_900_000,
    heldAway: 420_000,
    ytdReturnPct: 7.1,
    cashPct: 14.0,
    driftPct: 6.2,
    planHealthPct: 64,
    lastContactDays: 11,
    nextReviewDate: "2026-09-22",
    reviewStatus: "scheduled",
    clientSinceYear: 2018,
    members: [
      { name: "Karen Whitaker", role: "Primary", age: 58, occupation: "Retired" },
      { name: "Tom Whitaker", role: "Spouse", age: 60, occupation: "Retired" },
    ],
  },
  {
    name: "Chen–Okafor Household",
    segment: "Core",
    advisor: "maya",
    aum: 2_940_000,
    netWorth: 3_600_000,
    heldAway: 180_000,
    ytdReturnPct: 8.8,
    cashPct: 4.5,
    driftPct: 0.9,
    planHealthPct: 91,
    lastContactDays: 2,
    nextReviewDate: "2026-11-14",
    reviewStatus: "scheduled",
    clientSinceYear: 2021,
    members: [
      { name: "Wei Chen", role: "Primary", age: 41, occupation: "Product Manager, Brightline Systems" },
      { name: "Adaeze Okafor", role: "Spouse", age: 39, occupation: "Physician" },
    ],
  },
  {
    name: "Alvarez Family Trust",
    segment: "Founding",
    advisor: "dana",
    aum: 14_750_000,
    netWorth: 19_300_000,
    heldAway: 2_800_000,
    ytdReturnPct: 6.5,
    cashPct: 9.2,
    driftPct: 3.1,
    planHealthPct: 58,
    lastContactDays: 61,
    nextReviewDate: "2026-08-01",
    reviewStatus: "overdue",
    clientSinceYear: 2012,
    members: [
      { name: "Isabel Alvarez", role: "Primary", age: 67, occupation: "Retired" },
      { name: "Rafael Alvarez", role: "Spouse", age: 69, occupation: "Retired" },
    ],
  },
  {
    name: "Patel Household",
    segment: "Core",
    advisor: "maya",
    aum: 1_210_000,
    netWorth: 1_540_000,
    heldAway: 0,
    ytdReturnPct: 10.2,
    cashPct: 3.0,
    driftPct: 0.5,
    planHealthPct: 47,
    lastContactDays: 3,
    nextReviewDate: "2026-12-01",
    reviewStatus: "scheduled",
    clientSinceYear: 2024,
    members: [
      { name: "Priya Patel", role: "Primary", age: 34, occupation: "Software Engineer" },
      { name: "Raj Patel", role: "Spouse", age: 35, occupation: "Data Analyst" },
    ],
  },
  {
    name: "Kim Household",
    segment: "Premier",
    advisor: "dana",
    aum: 5_330_000,
    netWorth: 6_800_000,
    heldAway: 310_000,
    ytdReturnPct: -1.2,
    cashPct: 11.4,
    driftPct: 5.4,
    planHealthPct: 73,
    lastContactDays: 45,
    nextReviewDate: "2026-08-06",
    reviewStatus: "overdue",
    clientSinceYear: 2017,
    members: [
      { name: "Grace Kim", role: "Primary", age: 49, occupation: "Attorney" },
      { name: "David Kim", role: "Spouse", age: 51, occupation: "Dentist" },
    ],
  },
  {
    name: "Nakamura Household",
    segment: "Core",
    advisor: "maya",
    aum: 3_050_000,
    netWorth: 3_900_000,
    heldAway: 95_000,
    ytdReturnPct: 8.0,
    cashPct: 5.6,
    driftPct: 1.1,
    planHealthPct: 88,
    lastContactDays: 8,
    nextReviewDate: "2027-01-09",
    reviewStatus: "scheduled",
    clientSinceYear: 2020,
    members: [
      { name: "Kenji Nakamura", role: "Primary", age: 45, occupation: "Civil Engineer" },
      { name: "Aiko Nakamura", role: "Spouse", age: 44, occupation: "Teacher" },
    ],
  },
  {
    name: "Ogundele Household",
    segment: "Founding",
    advisor: "dana",
    aum: 9_870_000,
    netWorth: 12_600_000,
    heldAway: 640_000,
    ytdReturnPct: 5.9,
    cashPct: 7.8,
    driftPct: 2.4,
    planHealthPct: 76,
    lastContactDays: 19,
    nextReviewDate: "2026-10-30",
    reviewStatus: "scheduled",
    clientSinceYear: 2014,
    members: [
      { name: "Folake Ogundele", role: "Primary", age: 55, occupation: "Founder, Ogundele Logistics" },
      { name: "Tunde Ogundele", role: "Spouse", age: 57, occupation: "Retired" },
    ],
  },
  {
    name: "Delacroix–Wu Household",
    segment: "Core",
    advisor: "maya",
    aum: 1_890_000,
    netWorth: 2_240_000,
    heldAway: 60_000,
    ytdReturnPct: 7.6,
    cashPct: 5.0,
    driftPct: 0.7,
    planHealthPct: 68,
    lastContactDays: 15,
    nextReviewDate: "2026-11-05",
    reviewStatus: "scheduled",
    clientSinceYear: 2023,
    members: [
      { name: "Camille Delacroix", role: "Primary", age: 37, occupation: "UX Director" },
      { name: "Alan Wu", role: "Spouse", age: 38, occupation: "Anesthesiologist" },
    ],
  },
  {
    name: "Bergström Household",
    segment: "Founding",
    advisor: "dana",
    aum: 11_320_000,
    netWorth: 15_900_000,
    heldAway: 1_900_000,
    ytdReturnPct: 6.9,
    cashPct: 8.4,
    driftPct: 2.0,
    planHealthPct: 85,
    lastContactDays: 6,
    nextReviewDate: "2026-12-12",
    reviewStatus: "scheduled",
    clientSinceYear: 2016,
    members: [
      { name: "Astrid Bergström", role: "Primary", age: 61, occupation: "Retired, former CFO" },
      { name: "Lars Bergström", role: "Spouse", age: 63, occupation: "Retired" },
    ],
  },
];

const GOAL_TEMPLATES = [
  { name: "Retirement", priority: "High", targetMultiple: 0.75 },
  { name: "Education fund", priority: "High", targetMultiple: 0.045 },
  { name: "Second home", priority: "Medium", targetMultiple: 0.09 },
  { name: "Emergency reserve", priority: "High", targetMultiple: 0.018 },
  { name: "Legacy / charitable gift", priority: "Low", targetMultiple: 0.06 },
];

function fundedStatus(pct: number): GoalStatus {
  if (pct >= 100) return "fullyFunded";
  if (pct >= 70) return "onTrack";
  return "behind";
}

/** Pure, deterministic derivation of section-level financials from a
 * household's headline numbers. Seeded by name so re-running the seed
 * produces identical data. */
function deriveFinancials(h: HouseholdSeed, index: number) {
  const aumCents = centsFrom(h.aum);
  const netWorthCents = centsFrom(h.netWorth);
  const rand = mulberry32(hashCode(h.name));

  const incomeMultiplier = h.segment === "Founding" ? 0.03 : h.segment === "Premier" ? 0.045 : 0.065;
  const incomeCents = Math.round((aumCents * incomeMultiplier) / 1000) * 1000;
  const taxRate = 0.2 + rand() * 0.08;
  const taxesCents = Math.round(incomeCents * taxRate);
  const netIncomeCents = incomeCents - taxesCents;
  const savingsRatePct = Math.round(18 + rand() * 18);
  const savingsCents = Math.round((netIncomeCents * savingsRatePct) / 100);
  const spendingCents = netIncomeCents - savingsCents;

  // Start, taxes, and spending are each picked independently as plausible
  // values; growth is solved for last so the waterfall reconciles exactly
  // to netWorthCents without ever going negative. (Balance's "taxes" and
  // "spending" are capital-gains/one-time discretionary outflows against
  // the portfolio, not Cashflow's income-tax and living-expense figures —
  // those are already netted out before "contributions" ever reaches the
  // balance sheet.)
  const priorYearFraction = 0.82 + rand() * 0.08; // net worth a year ago, as a fraction of today's
  const balanceStartCents = Math.round(netWorthCents * priorYearFraction);
  const balanceContributionsCents = savingsCents;
  const balanceTaxesCents = Math.round(netWorthCents * (0.004 + rand() * 0.01));
  const balanceSpendingCents = Math.round(netWorthCents * (0.008 + rand() * 0.018));
  const balanceGrowthCents =
    netWorthCents - balanceStartCents - balanceContributionsCents + balanceTaxesCents + balanceSpendingCents;

  const realEstateCents = Math.round(netWorthCents * (0.18 + rand() * 0.12));
  const cashCents = Math.round(netWorthCents * (h.cashPct / 100) * 0.6);
  const mortgageCents = Math.round(realEstateCents * (0.15 + rand() * 0.2));
  const otherAssetsCents = Math.round(netWorthCents * 0.02);
  const investmentAccountsCents =
    netWorthCents + mortgageCents - realEstateCents - cashCents - otherAssetsCents;

  const equityTarget = h.segment === "Founding" ? 55 : h.segment === "Premier" ? 60 : 68;
  const equityActual = Math.round((equityTarget + (rand() - 0.3) * h.driftPct * 2) * 10) / 10;
  const cashTarget = Math.round((3 + rand() * 2) * 10) / 10;
  const fixedIncomeTarget = Math.round((100 - equityTarget - cashTarget) * 10) / 10;
  const fixedIncomeActual = Math.round((100 - equityActual - h.cashPct) * 10) / 10;

  const holdingNames: [string, string][] = [
    ["Halden Corp", "HALD"],
    ["Brightline Systems", "BRLN"],
    ["Northpeak Energy", "NPK"],
    ["Vesta Materials", "VSTA"],
    ["Arbor Health", "ARBR"],
  ];
  const [topHoldingName, topHoldingTicker] = holdingNames[index % holdingNames.length];

  const goals = GOAL_TEMPLATES.map((g, gi) => {
    const targetCents = Math.round(netWorthCents * g.targetMultiple);
    const basePct = gi === 0 ? h.planHealthPct + 8 : 40 + rand() * 60;
    const fundedPct = Math.max(8, Math.min(112, Math.round(basePct)));
    return {
      name: g.name,
      priority: g.priority,
      targetCents,
      fundedPct,
      status: fundedStatus(fundedPct),
    };
  });

  const whatChanged = [
    `Cash allocation moved to ${h.cashPct.toFixed(1)}% against a ${cashTarget.toFixed(1)}% target`,
    `Plan health is ${h.planHealthPct}% complete`,
    `Net worth ${h.ytdReturnPct >= 0 ? "grew" : "declined"} with YTD return of ${h.ytdReturnPct.toFixed(1)}%`,
  ].join("\n");

  const insights: { section: string; text: string; sourceLabel: string }[] = [];
  if (Math.abs(h.cashPct - cashTarget) > 1.5) {
    insights.push({
      section: "Allocation",
      text: `Cash (${h.cashPct.toFixed(1)}%) is ${h.cashPct > cashTarget ? "above" : "below"} the household's ${cashTarget.toFixed(1)}% target — worth discussing at the next review.`,
      sourceLabel: "Allocation section, synced today",
    });
  }
  const behindGoal = goals.find((g) => g.status === "behind" && g.priority === "High");
  if (behindGoal) {
    insights.push({
      section: "Goals",
      text: `${behindGoal.name} is high priority but only ${behindGoal.fundedPct}% funded — worth revisiting contribution levels.`,
      sourceLabel: "Goals section, recalculated today",
    });
  }
  if (h.reviewStatus === "overdue") {
    insights.push({
      section: "Overview",
      text: `This household is past its review cadence (last contact ${h.lastContactDays} days ago) — worth scheduling before it drifts further.`,
      sourceLabel: "Overview, synced today",
    });
  }

  return {
    incomeCents,
    taxesCents,
    netIncomeCents,
    spendingCents,
    savingsCents,
    savingsRatePct,
    balanceStartCents,
    balanceContributionsCents,
    balanceGrowthCents,
    balanceTaxesCents,
    balanceSpendingCents,
    investmentAccountsCents,
    realEstateCents,
    cashCents,
    otherAssetsCents,
    mortgageCents,
    equityTargetPct: equityTarget,
    equityActualPct: equityActual,
    fixedIncomeTargetPct: fixedIncomeTarget,
    fixedIncomeActualPct: fixedIncomeActual,
    topHoldingName,
    topHoldingTicker,
    topHoldingPct: Math.round((6 + rand() * 6) * 10) / 10,
    distinctHoldings: 18 + Math.round(rand() * 30),
    blendedExpenseRatioPct: Math.round((0.3 + rand() * 0.35) * 100) / 100,
    whatChanged,
    goals,
    insights,
  };
}

function hashCode(str: string) {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    hash = (hash << 5) - hash + str.charCodeAt(i);
    hash |= 0;
  }
  return hash >>> 0;
}

function mulberry32(seed: number) {
  let a = seed;
  return function () {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const PROSPECTS: {
  name: string;
  source: string;
  estValue: number;
  stage: PipelineStage;
  daysInStage: number;
  stalled?: boolean;
  advisor: "dana" | "maya";
}[] = [
  { name: "Bishop Family", source: "Referral: Ramirez Household", estValue: 1_200_000, stage: "Inquiry", daysInStage: 3, advisor: "dana" },
  { name: "Okonkwo Household", source: "Web inquiry", estValue: 650_000, stage: "Inquiry", daysInStage: 6, advisor: "maya" },
  { name: "Sorensen Household", source: "Referral: Nakamura Household", estValue: 2_400_000, stage: "Discovery", daysInStage: 9, advisor: "dana" },
  { name: "Delgado Family", source: "Referral: estate attorney", estValue: 900_000, stage: "Discovery", daysInStage: 14, advisor: "maya" },
  { name: "Yoon Household", source: "Referral: Kim Household", estValue: 3_100_000, stage: "Proposal", daysInStage: 11, advisor: "dana" },
  { name: "Castellano Family", source: "COI: tax attorney", estValue: 1_600_000, stage: "Proposal", daysInStage: 27, stalled: true, advisor: "maya" },
  { name: "Ferreira Household", source: "Signing scheduled Sep 24", estValue: 4_800_000, stage: "Agreement", daysInStage: 4, advisor: "dana" },
  { name: "Whitcombe Family", source: "Referral: Ogundele Household", estValue: 1_100_000, stage: "Discovery", daysInStage: 2, advisor: "maya" },
  { name: "Marchetti Household", source: "Web inquiry", estValue: 780_000, stage: "Inquiry", daysInStage: 1, advisor: "maya" },
  { name: "Osei Family", source: "Referral: Bergström Household", estValue: 2_050_000, stage: "Inquiry", daysInStage: 5, advisor: "dana" },
];

async function main() {
  await prisma.insight.deleteMany();
  await prisma.goal.deleteMany();
  await prisma.member.deleteMany();
  await prisma.prospect.deleteMany();
  await prisma.household.deleteMany();
  await prisma.advisor.deleteMany();

  const dana = await prisma.advisor.create({
    data: { name: "Dana Whitfield", initials: "DW", capacityTarget: 12 },
  });
  const maya = await prisma.advisor.create({
    data: { name: "Maya Reyes", initials: "MR", capacityTarget: 10 },
  });
  const advisorId = { dana: dana.id, maya: maya.id };

  for (const [index, h] of HOUSEHOLDS.entries()) {
    const extra = deriveFinancials(h, index);
    await prisma.household.create({
      data: {
        name: h.name,
        segment: h.segment,
        advisorId: advisorId[h.advisor],
        aumCents: centsFrom(h.aum),
        netWorthCents: centsFrom(h.netWorth),
        heldAwayCents: centsFrom(h.heldAway),
        ytdReturnPct: h.ytdReturnPct,
        cashPct: h.cashPct,
        targetCashPct: extra.equityTargetPct ? Math.round((100 - extra.equityTargetPct - extra.fixedIncomeTargetPct) * 10) / 10 : 3,
        driftPct: h.driftPct,
        planHealthPct: h.planHealthPct,
        lastContactDays: h.lastContactDays,
        nextReviewDate: new Date(h.nextReviewDate),
        reviewStatus: h.reviewStatus,
        clientSinceYear: h.clientSinceYear,
        completenessPct: h.planHealthPct,
        whatChanged: extra.whatChanged,
        incomeCents: extra.incomeCents,
        taxesCents: extra.taxesCents,
        netIncomeCents: extra.netIncomeCents,
        spendingCents: extra.spendingCents,
        savingsCents: extra.savingsCents,
        savingsRatePct: extra.savingsRatePct,
        balanceStartCents: extra.balanceStartCents,
        balanceContributionsCents: extra.balanceContributionsCents,
        balanceGrowthCents: extra.balanceGrowthCents,
        balanceTaxesCents: extra.balanceTaxesCents,
        balanceSpendingCents: extra.balanceSpendingCents,
        investmentAccountsCents: extra.investmentAccountsCents,
        realEstateCents: extra.realEstateCents,
        cashCents: extra.cashCents,
        otherAssetsCents: extra.otherAssetsCents,
        mortgageCents: extra.mortgageCents,
        equityTargetPct: extra.equityTargetPct,
        equityActualPct: extra.equityActualPct,
        fixedIncomeTargetPct: extra.fixedIncomeTargetPct,
        fixedIncomeActualPct: extra.fixedIncomeActualPct,
        topHoldingName: extra.topHoldingName,
        topHoldingTicker: extra.topHoldingTicker,
        topHoldingPct: extra.topHoldingPct,
        distinctHoldings: extra.distinctHoldings,
        blendedExpenseRatioPct: extra.blendedExpenseRatioPct,
        members: { create: h.members },
        goals: { create: extra.goals },
        insights: { create: extra.insights },
      },
    });
  }

  for (const p of PROSPECTS) {
    await prisma.prospect.create({
      data: {
        name: p.name,
        source: p.source,
        estValueCents: centsFrom(p.estValue),
        stage: p.stage,
        daysInStage: p.daysInStage,
        stalled: p.stalled ?? false,
        advisorId: advisorId[p.advisor],
      },
    });
  }

  console.log(`Seeded ${HOUSEHOLDS.length} households and ${PROSPECTS.length} prospects.`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
