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

type AdvisorKey = "dana" | "maya" | "theo" | "ines";

// SQLite has no native enum type (see schema.prisma) — these unions are the
// app-layer substitute, kept next to the seed data that uses them.
type Segment = "Core" | "Premier" | "Founding";
type ReviewStatus = "scheduled" | "due" | "overdue";
type GoalStatus = "onTrack" | "fullyFunded" | "behind";
type PipelineStage = "Inquiry" | "Discovery" | "Proposal" | "Agreement";

const prisma = new PrismaClient();

/** Money is integer cents (D-007) in BigInt columns (D-023). The old Int
 * columns capped a single field at $21,474,836.47, which the forty-household
 * book hit immediately; the guard that used to live here is gone with the
 * ceiling, and the archetypes below are back to the sizes they wanted.
 *
 * Derivation stays in numbers — deriveFinancials() multiplies cents by
 * fractions throughout, which bigint cannot do — and `big()` converts at
 * the write, which is the same boundary rule the app follows. */
function centsFrom(dollars: number): number {
  return Math.round(dollars * 100);
}

function big(cents: number): bigint {
  return BigInt(Math.round(cents));
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
  advisor: AdvisorKey;
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
const DESIGNED_HOUSEHOLDS: HouseholdSeed[] = [
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

/**
 * The rest of the book (M-demo item 2). Ten households read as a toy the
 * moment the signals engine says "six of your households are affected";
 * forty reads as a book. Everything below is generated deterministically
 * from the household name, so reseeding never reshuffles the demo, and the
 * section-level detail still comes from deriveFinancials() — these
 * archetypes only set the inputs it derives from.
 *
 * The archetypes exist for one reason: the impact rules the signals engine
 * will run need households that genuinely differ along the axes those rules
 * test. A book of forty lookalike households would let any rule match
 * everyone or no one. So ages cluster deliberately around the thresholds
 * that matter (59, 65, 73), cash weightings run from 1.5% to 14%, and
 * mortgage exposure, taxable income and drift all spread accordingly.
 */
type Archetype = {
  key: string;
  ageRange: [number, number];
  /** Ages worth landing on exactly — 59½, 65 and 73 all trigger something. */
  thresholdAges?: number[];
  aumRange: [number, number];
  netWorthMultiple: [number, number];
  cashRange: [number, number];
  driftRange: [number, number];
  ytdRange: [number, number];
  planHealthRange: [number, number];
  dependents: [number, number];
  spouseChance: number;
  occupations: string[];
};

const ARCHETYPES: Archetype[] = [
  {
    key: "accumulator",
    ageRange: [29, 39],
    aumRange: [0.35, 1.6],
    netWorthMultiple: [1.1, 1.5],
    cashRange: [1.5, 4.5],
    driftRange: [0.4, 2.6],
    ytdRange: [6.5, 12.5],
    planHealthRange: [45, 78],
    dependents: [0, 2],
    spouseChance: 0.6,
    occupations: ["Software engineer", "Product designer", "Nurse practitioner", "Associate attorney", "Data scientist"],
  },
  {
    key: "family",
    ageRange: [40, 52],
    aumRange: [1.1, 4.8],
    netWorthMultiple: [1.2, 1.6],
    cashRange: [2.5, 7.0],
    driftRange: [0.8, 5.4],
    ytdRange: [4.5, 10.5],
    planHealthRange: [52, 88],
    dependents: [1, 3],
    spouseChance: 0.85,
    occupations: ["Hospital administrator", "Civil engineer", "Marketing director", "Pharmacist", "School principal"],
  },
  {
    key: "preRetiree",
    ageRange: [55, 64],
    thresholdAges: [59, 60, 63, 64],
    aumRange: [2.8, 9.5],
    netWorthMultiple: [1.15, 1.45],
    cashRange: [4.0, 9.5],
    driftRange: [1.2, 6.8],
    ytdRange: [3.5, 9.5],
    planHealthRange: [58, 92],
    dependents: [0, 1],
    spouseChance: 0.8,
    occupations: ["Partner, accounting firm", "Operations director", "Airline captain", "University dean", "Sales VP"],
  },
  {
    key: "newRetiree",
    ageRange: [65, 72],
    thresholdAges: [65, 66, 70, 72],
    aumRange: [3.4, 12.0],
    netWorthMultiple: [1.1, 1.4],
    cashRange: [6.5, 14.0],
    driftRange: [1.5, 7.2],
    ytdRange: [1.5, 7.5],
    planHealthRange: [55, 90],
    dependents: [0, 0],
    spouseChance: 0.75,
    occupations: ["Retired", "Retired physician", "Retired teacher", "Consultant, part-time", "Retired engineer"],
  },
  {
    key: "rmdAge",
    ageRange: [73, 84],
    thresholdAges: [73, 74, 76, 79],
    aumRange: [4.0, 15.0],
    netWorthMultiple: [1.05, 1.35],
    cashRange: [5.5, 12.0],
    driftRange: [0.9, 5.8],
    ytdRange: [1.0, 6.5],
    planHealthRange: [50, 86],
    dependents: [0, 0],
    spouseChance: 0.55,
    occupations: ["Retired", "Retired executive", "Retired farmer", "Retired librarian", "Emeritus professor"],
  },
  {
    key: "businessOwner",
    ageRange: [45, 61],
    aumRange: [4.5, 18.0],
    netWorthMultiple: [1.3, 1.9],
    cashRange: [3.0, 10.5],
    driftRange: [2.2, 8.4],
    ytdRange: [2.5, 13.5],
    planHealthRange: [44, 84],
    dependents: [0, 2],
    spouseChance: 0.8,
    occupations: ["Founder, logistics firm", "Owner, dental practice", "Restaurant group owner", "Owner, machining shop", "Founder, staffing agency"],
  },
  {
    key: "transfer",
    ageRange: [34, 58],
    aumRange: [1.8, 8.0],
    netWorthMultiple: [1.2, 1.7],
    cashRange: [5.0, 12.5],
    driftRange: [1.0, 6.0],
    ytdRange: [3.0, 9.0],
    planHealthRange: [40, 80],
    dependents: [0, 2],
    spouseChance: 0.6,
    occupations: ["Gallery director", "Vineyard owner", "Trustee, family foundation", "Architect", "Documentary producer"],
  },
];

const SURNAMES = [
  "Abernathy", "Balogun", "Castellanos", "Duarte", "Eriksen", "Fairbanks", "Ghosh", "Halvorsen",
  "Ibarra", "Jandali", "Kowalski", "Lindqvist", "Moreau", "Nwachukwu", "Oyelaran", "Pahlavi",
  "Quintero", "Rosenthal", "Salvatierra", "Tanaka", "Ueda", "Vasquez", "Whitlock", "Xiang",
  "Yamamoto", "Zabala", "Achebe", "Brennan", "Cazares", "Dlamini",
];

const FIRST_NAMES = [
  "Arjun", "Beatrix", "Caleb", "Dagny", "Emeka", "Farah", "Gustav", "Helena", "Ibrahim", "Juno",
  "Kwame", "Liesel", "Mateo", "Nadia", "Oskar", "Priya", "Quentin", "Rosa", "Soren", "Tamsin",
  "Ulises", "Vera", "Wendell", "Ximena", "Yusuf", "Zora", "Anders", "Bianca", "Cyrus", "Delphine",
];

const CHILD_NAMES = ["Milo", "Ada", "Teodor", "Inés", "Kofi", "Runa", "Nils", "Amara", "Hugo", "Sena"];

function generateHouseholds(): HouseholdSeed[] {
  const advisors: AdvisorKey[] = ["dana", "maya", "theo", "ines"];
  const today = new Date();

  return SURNAMES.map((surname, i) => {
    const name = `${surname} Household`;
    const rand = mulberry32(hashCode(`book:${name}`));
    const pick = <T,>(items: T[]) => items[Math.floor(rand() * items.length)]!;
    const between = ([lo, hi]: [number, number]) => lo + rand() * (hi - lo);
    const round1 = (v: number) => Math.round(v * 10) / 10;

    const archetype = ARCHETYPES[i % ARCHETYPES.length]!;
    const aum = Math.round(between(archetype.aumRange) * 100) / 100 * 1_000_000;
    const netWorth = Math.round(aum * between(archetype.netWorthMultiple));
    const heldAway = Math.round(aum * (rand() * 0.22));

    // Review status spread: roughly a fifth overdue, a fifth due soon, the
    // rest scheduled — enough overdue work to be worth a demo, not so much
    // that the book looks neglected.
    const statusRoll = rand();
    const reviewStatus: ReviewStatus = statusRoll < 0.18 ? "overdue" : statusRoll < 0.36 ? "due" : "scheduled";
    const dayOffset =
      reviewStatus === "overdue"
        ? -(10 + Math.round(rand() * 80))
        : reviewStatus === "due"
          ? Math.round(rand() * 25)
          : 30 + Math.round(rand() * 150);
    const reviewDate = new Date(today.getTime() + dayOffset * 86_400_000);

    // Threshold ages are assigned by position, not by chance: households
    // cycle through the archetypes, so the nth household of an archetype
    // takes the nth threshold age. Leaving it to rand() left the book with
    // one member at 59 and none at 65 — which would make an age-triggered
    // rule look broken when it is the data that is thin.
    const archetypeIndex = Math.floor(i / ARCHETYPES.length);
    const primaryAge = archetype.thresholdAges
      ? archetype.thresholdAges[archetypeIndex % archetype.thresholdAges.length]!
      : Math.round(between(archetype.ageRange));

    const members: HouseholdSeed["members"] = [
      {
        name: `${pick(FIRST_NAMES)} ${surname}`,
        role: "Primary",
        age: primaryAge,
        occupation: pick(archetype.occupations),
      },
    ];
    if (rand() < archetype.spouseChance) {
      members.push({
        name: `${pick(FIRST_NAMES)} ${surname}`,
        role: "Spouse",
        age: Math.max(21, primaryAge + Math.round((rand() - 0.5) * 8)),
        occupation: pick(archetype.occupations),
      });
    }
    const dependents = archetype.dependents[0] + Math.round(rand() * (archetype.dependents[1] - archetype.dependents[0]));
    for (let d = 0; d < dependents; d++) {
      members.push({
        name: `${pick(CHILD_NAMES)} ${surname}`,
        role: "Dependent",
        age: Math.max(1, Math.min(24, primaryAge - 28 - Math.round(rand() * 12))),
        occupation: "Student",
      });
    }

    return {
      name,
      segment: aum >= 9_000_000 ? "Founding" : aum >= 3_000_000 ? "Premier" : "Core",
      advisor: advisors[i % advisors.length]!,
      aum,
      netWorth,
      heldAway,
      ytdReturnPct: round1(between(archetype.ytdRange) - (rand() < 0.12 ? 8 : 0)),
      cashPct: round1(between(archetype.cashRange)),
      driftPct: round1(between(archetype.driftRange)),
      planHealthPct: Math.round(between(archetype.planHealthRange)),
      lastContactDays:
        reviewStatus === "overdue" ? 45 + Math.round(rand() * 70) : 2 + Math.round(rand() * 40),
      nextReviewDate: reviewDate.toISOString().slice(0, 10),
      reviewStatus,
      clientSinceYear: 2005 + Math.round(rand() * 20),
      members,
    };
  });
}

const HOUSEHOLDS: HouseholdSeed[] = [...DESIGNED_HOUSEHOLDS, ...generateHouseholds()];


// The horizon is what lets a goal reach the projection at all: a goal
// with no time horizon has no year to be drawn in, so it never costs the
// plan anything and the goal levers on it do nothing. These bands are the
// ones intake collects (lib/calc/planning.ts maps them to years).
//
// Retirement carries none on purpose. It is not a dated withdrawal — it
// is the spending the whole projection is already modelling — and giving
// it a year would make the plan pay for retirement twice.
const GOAL_TEMPLATES = [
  { name: "Retirement", priority: "High", targetMultiple: 0.75, horizon: null },
  { name: "Education fund", priority: "High", targetMultiple: 0.045, horizon: "3–7 years" },
  { name: "Second home", priority: "Medium", targetMultiple: 0.09, horizon: "7–15 years" },
  { name: "Emergency reserve", priority: "High", targetMultiple: 0.018, horizon: "Under 3 years" },
  { name: "Legacy / charitable gift", priority: "Low", targetMultiple: 0.06, horizon: "15+ years" },
];

function fundedStatus(pct: number): GoalStatus {
  if (pct >= 100) return "fullyFunded";
  if (pct >= 70) return "onTrack";
  return "behind";
}

/** Pure, deterministic derivation of section-level financials from a
 * household's headline numbers. Seeded by name so re-running the seed
 * produces identical data. */

// ---------------------------------------------------------------------------
// The securities the seeded portfolios are built from.
//
// Every one is invented: no real ticker, issuer, or fee (CLAUDE.md §13).
// They exist so the Allocation section can answer "what is actually in the
// 62% equities" with rows rather than an adjective. Expense ratios are
// fixtures too — plausible in shape (an index fund cheaper than a
// small-cap fund, a single share costing nothing to hold) without being
// copied from any real product.
type SecuritySeed = {
  ticker: string;
  name: string;
  kind: "ETF" | "Fund" | "Stock" | "Cash";
  assetClass: "Equity" | "FixedIncome" | "Cash";
  sector: string | null;
  region: string;
  expenseRatioPct: number;
};

const EQUITY_FUNDS: SecuritySeed[] = [
  { ticker: "MBEI", name: "Meridian Broad Equity Index", kind: "ETF", assetClass: "Equity", sector: null, region: "US", expenseRatioPct: 0.04 },
  { ticker: "CTMF", name: "Cascadia Total Market Fund", kind: "ETF", assetClass: "Equity", sector: null, region: "US", expenseRatioPct: 0.06 },
  { ticker: "AGIE", name: "Aldergrove International Equity", kind: "ETF", assetClass: "Equity", sector: null, region: "International", expenseRatioPct: 0.12 },
  { ticker: "KSCG", name: "Kestrel Small-Cap Growth", kind: "Fund", assetClass: "Equity", sector: null, region: "US", expenseRatioPct: 0.21 },
];

const EQUITY_STOCKS: SecuritySeed[] = [
  { ticker: "HALD", name: "Halden Corp", kind: "Stock", assetClass: "Equity", sector: "Technology", region: "US", expenseRatioPct: 0 },
  { ticker: "BRLN", name: "Brightline Systems", kind: "Stock", assetClass: "Equity", sector: "Technology", region: "US", expenseRatioPct: 0 },
  { ticker: "NPKE", name: "Northpeak Energy", kind: "Stock", assetClass: "Equity", sector: "Energy", region: "US", expenseRatioPct: 0 },
  { ticker: "VSTA", name: "Vesta Materials", kind: "Stock", assetClass: "Equity", sector: "Materials", region: "US", expenseRatioPct: 0 },
  { ticker: "ARBR", name: "Arbor Health", kind: "Stock", assetClass: "Equity", sector: "Health care", region: "US", expenseRatioPct: 0 },
  { ticker: "CDFN", name: "Caldera Financial", kind: "Stock", assetClass: "Equity", sector: "Financials", region: "US", expenseRatioPct: 0 },
  { ticker: "SBCG", name: "Sable Consumer Group", kind: "Stock", assetClass: "Equity", sector: "Consumer", region: "US", expenseRatioPct: 0 },
];

const FIXED_INCOME_FUNDS: SecuritySeed[] = [
  { ticker: "MCBI", name: "Meridian Core Bond Index", kind: "Fund", assetClass: "FixedIncome", sector: null, region: "US", expenseRatioPct: 0.06 },
  { ticker: "TRMB", name: "Tanner Ridge Municipal Bond", kind: "Fund", assetClass: "FixedIncome", sector: null, region: "US", expenseRatioPct: 0.11 },
  { ticker: "ELSD", name: "Ellsworth Short Duration", kind: "Fund", assetClass: "FixedIncome", sector: null, region: "US", expenseRatioPct: 0.16 },
];

const CASH_SECURITY: SecuritySeed = {
  ticker: "MMKT", name: "Meridian Government Money Market", kind: "Cash", assetClass: "Cash", sector: null, region: "US", expenseRatioPct: 0.1,
};

export const SECURITIES: SecuritySeed[] = [
  ...EQUITY_FUNDS,
  ...EQUITY_STOCKS,
  ...FIXED_INCOME_FUNDS,
  CASH_SECURITY,
];

type PositionSeed = { ticker: string; marketValueCents: number; costBasisCents: number };

// ---------------------------------------------------------------------------
// Accounts.
//
// The tax treatment is the point of the layer: it is what makes a dollar
// of bond fund in an IRA a different thing from the same dollar in a
// brokerage account, and it is what lets the Tax section say "unrealised
// losses in taxable accounts" and mean it.
type AccountKind =
  | "Taxable"
  | "TraditionalIRA"
  | "RothIRA"
  | "Retirement401k"
  | "Trust"
  | "Education529";

const TAX_TREATMENT: Record<AccountKind, "Taxable" | "TaxDeferred" | "TaxFree"> = {
  Taxable: "Taxable",
  Trust: "Taxable",
  TraditionalIRA: "TaxDeferred",
  Retirement401k: "TaxDeferred",
  RothIRA: "TaxFree",
  Education529: "TaxFree",
};

const ACCOUNT_LABEL: Record<AccountKind, string> = {
  Taxable: "brokerage",
  Trust: "revocable trust",
  TraditionalIRA: "Traditional IRA",
  Retirement401k: "401(k)",
  RothIRA: "Roth IRA",
  Education529: "529 plan",
};

// Fictional custodians, like everything else here (CLAUDE.md §13).
const CUSTODIANS = ["Harborline Trust", "Redfern Custody", "Kestrel Clearing"];

type AccountSeed = {
  name: string;
  kind: AccountKind;
  taxTreatment: string;
  custodian: string;
  ownerName: string | null;
  openedYear: number;
  sortOrder: number;
  weight: number;
  positions: PositionSeed[];
};

/** Decreasing weights summing to 1 — a portfolio has a core and a tail,
 * not N equal slices. */
function decreasingWeights(count: number, rand: () => number): number[] {
  const raw = Array.from({ length: count }, (_, i) => count - i + rand());
  const total = raw.reduce((a, b) => a + b, 0);
  return raw.map((w) => w / total);
}

/** Splits cents by weight with the remainder pushed onto the largest
 * slice, so the parts add up to the whole exactly. Without this the
 * percentages derived back off the positions drift from the household's
 * stated allocation by a cent's worth of rounding per holding. */
function allocateCents(totalCents: number, weights: number[]): number[] {
  const parts = weights.map((w) => Math.round(totalCents * w));
  const drift = totalCents - parts.reduce((a, b) => a + b, 0);
  if (parts.length > 0) parts[0] = parts[0]! + drift;
  return parts;
}

/**
 * The accounts a household holds, before anything is put in them.
 *
 * Everyone has a brokerage account. Most working households have a
 * tax-deferred account each; a Roth and a 401(k) show up often enough to
 * be worth modelling, a trust on the larger households, and a 529 only
 * where there is a dependent to spend it on — an education account for a
 * childless couple would be a fact about them that isn't true.
 */
function buildAccounts(
  h: HouseholdSeed,
  index: number,
  rand: () => number,
): Omit<AccountSeed, "positions">[] {
  const planners = h.members.filter((m) => m.role !== "Dependent");
  const primary = planners[0]?.name ?? null;
  const spouse = planners[1]?.name ?? null;
  const hasDependent = h.members.some((m) => m.role === "Dependent");
  const surname = h.name.replace(/^The\s+/i, "").split(" ")[0]!;
  const custodian = CUSTODIANS[index % CUSTODIANS.length]!;
  const openedBase = h.clientSinceYear;

  const accounts: Omit<AccountSeed, "positions">[] = [];
  const add = (
    kind: AccountKind,
    ownerName: string | null,
    weight: number,
    openedOffset: number,
  ) => {
    const who = ownerName ? ownerName.split(" ")[0]! : spouse ? "Joint" : surname;
    accounts.push({
      name: `${who} ${ACCOUNT_LABEL[kind]}`,
      kind,
      taxTreatment: TAX_TREATMENT[kind],
      custodian,
      ownerName,
      openedYear: openedBase + openedOffset,
      sortOrder: accounts.length,
      weight,
    });
  };

  add("Taxable", spouse ? null : primary, 1.6 + rand(), 0);
  if (primary) add("TraditionalIRA", primary, 1 + rand() * 0.8, 1);
  if (spouse && rand() < 0.75) add("TraditionalIRA", spouse, 0.6 + rand() * 0.6, 1);
  if (rand() < 0.55) add("RothIRA", primary, 0.3 + rand() * 0.4, 2);
  if (rand() < 0.45) add("Retirement401k", primary, 0.7 + rand() * 0.8, 1);
  if (h.segment === "Founding" && rand() < 0.7) add("Trust", null, 0.8 + rand() * 0.9, 3);
  if (hasDependent && rand() < 0.8) add("Education529", null, 0.15 + rand() * 0.2, 2);

  return accounts;
}

/** How willingly a tax treatment takes each asset class.
 *
 * Shaping only. Putting income-producing assets where income is not taxed
 * each year is a real and widely-used idea, but this table is not advice
 * and the app does not claim the arrangement is right for anyone — it is
 * here so the seeded book looks like a book an advisor has worked on
 * rather than a uniform smear, and so the asset-location readout has
 * something to show. */
const LOCATION_PREFERENCE: Record<string, Record<string, number>> = {
  Equity: { Taxable: 1.35, TaxDeferred: 0.75, TaxFree: 1.2 },
  FixedIncome: { Taxable: 0.5, TaxDeferred: 1.6, TaxFree: 0.6 },
  Cash: { Taxable: 1.8, TaxDeferred: 0.4, TaxFree: 0.3 },
};

/**
 * Builds a household's positions from the allocation it already has, then
 * spreads each one over the accounts that would plausibly hold it.
 *
 * The percentages come first and the holdings are cut to fit them, which
 * is the only way the two can agree: the sleeves are sized off
 * `equityActualPct` / `fixedIncomeActualPct` with cash taking the
 * remainder, so re-deriving the mix from the positions reproduces the
 * stored figures rather than contradicting them on the same page. Adding
 * accounts underneath does not disturb that — a security's total is split
 * across accounts, never changed.
 */
function buildPositions(
  portfolioCents: number,
  equityPct: number,
  fixedIncomePct: number,
  index: number,
  rand: () => number,
): PositionSeed[] {
  if (portfolioCents <= 0) return [];

  const equityCents = Math.round(portfolioCents * (equityPct / 100));
  const fixedIncomeCents = Math.round(portfolioCents * (fixedIncomePct / 100));
  const cashCents = portfolioCents - equityCents - fixedIncomeCents;

  const positions: PositionSeed[] = [];

  // Cost basis: most positions are up, some are down. The losers are the
  // ones the Tax section's harvesting story needs to exist.
  const withBasis = (ticker: string, marketValueCents: number): PositionSeed => {
    const gain = -0.12 + rand() * 0.55;
    return {
      ticker,
      marketValueCents,
      costBasisCents: Math.max(1, Math.round(marketValueCents / (1 + gain))),
    };
  };

  // Equities: a fund core, then single names. Every household starts from
  // a different fund so the Markets watchlist isn't forty rows of one
  // ticker.
  const fundCount = 2 + Math.floor(rand() * 2);
  const stockCount = 3 + Math.floor(rand() * 4);
  const funds = Array.from(
    { length: fundCount },
    (_, i) => EQUITY_FUNDS[(index + i) % EQUITY_FUNDS.length]!,
  );
  const stocks = Array.from(
    { length: stockCount },
    (_, i) => EQUITY_STOCKS[(index * 3 + i) % EQUITY_STOCKS.length]!,
  );

  // Roughly one household in three carries a position large enough to be
  // a conversation — an exercised grant, an inheritance never sold. It is
  // what gives the concentration bar something to mark.
  const concentrated = rand() < 0.35;
  const coreShare = concentrated ? 0.45 + rand() * 0.1 : 0.62 + rand() * 0.16;

  const coreCents = Math.round(equityCents * coreShare);
  const satelliteCents = equityCents - coreCents;

  for (const [i, cents] of allocateCents(coreCents, decreasingWeights(funds.length, rand)).entries()) {
    positions.push(withBasis(funds[i]!.ticker, cents));
  }

  const stockWeights = decreasingWeights(stocks.length, rand);
  if (concentrated) {
    // Push the first single name well clear of the rest, then renormalise.
    stockWeights[0] = stockWeights[0]! + 0.9;
    const total = stockWeights.reduce((a, b) => a + b, 0);
    for (let i = 0; i < stockWeights.length; i++) stockWeights[i] = stockWeights[i]! / total;
  }
  for (const [i, cents] of allocateCents(satelliteCents, stockWeights).entries()) {
    positions.push(withBasis(stocks[i]!.ticker, cents));
  }

  const bondCount = 1 + Math.floor(rand() * 3);
  const bonds = Array.from(
    { length: bondCount },
    (_, i) => FIXED_INCOME_FUNDS[(index + i) % FIXED_INCOME_FUNDS.length]!,
  );
  for (const [i, cents] of allocateCents(fixedIncomeCents, decreasingWeights(bonds.length, rand)).entries()) {
    positions.push(withBasis(bonds[i]!.ticker, cents));
  }

  if (cashCents > 0) {
    // Cash is held at par; there is no gain to have on it.
    positions.push({ ticker: CASH_SECURITY.ticker, marketValueCents: cashCents, costBasisCents: cashCents });
  }

  // One row per security: a household drawn the same fund twice holds one
  // position in it.
  const merged = new Map<string, PositionSeed>();
  for (const p of positions) {
    const existing = merged.get(p.ticker);
    if (existing) {
      existing.marketValueCents += p.marketValueCents;
      existing.costBasisCents += p.costBasisCents;
    } else {
      merged.set(p.ticker, { ...p });
    }
  }
  return [...merged.values()].filter((p) => p.marketValueCents > 0);
}

/**
 * Puts each security into accounts.
 *
 * A security's total is split, never altered, so the household's asset
 * mix is exactly what `buildPositions` produced however the accounts fall
 * out. Each security lands in one or two accounts, chosen by account size
 * weighted by how willingly that tax treatment takes the asset class —
 * enough to make the asset-location readout show something other than an
 * even smear, without pretending the arrangement is optimal.
 */
function placePositionsInAccounts(
  accounts: Omit<AccountSeed, "positions">[],
  positions: PositionSeed[],
  rand: () => number,
): AccountSeed[] {
  const filled: AccountSeed[] = accounts.map((a) => ({ ...a, positions: [] }));
  if (filled.length === 0) return filled;

  // Every account gets something before any account gets a second thing.
  // Without this the small ones — a Roth, a 529 — lose every weighted
  // draw and are dropped as empty, which quietly throws away the fact
  // that the household has one: 55% of households were given a Roth and
  // two of forty kept it.
  const placed = new Set<string>();
  const order = [...filled.keys()].sort((a, b) => filled[b]!.weight - filled[a]!.weight);
  for (const accountIndex of order) {
    const account = filled[accountIndex]!;
    const preference = (ticker: string) =>
      LOCATION_PREFERENCE[SECURITY_BY_TICKER.get(ticker)!.assetClass]?.[account.taxTreatment] ?? 1;
    const pick = positions
      .filter((p) => !placed.has(p.ticker))
      .sort((a, b) => preference(b.ticker) * b.marketValueCents - preference(a.ticker) * a.marketValueCents)[0];
    if (!pick) break;
    placed.add(pick.ticker);
    account.positions.push({ ...pick });
  }

  for (const position of positions) {
    if (placed.has(position.ticker)) continue;
    const assetClass = SECURITY_BY_TICKER.get(position.ticker)!.assetClass;
    const preference = LOCATION_PREFERENCE[assetClass] ?? {};

    const scored = filled
      .map((account, i) => ({
        i,
        score: account.weight * (preference[account.taxTreatment] ?? 1) * (0.7 + rand() * 0.6),
      }))
      .sort((a, b) => b.score - a.score);

    // One account usually, two when the position is big enough to have
    // been bought in more than one place.
    const spread = scored.length > 1 && rand() < 0.4 ? 2 : 1;
    const chosen = scored.slice(0, spread);
    const shares = decreasingWeights(chosen.length, rand);
    const values = allocateCents(position.marketValueCents, shares);
    const bases = allocateCents(position.costBasisCents, shares);

    for (const [k, target] of chosen.entries()) {
      if (values[k]! <= 0) continue;
      filled[target.i]!.positions.push({
        ticker: position.ticker,
        marketValueCents: values[k]!,
        costBasisCents: bases[k]!,
      });
    }
  }

  // Merge any security that landed in one account twice, and drop an
  // account nothing was put into rather than showing an empty statement.
  for (const account of filled) {
    const merged = new Map<string, PositionSeed>();
    for (const p of account.positions) {
      const existing = merged.get(p.ticker);
      if (existing) {
        existing.marketValueCents += p.marketValueCents;
        existing.costBasisCents += p.costBasisCents;
      } else {
        merged.set(p.ticker, { ...p });
      }
    }
    account.positions = [...merged.values()];
  }

  return filled.filter((a) => a.positions.length > 0);
}

const SECURITY_BY_TICKER = new Map(SECURITIES.map((s) => [s.ticker, s]));

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

  // The positions come from the allocation, and then every figure the
  // Allocation section states about holdings comes back off the positions.
  // These used to be four independent random numbers — "41 distinct
  // holdings", a top holding picked round-robin, an expense ratio from
  // thin air — which was harmless only while there was no holdings table
  // to contradict them.
  const positions = buildPositions(investmentAccountsCents, equityActual, fixedIncomeActual, index, rand);
  const portfolioCents = positions.reduce((sum, p) => sum + p.marketValueCents, 0);
  const largest = positions.reduce<(typeof positions)[number] | null>(
    (max, p) => (max === null || p.marketValueCents > max.marketValueCents ? p : max),
    null,
  );
  const largestSecurity = largest ? SECURITY_BY_TICKER.get(largest.ticker)! : null;
  const blendedExpenseRatioPct =
    portfolioCents === 0
      ? 0
      : Math.round(
          (positions.reduce(
            (sum, p) => sum + SECURITY_BY_TICKER.get(p.ticker)!.expenseRatioPct * p.marketValueCents,
            0,
          ) /
            portfolioCents) *
            100,
        ) / 100;

  // Where each of those positions is actually held (CLAUDE.md §10's
  // Household -> Account -> Position spine). Splitting a security across
  // accounts never changes its total, so the household's asset mix is
  // exactly what buildPositions produced however the accounts fall out.
  const accounts = placePositionsInAccounts(buildAccounts(h, index, rand), positions, rand);

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
      horizonLabel: g.horizon,
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
  // Both figures are about *taxable* accounts, which is a claim the app
  // could not previously check: they were a fraction of the portfolio
  // picked at random. Now they are the gains and losses sitting in the
  // accounts whose tax treatment is Taxable, and a loss inside an IRA —
  // which is not the same kind of thing at all — is correctly left out.
  const taxablePositions = accounts
    .filter((a) => a.taxTreatment === "Taxable")
    .flatMap((a) => a.positions);
  const unrealizedGainsCents = taxablePositions.reduce(
    (sum, p) => sum + Math.max(0, p.marketValueCents - p.costBasisCents),
    0,
  );
  const harvestableLossesCents = taxablePositions.reduce(
    (sum, p) => sum + Math.max(0, p.costBasisCents - p.marketValueCents),
    0,
  );

  // How many open tasks this household's worklist starts with. Not stored
  // on the household — the Task rows are the count (D-034).
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
    accounts,
    // Share of the whole portfolio, which is what a concentration figure
    // means; the section used to quote it as a share of equities, which
    // made it incomparable with the threshold an advisor actually sets.
    topHoldingName: largestSecurity?.name ?? "\u2014",
    topHoldingTicker: largestSecurity?.ticker ?? "\u2014",
    topHoldingPct:
      largest && portfolioCents > 0
        ? Math.round((largest.marketValueCents / portfolioCents) * 1000) / 10
        : 0,
    distinctHoldings: positions.length,
    blendedExpenseRatioPct,
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

/** A fictional date of birth that agrees with the member's stated age as of
 * seed time. Deterministic per member name, so reseeding doesn't shuffle
 * birthdays. Deliberately spread across the year rather than clustered, so
 * "next birthday" is a useful signal on some households and not others. */
function birthDateFor(name: string, age: number, now: Date): Date {
  const rand = mulberry32(hashCode(`dob:${name}`));
  const dayOfYear = 1 + Math.floor(rand() * 364);
  const thisYear = now.getUTCFullYear();
  const thisYearBirthday = new Date(Date.UTC(thisYear, 0, dayOfYear));
  // If the birthday has already happened this year, they turned `age` this
  // year; otherwise they turn it later this year and were born a year earlier.
  const birthYear = thisYearBirthday.getTime() <= now.getTime() ? thisYear - age : thisYear - age - 1;
  return new Date(Date.UTC(birthYear, thisYearBirthday.getUTCMonth(), thisYearBirthday.getUTCDate()));
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
  advisor: AdvisorKey;
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
  // Enough pipeline to match a forty-household book: a funnel with one
  // prospect per stage reads as a diagram rather than a practice.
  { name: "Thibodeaux Household", source: "Referral: Tanaka Household", estValue: 3_400_000, stage: "Discovery", daysInStage: 8, advisor: "theo" },
  { name: "Aaltonen Family", source: "Seminar attendee", estValue: 1_450_000, stage: "Inquiry", daysInStage: 12, advisor: "ines" },
  { name: "Варна Holdings Trust", source: "COI: estate attorney", estValue: 6_900_000, stage: "Proposal", daysInStage: 19, advisor: "theo" },
  { name: "Mbeki–Strand Household", source: "Referral: Ogundele Household", estValue: 2_750_000, stage: "Discovery", daysInStage: 31, stalled: true, advisor: "ines" },
  { name: "Quiñones Family", source: "Web inquiry", estValue: 890_000, stage: "Inquiry", daysInStage: 2, advisor: "maya" },
  { name: "Leclerc Household", source: "Referral: Kowalski Household", estValue: 4_100_000, stage: "Agreement", daysInStage: 6, advisor: "theo" },
];

/** Watched indicators (M-demo item 3). Every one is a fixture and says so:
 * CLAUDE.md §13 forbids inventing tax thresholds or regulatory rules, and
 * the advisors this is demoed to would spot an invented bracket instantly.
 * The mechanism is the product — a real feed replaces `sourceLabel`, not
 * the engine. */
const INDICATORS: {
  key: string;
  name: string;
  category: string;
  unit: string;
  value: number;
  previousValue: number | null;
  watchedBy: AdvisorKey[];
  threshold: number;
}[] = [
  {
    key: "fed_funds_rate",
    name: "Short-term policy rate",
    category: "Rates",
    unit: "%",
    value: 4.25,
    previousValue: 4.5,
    watchedBy: ["dana", "maya", "theo", "ines"],
    threshold: 0.25,
  },
  {
    key: "treasury_10y",
    name: "10-year Treasury yield",
    category: "Rates",
    unit: "%",
    value: 4.12,
    previousValue: 4.05,
    watchedBy: ["dana", "theo"],
    threshold: 0.2,
  },
  {
    key: "mortgage_30y",
    name: "30-year mortgage rate",
    category: "Rates",
    unit: "%",
    value: 6.4,
    previousValue: 6.55,
    watchedBy: ["dana", "ines"],
    threshold: 0.25,
  },
  {
    key: "equity_drawdown",
    name: "US equity drawdown from high",
    category: "Market",
    unit: "%",
    value: -3.2,
    previousValue: -1.1,
    watchedBy: ["dana", "maya", "theo"],
    threshold: 5,
  },
  {
    key: "equity_ytd",
    name: "US equity index, year to date",
    category: "Market",
    unit: "%",
    value: 7.4,
    previousValue: 9.1,
    watchedBy: ["maya"],
    threshold: 5,
  },
  {
    key: "rmd_age",
    name: "Required distribution age (scenario)",
    category: "Policy",
    unit: "age",
    value: 73,
    previousValue: null,
    watchedBy: ["dana", "maya"],
    threshold: 1,
  },
  {
    key: "estate_exclusion",
    name: "Estate transfer threshold (scenario)",
    category: "Tax",
    unit: "USD",
    value: 13_000_000,
    previousValue: null,
    watchedBy: ["dana", "theo"],
    threshold: 500_000,
  },
  {
    key: "bracket_edge",
    name: "Upper bracket edge (scenario)",
    category: "Tax",
    unit: "USD",
    value: 250_000,
    previousValue: null,
    watchedBy: ["maya", "ines"],
    threshold: 5_000,
  },
];

// ── Meetings and tasks (D-034) ───────────────────────────────────────────────
// The calendar and worklist the assistant will read and, after
// confirmation, write. Seeded to agree with what the rest of the record
// already says: a household whose review is "scheduled" has that review on
// the calendar; one whose review is "due" or "overdue" has nothing booked,
// which is exactly the gap a proactive assistant should find. The held
// check-in and the completed task each mirror an ActivityEvent the timeline
// already shows, on the same date, so the two never disagree.

type AgendaMeeting = {
  kind: string;
  title: string;
  startsAt: Date;
  endsAt: Date;
  location: string | null;
  status: "confirmed" | "held";
  notes: string | null;
};
type AgendaTask = {
  title: string;
  detail: string | null;
  dueAt: Date | null;
  priority: "high" | "normal" | "low";
  status: "open" | "done";
  completedAt: Date | null;
};

const DAY_MS = 24 * 60 * 60 * 1000;

/** Each advisor keeps different hours. This is a fixture, but a
 * deliberately regular one: the habit inference planned for M-assist needs
 * something true to find ("you book reviews on Tuesdays and Thursdays"),
 * and four advisors with identical calendars would make it find nothing. */
const ADVISOR_HOURS: Record<AdvisorKey, { weekdays: number[]; startHours: number[] }> = {
  dana: { weekdays: [2, 3, 4], startHours: [10, 11, 14] },
  maya: { weekdays: [1, 2, 3, 4], startHours: [9, 13, 15] },
  theo: { weekdays: [2, 3, 4, 5], startHours: [9.5, 11.5, 14.5] },
  ines: { weekdays: [1, 3, 5], startHours: [10, 14] },
};

/** Move a date onto a day the advisor works, within three days either side
 * so a Friday review date is as likely to land on the Thursday before as the
 * Tuesday after, and onto one of their usual start times. UTC throughout —
 * see the Meeting model comment. `anyWeekday` relaxes the day preference: a
 * habit is a tendency, not a rule, and check-ins happen off-pattern. */
function onAdvisorSlot(
  date: Date,
  advisor: AdvisorKey,
  rand: () => number,
  durationMin: number,
  anyWeekday = false,
) {
  const hours = ADVISOR_HOURS[advisor];
  const day0 = new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()));
  const allowed = anyWeekday ? [1, 2, 3, 4, 5] : hours.weekdays;
  const candidates: Date[] = [];
  for (const offset of [0, 1, -1, 2, -2, 3, -3]) {
    const d = new Date(day0.getTime() + offset * DAY_MS);
    if (allowed.includes(d.getUTCDay())) candidates.push(d);
  }
  const d = candidates[Math.floor(rand() * candidates.length)]!;
  const startHour = hours.startHours[Math.floor(rand() * hours.startHours.length)]!;
  const startsAt = new Date(d.getTime() + startHour * 60 * 60 * 1000);
  return { startsAt, endsAt: new Date(startsAt.getTime() + durationMin * 60 * 1000) };
}

