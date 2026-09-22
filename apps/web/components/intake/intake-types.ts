import type { RiskAnswers } from "@/lib/calc/risk";

/** Shapes and option lists the intake steps share. Kept out of the wizard
 * so the member card and the goal rows don't import each other. */

export type MemberRow = {
  name: string;
  role: string;
  /** ISO yyyy-mm-dd from a date input. Age is derived, never typed — two
   * fields for one fact drift apart the moment a birthday passes. */
  birthDate: string;
  /** Digits only; formatted for display, masked until revealed. */
  ssn: string;
  occupation: string;
  annualIncome: string;
  annualExpenses: string;
  risk: RiskAnswers;
};

/** A position inside an account. Ticker and name are free text with the
 * firm's catalogue offered as suggestions: a client arrives holding what
 * they hold, and a picker that cannot express it would send the advisor
 * to a spreadsheet. */
export type HoldingRow = {
  ticker: string;
  name: string;
  /** Equity | FixedIncome | Cash — which sleeve it rolls up to. */
  assetClass: string;
  /** ETF | Fund | Stock | Cash */
  kind: string;
  marketValue: string;
  costBasis: string;
};

export type AccountRow = {
  name: string;
  /** Taxable | TraditionalIRA | RothIRA | Retirement401k | Trust | Education529 */
  kind: string;
  custodian: string;
  /** A member's name, or "" for joint and household-owned. */
  ownerName: string;
  holdings: HoldingRow[];
};

/** Property, carried with its own debt: a house worth $1.2M against an
 * $800K mortgage is a different household from one that owns it outright,
 * and a single net figure loses that. */
export type PropertyRow = {
  label: string;
  value: string;
  mortgage: string;
};

export type OtherAssetRow = {
  label: string;
  value: string;
};

export type GoalRow = {
  name: string;
  priority: string;
  horizon: string;
};

export const ROLES = ["Primary", "Spouse", "Dependent"];

/** Tax treatment follows from the kind, so it is derived rather than
 * asked: nobody filling in a form should have to tell the software that a
 * Roth is tax-free. */
export const ACCOUNT_KINDS = [
  { value: "Taxable", label: "Brokerage (taxable)", taxTreatment: "Taxable" },
  { value: "TraditionalIRA", label: "Traditional IRA", taxTreatment: "TaxDeferred" },
  { value: "RothIRA", label: "Roth IRA", taxTreatment: "TaxFree" },
  { value: "Retirement401k", label: "401(k)", taxTreatment: "TaxDeferred" },
  { value: "Trust", label: "Trust", taxTreatment: "Taxable" },
  { value: "Education529", label: "529 plan", taxTreatment: "TaxFree" },
];

export const ASSET_CLASSES = [
  { value: "Equity", label: "Equities" },
  { value: "FixedIncome", label: "Fixed income" },
  { value: "Cash", label: "Cash" },
];

export const SECURITY_KINDS = ["ETF", "Fund", "Stock", "Cash"];
export const PRIORITIES = ["Low", "Medium", "High"];

/** The goals an advisory practice sees most often. The first five match the
 * names the seeded households already use, so a goal picked here reads the
 * same as one already on a plan. "Other" keeps the free-text escape hatch —
 * a fixed list that can't express a real client's goal is worse than no
 * list. */
export const GOAL_OPTIONS = [
  "Retirement",
  "Education fund",
  "Second home",
  "Emergency reserve",
  "Legacy / charitable gift",
  "Debt payoff",
  "Business exit",
  "Major purchase",
  "Travel / sabbatical",
  "Long-term care reserve",
  "Other",
];

/** Bands rather than a target year: at intake a household knows "sometime
 * in the next few years" long before it knows a date, and a precise year
 * typed into a wizard is false precision that the Goals section would then
 * carry around. */
export const GOAL_HORIZONS = [
  "Under 3 years",
  "3–7 years",
  "7–15 years",
  "15+ years",
  "Ongoing",
];

export const emptyMember = (): MemberRow => ({
  name: "",
  role: "Primary",
  birthDate: "",
  ssn: "",
  occupation: "",
  annualIncome: "",
  annualExpenses: "",
  risk: {},
});

export const emptyGoal = (): GoalRow => ({ name: "", priority: "Medium", horizon: "7–15 years" });

export const emptyHolding = (): HoldingRow => ({
  ticker: "",
  name: "",
  assetClass: "Equity",
  kind: "ETF",
  marketValue: "",
  costBasis: "",
});

export const emptyAccount = (): AccountRow => ({
  name: "",
  kind: "Taxable",
  custodian: "",
  ownerName: "",
  holdings: [emptyHolding()],
});

export const emptyProperty = (): PropertyRow => ({ label: "", value: "", mortgage: "" });
export const emptyOtherAsset = (): OtherAssetRow => ({ label: "", value: "" });

export const INPUT_CLASS =
  "w-full rounded-control border border-rule bg-surface px-2.5 py-2 text-sm text-ink";

/** Age from a date of birth, for display beside the date input. */
export function ageFrom(birthDate: string, now: Date = new Date()): number | null {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(birthDate)) return null;
  const dob = new Date(`${birthDate}T00:00:00Z`);
  if (Number.isNaN(dob.getTime())) return null;

  let age = now.getUTCFullYear() - dob.getUTCFullYear();
  const hadBirthday =
    now.getUTCMonth() > dob.getUTCMonth() ||
    (now.getUTCMonth() === dob.getUTCMonth() && now.getUTCDate() >= dob.getUTCDate());
  if (!hadBirthday) age -= 1;
  return age >= 0 && age < 130 ? age : null;
}
