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
  assets: string;
  liabilities: string;
  risk: RiskAnswers;
};

export type GoalRow = {
  name: string;
  priority: string;
  horizon: string;
};

export const ROLES = ["Primary", "Spouse", "Dependent"];
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
  assets: "",
  liabilities: "",
  risk: {},
});

export const emptyGoal = (): GoalRow => ({ name: "", priority: "Medium", horizon: "7–15 years" });

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