/** Today if it is a weekday, otherwise the Monday after. */
function nextWeekday(from: number): Date {
  const d = new Date(Date.UTC(new Date(from).getUTCFullYear(), new Date(from).getUTCMonth(), new Date(from).getUTCDate()));
  while (d.getUTCDay() === 0 || d.getUTCDay() === 6) d.setUTCDate(d.getUTCDate() + 1);
  return d;
}

const LOCATIONS = ["Video", "Office", "Phone"];

const HOUSEHOLD_TASK_TEMPLATES: { title: string; detail: string | null; priority: AgendaTask["priority"] }[] = [
  { title: "Send updated IPS for signature", detail: "Target allocation changed at the last review; the signed copy on file predates it.", priority: "high" },
  { title: "Request updated beneficiary form for the IRA", detail: null, priority: "normal" },
  { title: "Chase the held-away 401(k) statement", detail: "Last statement on file is two quarters old.", priority: "normal" },
  { title: "Confirm this year's Roth conversion amount", detail: "Needs the household's decision before year end.", priority: "high" },
  { title: "Collect the renewed umbrella policy declaration", detail: null, priority: "low" },
  { title: "Follow up on the 529 contribution", detail: "Household said they would fund it after the bonus lands.", priority: "normal" },
  { title: "Introduce the estate attorney", detail: "Household asked for a referral at the last check-in.", priority: "normal" },
  { title: "Review rebalancing trades toward target", detail: null, priority: "normal" },
];

