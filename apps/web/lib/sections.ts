/** The household record's sections, in nav order, and the one place that
 * knows where each one lives.
 *
 * Retirement, Tax, Protection and Estate sit *inside* Planning: they are
 * the four planning disciplines, and the scenario explorer that sits above
 * them works across all four. Their URLs moved with them, which is why
 * this file exists — the slug was previously repeated in the section nav,
 * the insight card, the AI tools, the signals rules and the Overview ring,
 * and four of those would have silently kept pointing at the old path. */

export type SectionKey =
  | "overview"
  | "household"
  | "cashflow"
  | "balance"
  | "allocation"
  | "goals"
  | "planning"
  | "compare"
  | "retirement"
  | "tax"
  | "protection"
  | "estate"
  | "documents"
  | "activity"
  | "compliance";

/** Path fragment under /clients/<id>/ — empty for the overview. */
const PATHS: Record<SectionKey, string> = {
  overview: "",
  household: "household",
  cashflow: "cashflow",
  balance: "balance",
  allocation: "allocation",
  goals: "goals",
  planning: "planning",
  compare: "planning/compare",
  retirement: "planning/retirement",
  tax: "planning/tax",
  protection: "planning/protection",
  estate: "planning/estate",
  documents: "documents",
  activity: "activity",
  compliance: "compliance",
};

export const SECTION_LABELS: Record<SectionKey, string> = {
  overview: "Overview",
  household: "Household",
  cashflow: "Cashflow",
  balance: "Balance",
  allocation: "Allocation",
  goals: "Goals",
  planning: "Planning",
  compare: "Compare",
  retirement: "Retirement",
  tax: "Tax",
  protection: "Protection",
  estate: "Estate",
  documents: "Documents",
  activity: "Activity",
  compliance: "Compliance",
};

/** What the left rail lists: Planning is one entry, and the four planning
 * disciplines are reached from inside it. */
export const NAV_SECTIONS: SectionKey[] = [
  "overview",
  "household",
  "cashflow",
  "balance",
  "allocation",
  "goals",
  "planning",
  "documents",
  "activity",
  "compliance",
];

/** The tabs inside Planning, scenario explorer first. */
export const PLANNING_SECTIONS: SectionKey[] = [
  "planning",
  "compare",
  "retirement",
  "tax",
  "protection",
  "estate",
];

export function sectionPath(householdId: string, section: SectionKey): string {
  const fragment = PATHS[section];
  return `/clients/${householdId}${fragment ? `/${fragment}` : ""}`;
}

/** Accepts the display names insights and alerts store ("Retirement") as
 * well as slugs ("retirement"), since both exist in the data. */
export function resolveSection(value: string): SectionKey | null {
  const key = value.trim().toLowerCase() as SectionKey;
  return key in PATHS ? key : null;
}

export function sectionPathFromName(householdId: string, value: string): string | null {
  const key = resolveSection(value);
  return key ? sectionPath(householdId, key) : null;
}
