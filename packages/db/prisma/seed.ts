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

function dollarsLabel(cents: number) {
  return `$${Math.round(cents / 100).toLocaleString("en-US")}`;
}

function clampPct(v: number, min = 40, max = 100) {
  return Math.max(min, Math.min(max, Math.round(v)));
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

  // Retirement
  const primaryMember = h.members.find((m) => m.role === "Primary") ?? h.members[0];
  const spouseMember = h.members.find((m) => m.role === "Spouse");
  const retirementAgePrimary = Math.round(62 + rand() * 5);
  const retirementAgeSpouse = spouseMember ? Math.round(63 + rand() * 5) : null;
  const ssClaimAgePrimary = Math.round(64 + rand() * 6);
  const ssClaimAgeSpouse = spouseMember ? Math.round(64 + rand() * 6) : null;
  // Tied to portfolio size at an annual withdrawal rate that deliberately
  // spans "safe" (~3.5%) to "aggressive" (~7%), not to current-year income —
  // an income-relative version of this clustered every household under a 2%
  // implied withdrawal rate regardless of net worth, which made
  // projectRetirement() return 100% success for all 10 households and left
  // the section unable to ever demonstrate the risk detection the product
  // thesis is about (see PROGRESS.md fix log).
  const retirementWithdrawalRatePct = 0.035 + rand() * 0.035;
  const monthlySpendingNeedCents = Math.round((netWorthCents * retirementWithdrawalRatePct) / 12);
  const withdrawalSequencing = "Taxable → Traditional → Roth";
  const retirementSuccessDeltaPts = Math.round((rand() - 0.55) * 9);

  // Tax
  const filingStatus = spouseMember ? "Married filing jointly" : "Single";
  const taxableIncomeCents = Math.round(incomeCents * (0.75 + rand() * 0.15));
  const effectiveRatePct = Math.round((14 + rand() * 10) * 10) / 10;
  const realizedGainsCents = Math.round(netWorthCents * (0.001 + rand() * 0.003));
  const unrealizedGainsCents = Math.round(investmentAccountsCents * (0.15 + rand() * 0.15));
  const harvestableLossesCents = Math.round(unrealizedGainsCents * (0.02 + rand() * 0.04));

  // Activity
  const openTasksCount = Math.round(rand() * 4);

  // Per-section completeness — varies per household and per section rather
  // than repeating one constant everywhere (see PROGRESS.md fix log).
  const sectionCompleteness = {
    householdCompletenessPct: clampPct(h.planHealthPct + (rand() - 0.5) * 24),
    cashflowCompletenessPct: clampPct(h.planHealthPct + (rand() - 0.5) * 24),
    balanceCompletenessPct: clampPct(h.planHealthPct + (rand() - 0.5) * 24),
    allocationCompletenessPct: clampPct(h.planHealthPct + (rand() - 0.5) * 24),
    goalsCompletenessPct: clampPct(h.planHealthPct + (rand() - 0.5) * 24),
    retirementCompletenessPct: clampPct(h.planHealthPct + (rand() - 0.5) * 30, 30),
    taxCompletenessPct: clampPct(h.planHealthPct + (rand() - 0.5) * 30, 30),
    protectionCompletenessPct: clampPct(h.planHealthPct + (rand() - 0.5) * 30, 30),
    estateCompletenessPct: clampPct(h.planHealthPct + (rand() - 0.5) * 30, 30),
    documentsCompletenessPct: clampPct(h.planHealthPct + (rand() - 0.5) * 24),
    activityCompletenessPct: clampPct(h.planHealthPct + (rand() - 0.5) * 24),
  };

  // Protection: one row per coverage type, gap magnitude driving the
  // diverging bar directly (see components/charts/protection-gap-bars.tsx).
  const lifeNeedCents = Math.round(incomeCents * (6 + rand() * 4));
  const lifeCurrentCents = Math.round(lifeNeedCents * (0.35 + rand() * 0.9));
  const lifeGapPct = Math.round(((lifeCurrentCents - lifeNeedCents) / lifeNeedCents) * 100);

  const disabilityNeedPct = Math.round(50 + rand() * 20);
  const disabilityCurrentPct = Math.round(disabilityNeedPct * (0.5 + rand() * 0.7));
  const disabilityGapPts = disabilityCurrentPct - disabilityNeedPct;

  const ltcNeedCents = Math.round(netWorthCents * (0.015 + rand() * 0.01));
  const hasLtcPolicy = rand() > 0.5;
  const ltcCurrentCents = hasLtcPolicy ? Math.round(ltcNeedCents * (0.3 + rand() * 0.6)) : 0;
  const ltcGapPct = hasLtcPolicy ? Math.round(((ltcCurrentCents - ltcNeedCents) / ltcNeedCents) * 100) : -100;

  const umbrellaNeedCents = Math.round(netWorthCents * (0.15 + rand() * 0.05));
  const umbrellaCurrentCents = Math.round(umbrellaNeedCents * (0.8 + rand() * 0.6));
  const umbrellaGapPct = Math.round(((umbrellaCurrentCents - umbrellaNeedCents) / umbrellaNeedCents) * 100);

  const policies = [
    {
      type: "Life",
      gapPct: lifeGapPct,
      gapLabel: `${lifeGapPct >= 0 ? "+" : ""}${lifeGapPct}%`,
      detailLabel: `Need ${dollarsLabel(lifeNeedCents)} · Current ${dollarsLabel(lifeCurrentCents)}`,
    },
    {
      type: "Disability",
      gapPct: disabilityGapPts,
      gapLabel: `${disabilityGapPts >= 0 ? "+" : ""}${disabilityGapPts}pts`,
      detailLabel: `Need ${disabilityNeedPct}% income replacement · Current ${disabilityCurrentPct}%`,
    },
    {
      type: "LongTermCare",
      gapPct: ltcGapPct,
      gapLabel: `${ltcGapPct >= 0 ? "+" : ""}${ltcGapPct}%`,
      detailLabel: hasLtcPolicy
        ? `Need ${dollarsLabel(ltcNeedCents)} benefit pool · Current ${dollarsLabel(ltcCurrentCents)}`
        : `Need ${dollarsLabel(ltcNeedCents)} benefit pool · No policy on file`,
    },
    {
      type: "Umbrella",
      gapPct: umbrellaGapPct,
      gapLabel: `${umbrellaGapPct >= 0 ? "+" : ""}${umbrellaGapPct}%`,
      detailLabel: `Need ${dollarsLabel(umbrellaNeedCents)} · Current ${dollarsLabel(umbrellaCurrentCents)}`,
    },
    {
      type: "PropertyCasualty",
      gapPct: null as number | null,
      gapLabel: null as string | null,
      detailLabel: "Reviewed within the past year · Adequate",
    },
  ];

  // Estate: asset -> beneficiary flow, one asset deliberately missing a
  // designation about a third of the time.
  const primaryFirst = primaryMember?.name.split(" ")[0] ?? "Primary";
  const spouseFirst = spouseMember?.name.split(" ")[0];
  const missingIndex = rand() < 0.35 ? Math.floor(rand() * 3) : -1; // -1 = nothing missing
  const estateAssetTemplates = spouseFirst
    ? [
        { assetName: "Joint taxable account", beneficiaryLabel: `${primaryFirst} & ${spouseFirst}` },
        { assetName: `${primaryFirst}'s Traditional IRA`, beneficiaryLabel: `${spouseFirst} (spouse)` },
        { assetName: `${spouseFirst}'s 401(k)`, beneficiaryLabel: `${primaryFirst} (spouse)` },
        { assetName: "Revocable Trust", beneficiaryLabel: "Children" },
        { assetName: "Primary residence", beneficiaryLabel: "Revocable Trust" },
      ]
    : [
        { assetName: "Taxable brokerage account", beneficiaryLabel: "Estate" },
        { assetName: `${primaryFirst}'s Traditional IRA`, beneficiaryLabel: "Named beneficiary" },
        { assetName: `${primaryFirst}'s 401(k)`, beneficiaryLabel: "Named beneficiary" },
        { assetName: "Revocable Trust", beneficiaryLabel: "Named heirs" },
        { assetName: "Primary residence", beneficiaryLabel: "Revocable Trust" },
      ];
  const estateAssets = estateAssetTemplates.map((a, i) => ({
    assetName: a.assetName,
    beneficiaryLabel: i === missingIndex ? "No beneficiary on file" : a.beneficiaryLabel,
    missingDesignation: i === missingIndex,
    sortOrder: i,
  }));

  const beneficiaryDesignationsOverdue = rand() < 0.4;
  const estateDocs = [
    { name: "Wills", statusLabel: spouseFirst ? `${primaryFirst} & ${spouseFirst} — signed` : `${primaryFirst} — signed`, overdue: false },
    { name: "Power of attorney", statusLabel: "On file — signed", overdue: false },
    { name: "Healthcare directive", statusLabel: "On file — signed", overdue: false },
    { name: "Revocable trust", statusLabel: "Established, partially funded", overdue: false },
    {
      name: "Beneficiary designations",
      statusLabel: beneficiaryDesignationsOverdue ? "Last reviewed over 3 years ago · overdue" : "Reviewed within the past year",
      overdue: beneficiaryDesignationsOverdue,
    },
  ].map((d, i) => ({ ...d, sortOrder: i }));

  // Household document vault. uploadedLabel is a real formatted date (or a
  // relative near-future one for "Due soon") for every row that has one —
  // see the schema comment: "formatted date string, or '—' for Missing."
  const now = Date.now();
  const daysAgo = (d: number) => new Date(now - d * 24 * 60 * 60 * 1000);
  const daysFromNow = (d: number) => new Date(now + d * 24 * 60 * 60 * 1000);
  const shortDate = (d: Date) => d.toLocaleDateString("en-US", { month: "short", day: "numeric", timeZone: "UTC" });
  const monthYear = (d: Date) => d.toLocaleDateString("en-US", { month: "short", year: "numeric", timeZone: "UTC" });
  // Compliance dates are a year or more apart, so they carry the year —
  // without it "effective Apr 3 / next due Apr 3" reads as a bug.
  const dateWithYear = (d: Date) => d.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric", timeZone: "UTC" });

  const docBucketRoll = rand();
  const trustSignedYearsAgo = 2 + Math.round(rand() * 3);
  // The IPS appears in two places — the document vault below and the
  // Compliance section's item list — so its status and date are decided
  // once here and read by both. Two independent rolls would eventually
  // have the vault calling it signed while Compliance called it due.
  const ipsDue = docBucketRoll < 0.5;
  const ipsDate = ipsDue ? daysFromNow(4 + Math.round(rand() * 10)) : daysAgo(20 + Math.round(rand() * 40));
  const ipsDateLabel = shortDate(ipsDate);
  const documents = [
    {
      name: "Estate Planning Questionnaire",
      type: "Estate",
      statusLabel: "Signed",
      bucket: "complete",
      uploadedLabel: shortDate(daysAgo(4 + Math.round(rand() * 10))),
      source: "Client-provided",
    },
    {
      name: "Family Trust Agreement (Revocable)",
      type: "Estate",
      statusLabel: "Signed",
      bucket: "complete",
      uploadedLabel: monthYear(daysAgo(trustSignedYearsAgo * 365)),
      source: "E-signature",
    },
    {
      name: "Latest Form 1040",
      type: "Tax",
      statusLabel: "Filed",
      bucket: "complete",
      uploadedLabel: "Apr 15",
      source: "Client-provided",
    },
    {
      name: "Investment Policy Statement",
      type: "Agreement",
      statusLabel: ipsDue ? "Due" : "Signed",
      bucket: ipsDue ? "needsAttention" : "complete",
      uploadedLabel: ipsDateLabel,
      source: "Advisor upload",
    },
    {
      name: `Driver's License (${primaryFirst})`,
      type: "KYC",
      statusLabel: "Expiring soon",
      bucket: "needsAttention",
      uploadedLabel: monthYear(daysAgo(4 * 365 - Math.round(rand() * 60))),
      source: "Client-provided",
    },
    {
      name: `${spouseFirst ? `${spouseFirst}'s ` : ""}401(k) Beneficiary Designation`,
      type: "Estate",
      statusLabel: missingIndex >= 0 ? "Missing" : "On file",
      bucket: missingIndex >= 0 ? "missing" : "complete",
      uploadedLabel: missingIndex >= 0 ? "—" : monthYear(daysAgo(trustSignedYearsAgo * 365)),
      source: missingIndex >= 0 ? "—" : "Client-provided",
    },
  ];

  // ---- Compliance (household-scoped, CLAUDE.md §6 §14) ----
  // Everything here is anchored to fields the rest of the app already
  // renders — the household's review cadence, its next review date, its
  // last-contact gap, the year it became a client — so the Compliance
  // section can't tell a different story than the Clients list, the
  // top-level Compliance page, or the document vault. Item names are the
  // artifacts an RIA actually keeps on file; the dates and statuses are
  // fixtures, and no filing deadline or rule text is asserted anywhere.
  const cadenceMonths = h.segment === "Core" ? 12 : 6;
  const nextReview = new Date(`${h.nextReviewDate}T00:00:00Z`);
  const monthsBefore = (d: Date, months: number) => {
    const out = new Date(d);
    out.setUTCMonth(out.getUTCMonth() - months);
    return out;
  };
  const monthsAfter = (d: Date, months: number) => monthsBefore(d, -months);
  const periodLabel = (d: Date) =>
    cadenceMonths === 12 ? String(d.getUTCFullYear()) : `${d.getUTCMonth() < 6 ? "H1" : "H2"} ${d.getUTCFullYear()}`;

  const reviewScopes = [
    "Allocation, goals, and suitability",
    "Full plan review — all sections",
    "Allocation drift and cash position",
    "Goals, contributions, and tax position",
  ];

  // Up to four prior reviews, never reaching back before the household was
  // a client. A Core household on an annual cadence naturally shows fewer
  // markers than a Founding one reviewed twice a year.
  const priorReviews = [1, 2, 3, 4]
    .map((n) => monthsBefore(nextReview, n * cadenceMonths))
    .filter((d) => d.getUTCFullYear() >= h.clientSinceYear);

  // A review that happened but was never attested is the gap worth
  // surfacing — distinct from one that simply hasn't come due yet.
  const attestationLapsed = rand() < 0.3 && priorReviews.length > 0;

  const attestations = [
    ...priorReviews.map((d, i) => ({
      periodLabel: periodLabel(d),
      occurredAt: d,
      held: true,
      attested: !(i === 0 && attestationLapsed),
      scope: reviewScopes[i % reviewScopes.length]!,
      notes:
        i === 0 && attestationLapsed
          ? "Review held and notes filed; attestation never signed."
          : null,
    })),
    {
      periodLabel: periodLabel(nextReview),
      occurredAt: nextReview,
      held: false,
      attested: false,
      scope: reviewScopes[priorReviews.length % reviewScopes.length]!,
      notes:
        h.reviewStatus === "overdue"
          ? `Past the household's ${cadenceMonths}-month cadence — not yet held.`
          : null,
    },
  ].sort((a, b) => a.occurredAt.getTime() - b.occurredAt.getTime());

  // Annual disclosure deliveries, anchored to the most recent review so
  // they sit on the same clock as everything else on the page.
  const lastReview = priorReviews[0] ?? monthsBefore(nextReview, cadenceMonths);
  const advDelivered = lastReview;
  const advNextDue = monthsAfter(advDelivered, 12);
  const advOverdue = advNextDue.getTime() < now;
  const privacyDelivered = monthsBefore(advDelivered, 3);
  const privacyNextDue = monthsAfter(privacyDelivered, 12);
  const privacyOverdue = privacyNextDue.getTime() < now;
  const suitabilityStale = h.lastContactDays > 90;
  const feeAckMissing = rand() < 0.2;

  // Items that recur with the review cycle come due at the first review
  // that falls after they took effect — without that guard, a household
  // whose review is already overdue gets an item whose "next due" lands
  // before its own effective date. And anything whose due date has passed
  // is flagged, whatever else is true about it: one rule for every dated
  // item, so an overdue household can't show a page full of "in force".
  const reviewAfter = (effective: Date) =>
    nextReview.getTime() > effective.getTime() ? nextReview : monthsAfter(nextReview, cadenceMonths);
  const pastDue = (d: Date) => d.getTime() < now;

  const ipsEffective = ipsDue ? daysAgo(18 * 30) : ipsDate;
  const ipsNextDue = ipsDue ? ipsDate : reviewAfter(ipsEffective);
  const suitabilityEffective = lastReview;
  const suitabilityNextDue = reviewAfter(suitabilityEffective);
  const suitabilityNeedsWork = suitabilityStale || pastDue(suitabilityNextDue);

  const complianceItems = [
    {
      name: "Investment Policy Statement",
      category: "IPS",
      detail: "Objectives, constraints, and the target allocation this household is managed against.",
      statusLabel: ipsDue || pastDue(ipsNextDue) ? "Refresh due" : "In force",
      bucket: ipsDue || pastDue(ipsNextDue) ? "needsAttention" : "inForce",
      effectiveLabel: dateWithYear(ipsEffective),
      nextDueLabel: dateWithYear(ipsNextDue),
    },
    {
      name: "Suitability assessment",
      category: "Suitability",
      detail: "Risk tolerance, time horizon, liquidity needs, and stated objectives on record.",
      statusLabel: suitabilityNeedsWork ? "Refresh due" : "In force",
      bucket: suitabilityNeedsWork ? "needsAttention" : "inForce",
      effectiveLabel: dateWithYear(suitabilityEffective),
      nextDueLabel: dateWithYear(suitabilityNextDue),
    },
    {
      name: "Risk profile questionnaire",
      category: "Suitability",
      detail: "The completed questionnaire behind the suitability assessment.",
      statusLabel: pastDue(suitabilityNextDue) ? "Refresh due" : "In force",
      bucket: pastDue(suitabilityNextDue) ? "needsAttention" : "inForce",
      effectiveLabel: dateWithYear(suitabilityEffective),
      nextDueLabel: dateWithYear(suitabilityNextDue),
    },
    {
      name: "Advisory agreement",
      category: "Agreement",
      detail: "Signed engagement, scope of services, and fee basis.",
      statusLabel: "In force",
      bucket: "inForce",
      effectiveLabel: String(h.clientSinceYear),
      nextDueLabel: "—",
    },
    {
      name: "Fee schedule acknowledgment",
      category: "Agreement",
      detail: "Client acknowledgment of the fee schedule in effect.",
      statusLabel: feeAckMissing ? "Not on file" : "In force",
      bucket: feeAckMissing ? "missing" : "inForce",
      effectiveLabel: feeAckMissing ? "—" : String(h.clientSinceYear),
      nextDueLabel: "—",
    },
    {
      name: "Form ADV Part 2A & 2B",
      category: "Disclosure",
      detail: "Firm brochure and brochure supplement, delivered annually.",
      statusLabel: advOverdue ? "Delivery due" : "In force",
      bucket: advOverdue ? "needsAttention" : "inForce",
      effectiveLabel: dateWithYear(advDelivered),
      nextDueLabel: dateWithYear(advNextDue),
    },
    {
      name: "Form CRS",
      category: "Disclosure",
      detail: "Relationship summary, delivered at onboarding and on material change.",
      statusLabel: "In force",
      bucket: "inForce",
      effectiveLabel: String(h.clientSinceYear),
      nextDueLabel: "—",
    },
    {
      name: "Privacy notice",
      category: "Disclosure",
      detail: "Annual notice of the firm's privacy practices.",
      statusLabel: privacyOverdue ? "Delivery due" : "In force",
      bucket: privacyOverdue ? "needsAttention" : "inForce",
      effectiveLabel: dateWithYear(privacyDelivered),
      nextDueLabel: dateWithYear(privacyNextDue),
    },
  ].map((c, i) => ({ ...c, sortOrder: i }));

  // Computed from the record rather than seeded to "vary plausibly" like
  // the other eleven section rings: an item in force counts fully, one
  // needing attention counts half, one not on file counts nothing, and an
  // unattested or missed review costs the section eight points.
  const itemScore = complianceItems.reduce(
    (sum, c) => sum + (c.bucket === "inForce" ? 1 : c.bucket === "needsAttention" ? 0.5 : 0),
    0,
  );
  const reviewPenalty = attestationLapsed || h.reviewStatus === "overdue" ? 8 : 0;
  const complianceCompletenessPct = clampPct(
    (itemScore / complianceItems.length) * 100 - reviewPenalty,
    30,
  );

  // Activity timeline — spread over roughly the last two months.
  const activityEvents = [
    { kind: "PlanChange", label: "Positions synced from custodian feed", detail: null, occurredAt: daysAgo(0) },
    { kind: "Document", label: "New document uploaded", detail: null, occurredAt: daysAgo(3 + Math.round(rand() * 4)) },
    { kind: "PlanChange", label: "Net worth figures verified", detail: null, occurredAt: daysAgo(8 + Math.round(rand() * 4)) },
    {
      kind: "Meeting",
      label: "Quarterly check-in call, 30 min",
      detail: "Discussed cash position and upcoming goals.",
      occurredAt: daysAgo(15 + Math.round(rand() * 5)),
    },
    { kind: "TaskCompleted", label: "Sent quarterly market update email", detail: null, occurredAt: daysAgo(21 + Math.round(rand() * 5)) },
    { kind: "PlanChange", label: "Protection coverage figures verified", detail: null, occurredAt: daysAgo(28 + Math.round(rand() * 8)) },
    {
      kind: "Note",
      label: "Household mentioned interest in a goals discussion",
      detail: "Flagged for the next review.",
      occurredAt: daysAgo(36 + Math.round(rand() * 8)),
    },
  ];

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
  if (lifeGapPct <= -30) {
    insights.push({
      section: "Protection",
      text: `Life insurance coverage (${dollarsLabel(lifeCurrentCents)}) is ${Math.abs(lifeGapPct)}% below the estimated need (${dollarsLabel(lifeNeedCents)}) given current income-replacement goals — worth discussing at the next review.`,
      sourceLabel: "Protection section, Cashflow + Goals",
    });
  } else if (!hasLtcPolicy) {
    insights.push({
      section: "Protection",
      text: `No long-term care policy is on file against an estimated ${dollarsLabel(ltcNeedCents)} benefit pool need — worth raising before it becomes urgent.`,
      sourceLabel: "Protection section, synced today",
    });
  }
  if (missingIndex >= 0) {
    const missingAsset = estateAssetTemplates[missingIndex]!;
    insights.push({
      section: "Estate",
      text: `${missingAsset.assetName} has no beneficiary on file. Accounts without a named beneficiary typically default to the estate, which can mean probate — worth confirming the designation with the plan administrator.`,
      sourceLabel: "Estate section, synced today",
    });
  } else if (beneficiaryDesignationsOverdue) {
    insights.push({
      section: "Estate",
      text: "Beneficiary designations haven't been reviewed in over three years — worth a fresh pass to confirm they still reflect the household's wishes.",
      sourceLabel: "Estate section, synced today",
    });
  }
  const missingDoc = documents.find((d) => d.bucket === "missing");
  if (missingDoc) {
    insights.push({
      section: "Documents",
      text: `${missingDoc.name} is missing from the vault — worth requesting before it holds up anything that depends on it.`,
      sourceLabel: "Documents section, synced today",
    });
  }
  if (attestationLapsed) {
    const lapsed = attestations.find((a) => a.held && !a.attested)!;
    insights.push({
      section: "Compliance",
      text: `The ${lapsed.periodLabel} review was held but never attested — the notes are on file, the sign-off isn't. Worth closing before the next audit pass.`,
      sourceLabel: "Compliance section, review attestations",
    });
  }
  const missingComplianceItem = complianceItems.find((c) => c.bucket === "missing");
  if (missingComplianceItem) {
    insights.push({
      section: "Compliance",
      text: `${missingComplianceItem.name} isn't on file for this household — worth collecting alongside the next scheduled review.`,
      sourceLabel: "Compliance section, synced today",
    });
  } else if (ipsDue || pastDue(ipsNextDue)) {
    insights.push({
      section: "Compliance",
      text: `The Investment Policy Statement is due for a refresh on ${dateWithYear(ipsNextDue)} — the target allocation it documents predates the household's current drift.`,
      sourceLabel: "Compliance section, cross-referenced with Allocation",
    });
  }
  if (openTasksCount >= 3) {
    insights.push({
      section: "Activity",
      text: `${openTasksCount} tasks are still open for this household — worth a pass to close out or reprioritize before the next review.`,
      sourceLabel: "Activity section, synced today",
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
    retirementAgePrimary,
    retirementAgeSpouse,
    ssClaimAgePrimary,
    ssClaimAgeSpouse,
    monthlySpendingNeedCents,
    withdrawalSequencing,
    retirementSuccessDeltaPts,
    filingStatus,
    taxableIncomeCents,
    effectiveRatePct,
    realizedGainsCents,
    unrealizedGainsCents,
    harvestableLossesCents,
    openTasksCount,
    ...sectionCompleteness,
    policies,
    estateAssets,
    estateDocs,
    documents,
    activityEvents,
    complianceItems,
    attestations,
    complianceCompletenessPct,
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
        retirementAgePrimary: extra.retirementAgePrimary,
        retirementAgeSpouse: extra.retirementAgeSpouse,
        ssClaimAgePrimary: extra.ssClaimAgePrimary,
        ssClaimAgeSpouse: extra.ssClaimAgeSpouse,
        monthlySpendingNeedCents: extra.monthlySpendingNeedCents,
        withdrawalSequencing: extra.withdrawalSequencing,
        retirementSuccessDeltaPts: extra.retirementSuccessDeltaPts,
        filingStatus: extra.filingStatus,
        taxableIncomeCents: extra.taxableIncomeCents,
        effectiveRatePct: extra.effectiveRatePct,
        realizedGainsCents: extra.realizedGainsCents,
        unrealizedGainsCents: extra.unrealizedGainsCents,
        harvestableLossesCents: extra.harvestableLossesCents,
        openTasksCount: extra.openTasksCount,
        householdCompletenessPct: extra.householdCompletenessPct,
        cashflowCompletenessPct: extra.cashflowCompletenessPct,
        balanceCompletenessPct: extra.balanceCompletenessPct,
        allocationCompletenessPct: extra.allocationCompletenessPct,
        goalsCompletenessPct: extra.goalsCompletenessPct,
        retirementCompletenessPct: extra.retirementCompletenessPct,
        taxCompletenessPct: extra.taxCompletenessPct,
        protectionCompletenessPct: extra.protectionCompletenessPct,
        estateCompletenessPct: extra.estateCompletenessPct,
        documentsCompletenessPct: extra.documentsCompletenessPct,
        activityCompletenessPct: extra.activityCompletenessPct,
        complianceCompletenessPct: extra.complianceCompletenessPct,
        members: { create: h.members },
        goals: { create: extra.goals },
        insights: { create: extra.insights },
        policies: { create: extra.policies },
        estateAssets: { create: extra.estateAssets },
        estateDocs: { create: extra.estateDocs },
        documents: { create: extra.documents },
        activityEvents: { create: extra.activityEvents },
        complianceItems: { create: extra.complianceItems },
        attestations: { create: extra.attestations },
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