const FIRST_IN_BOOK = new Map<AdvisorKey, string>();
for (const h of HOUSEHOLDS) if (!FIRST_IN_BOOK.has(h.advisor)) FIRST_IN_BOOK.set(h.advisor, h.name);

function buildHouseholdAgenda(
  h: HouseholdSeed,
  openTasksCount: number,
  activityEvents: { kind: string; label: string; detail: string | null; occurredAt: Date }[],
): { meetings: AgendaMeeting[]; tasks: AgendaTask[] } {
  const rand = mulberry32(hashCode(`agenda:${h.name}`));
  const pick = <T,>(items: T[]) => items[Math.floor(rand() * items.length)]!;
  const now = Date.now();
  const meetings: AgendaMeeting[] = [];
  const tasks: AgendaTask[] = [];

  // The scheduled review, on the date the household record already carries.
  if (h.reviewStatus === "scheduled") {
    const slot = onAdvisorSlot(new Date(h.nextReviewDate), h.advisor, rand, 60);
    meetings.push({
      kind: "Review",
      title: `${h.name} — ${h.segment === "Core" ? "annual" : "quarterly"} review`,
      ...slot,
      location: pick(LOCATIONS),
      status: slot.startsAt.getTime() < now ? "held" : "confirmed",
      notes: null,
    });
  }

  // The check-in the Activity timeline already records, as a held meeting.
  const heldCheckIn = activityEvents.find((e) => e.kind === "Meeting");
  if (heldCheckIn) {
    const start = new Date(heldCheckIn.occurredAt);
    meetings.push({
      kind: "Check-in",
      title: `${h.name} — check-in call`,
      startsAt: start,
      endsAt: new Date(start.getTime() + 30 * 60 * 1000),
      location: "Phone",
      status: "held",
      notes: heldCheckIn.detail,
    });
  }

  // Roughly a quarter of the book has something else booked in the next
  // ten days, so Today's agenda has a meeting or two on most days. The
  // first household in each advisor's book is booked for the next working
  // day regardless, so the agenda is never empty on the morning of a demo
  // — off-pattern, because that is what a same-week check-in is.
  const guaranteed = FIRST_IN_BOOK.get(h.advisor) === h.name;
  if (guaranteed || rand() < 0.25) {
    const slot = guaranteed
      ? (() => {
          const hours = ADVISOR_HOURS[h.advisor];
          const startsAt = new Date(nextWeekday(now).getTime() + hours.startHours[0]! * 60 * 60 * 1000);
          return { startsAt, endsAt: new Date(startsAt.getTime() + 45 * 60 * 1000) };
        })()
      : onAdvisorSlot(new Date(now + Math.floor(rand() * 10) * DAY_MS), h.advisor, rand, 45, true);
    const kind = rand() < 0.5 ? "Planning" : "Check-in";
    meetings.push({
      kind,
      title: `${h.name} — ${kind === "Planning" ? "planning session" : "check-in call"}`,
      ...slot,
      location: pick(LOCATIONS),
      status: slot.startsAt.getTime() < now ? "held" : "confirmed",
      notes: null,
    });
  }

  // Exactly openTasksCount open tasks; the Activity page counts these rows.
  const templates = [...HOUSEHOLD_TASK_TEMPLATES].sort(() => rand() - 0.5).slice(0, openTasksCount);
  for (const t of templates) {
    const hasDue = rand() < 0.75;
    const dueInDays = Math.round(-12 + rand() * 33); // -12 … +21
    tasks.push({
      title: t.title,
      detail: t.detail,
      dueAt: hasDue ? new Date(now + dueInDays * DAY_MS) : null,
      priority: hasDue && dueInDays < 0 ? "high" : t.priority,
      status: "open",
      completedAt: null,
    });
  }

  // The completed task the Activity timeline already records.
  const done = activityEvents.find((e) => e.kind === "TaskCompleted");
  if (done) {
    tasks.push({
      title: done.label,
      detail: null,
      dueAt: done.occurredAt,
      priority: "normal",
      status: "done",
      completedAt: done.occurredAt,
    });
  }

  return { meetings, tasks };
}

function buildProspectAgenda(p: (typeof PROSPECTS)[number]): { meetings: AgendaMeeting[]; tasks: AgendaTask[] } {
  const rand = mulberry32(hashCode(`agenda:${p.name}`));
  const now = Date.now();
  const meetings: AgendaMeeting[] = [];
  const tasks: AgendaTask[] = [];
  const inDays = (lo: number, hi: number) => new Date(now + (lo + Math.floor(rand() * (hi - lo + 1))) * DAY_MS);

  if (p.stalled) {
    // Nothing booked, and the follow-up that should have happened is late —
    // the shape of a stalled prospect, not a label saying so.
    tasks.push({
      title: `Follow up with ${p.name}`,
      detail: `No reply in ${p.daysInStage} days at ${p.stage}.`,
      dueAt: new Date(now - Math.max(1, p.daysInStage - 14) * DAY_MS),
      priority: "high",
      status: "open",
      completedAt: null,
    });
    return { meetings, tasks };
  }

  switch (p.stage) {
    case "Inquiry":
      tasks.push({
        title: `Return ${p.name}'s inquiry`,
        detail: `Came in via ${p.source.toLowerCase()}. Offer an intro call.`,
        dueAt: p.daysInStage > 5 ? new Date(now - (p.daysInStage - 5) * DAY_MS) : inDays(1, 2),
        priority: p.daysInStage > 5 ? "high" : "normal",
        status: "open",
        completedAt: null,
      });
      break;
    case "Discovery": {
      const slot = onAdvisorSlot(inDays(1, 7), p.advisor, rand, 60);
      meetings.push({ kind: "Discovery", title: `${p.name} — discovery meeting`, ...slot, location: "Video", status: "confirmed", notes: null });
      tasks.push({
        title: `Prepare the discovery agenda for ${p.name}`,
        detail: null,
        dueAt: new Date(slot.startsAt.getTime() - DAY_MS),
        priority: "normal",
        status: "open",
        completedAt: null,
      });
      break;
    }
    case "Proposal": {
      const slot = onAdvisorSlot(inDays(2, 9), p.advisor, rand, 45);
      meetings.push({ kind: "Proposal", title: `${p.name} — proposal walkthrough`, ...slot, location: "Office", status: "confirmed", notes: null });
      tasks.push({
        title: `Send the proposal to ${p.name}`,
        detail: "Ahead of the walkthrough, so they can read it first.",
        dueAt: new Date(slot.startsAt.getTime() - 2 * DAY_MS),
        priority: "high",
        status: "open",
        completedAt: null,
      });
      break;
    }
    case "Agreement": {
      const slot = onAdvisorSlot(inDays(1, 5), p.advisor, rand, 30);
      meetings.push({ kind: "Signing", title: `${p.name} — agreement signing`, ...slot, location: "Office", status: "confirmed", notes: null });
      break;
    }
  }
  return { meetings, tasks };
}

async function main() {
  // Runtime artifacts go too, so seeding is a true reset: a demo that
  // opens with the previous demo's chat transcript still in the dock, or
  // its dragged-about widget layout, is not the demo that was rehearsed.
  await prisma.aiConversation.deleteMany();
  await prisma.meeting.deleteMany();
  await prisma.task.deleteMany();
  await prisma.dashboardLayout.deleteMany();
  await prisma.alert.deleteMany();
  await prisma.indicatorChange.deleteMany();
  await prisma.indicatorWatch.deleteMany();
  await prisma.indicator.deleteMany();
  await prisma.insight.deleteMany();
  await prisma.position.deleteMany();
  await prisma.account.deleteMany();
  await prisma.security.deleteMany();
  await prisma.goal.deleteMany();
  await prisma.member.deleteMany();
  await prisma.prospect.deleteMany();
  await prisma.household.deleteMany();
  await prisma.advisor.deleteMany();

  // Four advisors for forty households — CLAUDE.md §1's practice is
  // solo-to-ten people carrying 60-400 households, so ten each is a
  // plausible load and keeps the Insights capacity bars meaningful rather
  // than pinned at 300%.
  const dana = await prisma.advisor.create({
    data: { name: "Dana Whitfield", initials: "DW", capacityTarget: 12 },
  });
  const maya = await prisma.advisor.create({
    data: { name: "Maya Reyes", initials: "MR", capacityTarget: 10 },
  });
  const theo = await prisma.advisor.create({
    data: { name: "Theo Lindgren", initials: "TL", capacityTarget: 11 },
  });
  const ines = await prisma.advisor.create({
    data: { name: "Inés Okonjo", initials: "IO", capacityTarget: 9 },
  });
  // Securities are shared across the book — forty households holding the
  // same index fund hold the same security, which is what lets the
  // Markets watchlist group by ticker and what Position's uniqueness
  // constraint assumes.
  const securityIdByTicker = new Map<string, string>();
  for (const sec of SECURITIES) {
    const created = await prisma.security.create({ data: sec });
    securityIdByTicker.set(sec.ticker, created.id);
  }

  const advisorId: Record<AdvisorKey, string> = {
    dana: dana.id,
    maya: maya.id,
    theo: theo.id,
    ines: ines.id,
  };

  let meetingCount = 0;
  let taskCount = 0;
  for (const [index, h] of HOUSEHOLDS.entries()) {
    const extra = deriveFinancials(h, index);
    const created = await prisma.household.create({
      data: {
        name: h.name,
        segment: h.segment,
        advisorId: advisorId[h.advisor],
        aumCents: big(centsFrom(h.aum)),
        netWorthCents: big(centsFrom(h.netWorth)),
        heldAwayCents: big(centsFrom(h.heldAway)),
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
        incomeCents: big(extra.incomeCents),
        taxesCents: big(extra.taxesCents),
        netIncomeCents: big(extra.netIncomeCents),
        spendingCents: big(extra.spendingCents),
        savingsCents: big(extra.savingsCents),
        savingsRatePct: extra.savingsRatePct,
        balanceStartCents: big(extra.balanceStartCents),
        balanceContributionsCents: big(extra.balanceContributionsCents),
        balanceGrowthCents: big(extra.balanceGrowthCents),
        balanceTaxesCents: big(extra.balanceTaxesCents),
        balanceSpendingCents: big(extra.balanceSpendingCents),
        investmentAccountsCents: big(extra.investmentAccountsCents),
        realEstateCents: big(extra.realEstateCents),
        cashCents: big(extra.cashCents),
        otherAssetsCents: big(extra.otherAssetsCents),
        mortgageCents: big(extra.mortgageCents),
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
        monthlySpendingNeedCents: big(extra.monthlySpendingNeedCents),
        withdrawalSequencing: extra.withdrawalSequencing,
        retirementSuccessDeltaPts: extra.retirementSuccessDeltaPts,
        filingStatus: extra.filingStatus,
        taxableIncomeCents: big(extra.taxableIncomeCents),
        effectiveRatePct: extra.effectiveRatePct,
        realizedGainsCents: big(extra.realizedGainsCents),
        unrealizedGainsCents: big(extra.unrealizedGainsCents),
        harvestableLossesCents: big(extra.harvestableLossesCents),
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
        members: {
          create: h.members.map((m) => ({ ...m, birthDate: birthDateFor(m.name, m.age, new Date()) })),
        },
        goals: { create: extra.goals },
        insights: { create: extra.insights },
        policies: { create: extra.policies },
        estateAssets: { create: extra.estateAssets },
        estateDocs: { create: extra.estateDocs },
        documents: { create: extra.documents },
        activityEvents: { create: extra.activityEvents },
        complianceItems: { create: extra.complianceItems },
        attestations: { create: extra.attestations },
        accounts: {
          create: extra.accounts.map((account) => ({
            name: account.name,
            kind: account.kind,
            taxTreatment: account.taxTreatment,
            custodian: account.custodian,
            openedYear: account.openedYear,
            sortOrder: account.sortOrder,
            positions: {
              create: account.positions.map((position) => ({
                securityId: securityIdByTicker.get(position.ticker)!,
                marketValueCents: big(position.marketValueCents),
                costBasisCents: big(position.costBasisCents),
              })),
            },
          })),
        },
      },
      select: { id: true, members: { select: { id: true, name: true } } },
    });

    // Owners are linked after the fact: members and accounts are created
    // in one nested write, so the member ids don't exist until it lands.
    // An account with no owner is joint or held by the household, which
    // is a fact about it rather than a gap.
    const memberIdByName = new Map(created.members.map((m) => [m.name, m.id]));
    const owned = extra.accounts.filter((a) => a.ownerName !== null);
    if (owned.length > 0) {
      const accountRows = await prisma.account.findMany({
        where: { householdId: created.id },
        select: { id: true, sortOrder: true },
      });
      const accountIdBySortOrder = new Map(accountRows.map((a) => [a.sortOrder, a.id]));
      for (const account of owned) {
        const accountId = accountIdBySortOrder.get(account.sortOrder);
        const ownerMemberId = memberIdByName.get(account.ownerName!);
        if (accountId && ownerMemberId) {
          await prisma.account.update({ where: { id: accountId }, data: { ownerMemberId } });
        }
      }
    }

    const agenda = buildHouseholdAgenda(h, extra.openTasksCount, extra.activityEvents);
    for (const m of agenda.meetings) {
      await prisma.meeting.create({ data: { ...m, advisorId: advisorId[h.advisor], householdId: created.id } });
    }
    for (const t of agenda.tasks) {
      await prisma.task.create({ data: { ...t, advisorId: advisorId[h.advisor], householdId: created.id } });
    }
    meetingCount += agenda.meetings.length;
    taskCount += agenda.tasks.length;
  }

  for (const p of PROSPECTS) {
    const prospect = await prisma.prospect.create({
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
    const agenda = buildProspectAgenda(p);
    for (const m of agenda.meetings) {
      await prisma.meeting.create({ data: { ...m, advisorId: advisorId[p.advisor], prospectId: prospect.id } });
    }
    for (const t of agenda.tasks) {
      await prisma.task.create({ data: { ...t, advisorId: advisorId[p.advisor], prospectId: prospect.id } });
    }
    meetingCount += agenda.meetings.length;
    taskCount += agenda.tasks.length;
  }

  for (const ind of INDICATORS) {
    const created = await prisma.indicator.create({
      data: {
        key: ind.key,
        name: ind.name,
        category: ind.category,
        unit: ind.unit,
        value: ind.value,
        previousValue: ind.previousValue,
        sourceLabel: "Simulated feed · demo fixture",
      },
    });
    for (const key of ind.watchedBy) {
      await prisma.indicatorWatch.create({
        data: { indicatorId: created.id, advisorId: advisorId[key], threshold: ind.threshold },
      });
    }
  }

  console.log(
    `Seeded ${HOUSEHOLDS.length} households, ${PROSPECTS.length} prospects, ${INDICATORS.length} watched indicators, ${meetingCount} meetings and ${taskCount} tasks.`,
  );
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
