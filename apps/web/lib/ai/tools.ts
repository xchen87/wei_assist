import type Anthropic from "@anthropic-ai/sdk";
import { prisma } from "@meridian/db";
import { formatMoney } from "@/lib/format/money";
import { formatPercent, formatSignedPercent } from "@/lib/format/percent";
import { formatDate } from "@/lib/format/date";

/** Tools are the only way the model touches data (CLAUDE.md §9) — there is
 * no free-form SQL, and nothing here takes a table or column name from the
 * model. Every read tool returns figures already rendered through
 * lib/format alongside a link to the record they came from, so the model
 * can satisfy §9 rules 1 and 2 by quoting what it was handed rather than
 * restating numbers in its own words.
 *
 * Two tools are proposals, not actions. Per §9 rule 3 anything with an
 * external effect is surfaced for the advisor to confirm in the UI; the
 * runtime never executes them, it returns a descriptor the chat dock
 * renders as a confirmation card. */

export type ToolEffect = "read" | "proposal";

export type ToolOutcome = {
  /** What goes back to the model as the tool_result. */
  payload: unknown;
  /** Ids of the records this call touched, for the audit log (§9 rule 5). */
  recordIds: string[];
  /** Present on proposal tools: what the UI should offer to confirm. */
  proposal?: Proposal;
};

export type Proposal =
  | { kind: "navigate"; path: string; label: string }
  | { kind: "dismissInsight"; insightId: string; text: string; householdId: string };

export type ToolDef = {
  name: string;
  effect: ToolEffect;
  definition: Anthropic.Tool;
  run: (input: Record<string, unknown>) => Promise<ToolOutcome>;
};

function str(input: Record<string, unknown>, key: string): string | undefined {
  const v = input[key];
  return typeof v === "string" && v.trim() ? v.trim() : undefined;
}
function num(input: Record<string, unknown>, key: string): number | undefined {
  const v = input[key];
  return typeof v === "number" && Number.isFinite(v) ? v : undefined;
}

const SECTIONS = [
  "overview",
  "household",
  "cashflow",
  "balance",
  "allocation",
  "goals",
  "retirement",
  "tax",
  "protection",
  "estate",
  "documents",
  "activity",
  "compliance",
] as const;
type Section = (typeof SECTIONS)[number];

// ---------------------------------------------------------------------------

const searchHouseholds: ToolDef = {
  name: "search_households",
  effect: "read",
  definition: {
    name: "search_households",
    description:
      "Find households in this advisor's book by name or by the filters the Clients list supports. Returns one compact row per household with its key figures and a link to its record. Use this first whenever a question names a household or asks 'which households ...'.",
    input_schema: {
      type: "object",
      properties: {
        query: { type: "string", description: "Match against household or member name." },
        review_status: { type: "string", enum: ["scheduled", "due", "overdue"] },
        segment: { type: "string", enum: ["Core", "Premier", "Founding"] },
        min_drift_pct: { type: "number", description: "Only households whose allocation drift is at or above this." },
        max_plan_health_pct: { type: "number", description: "Only households whose plan health is at or below this." },
        min_last_contact_days: { type: "number", description: "Only households not contacted in at least this many days." },
        limit: { type: "number", description: "Default 10, maximum 25." },
      },
      required: [],
    },
  },
  async run(input) {
    const query = str(input, "query");
    const limit = Math.min(Math.max(num(input, "limit") ?? 10, 1), 25);
    const households = await prisma.household.findMany({
      where: {
        ...(str(input, "review_status") ? { reviewStatus: str(input, "review_status") } : {}),
        ...(str(input, "segment") ? { segment: str(input, "segment") } : {}),
        ...(num(input, "min_drift_pct") !== undefined ? { driftPct: { gte: num(input, "min_drift_pct") } } : {}),
        ...(num(input, "max_plan_health_pct") !== undefined
          ? { planHealthPct: { lte: num(input, "max_plan_health_pct") } }
          : {}),
        ...(num(input, "min_last_contact_days") !== undefined
          ? { lastContactDays: { gte: num(input, "min_last_contact_days") } }
          : {}),
        ...(query
          ? {
              OR: [
                { name: { contains: query } },
                { members: { some: { name: { contains: query } } } },
              ],
            }
          : {}),
      },
      include: { advisor: { select: { name: true } }, members: { select: { name: true, role: true } } },
      orderBy: { aumCents: "desc" },
      take: limit,
    });

    return {
      recordIds: households.map((h) => h.id),
      payload: {
        count: households.length,
        households: households.map((h) => ({
          household_id: h.id,
          name: h.name,
          link: `/clients/${h.id}`,
          segment: h.segment,
          advisor: h.advisor.name,
          members: h.members.map((m) => `${m.name} (${m.role})`),
          aum: formatMoney(h.aumCents, { compact: true }),
          net_worth: formatMoney(h.netWorthCents, { compact: true }),
          ytd_return: formatSignedPercent(h.ytdReturnPct),
          cash: `${formatPercent(h.cashPct)} against a ${formatPercent(h.targetCashPct)} target`,
          drift: formatPercent(h.driftPct),
          plan_health: `${h.planHealthPct}%`,
          last_contact: `${h.lastContactDays} days ago`,
          next_review: formatDate(h.nextReviewDate),
          review_status: h.reviewStatus,
        })),
      },
    };
  },
};

const getHouseholdSection: ToolDef = {
  name: "get_household_section",
  effect: "read",
  definition: {
    name: "get_household_section",
    description:
      "Read one section of a household's plan — the same figures the section page shows, already formatted for display. Call this before making any claim about a household's finances. Sections: " +
      SECTIONS.join(", ") +
      ".",
    input_schema: {
      type: "object",
      properties: {
        household_id: { type: "string", description: "From search_households." },
        section: { type: "string", enum: [...SECTIONS] },
      },
      required: ["household_id", "section"],
    },
  },
  async run(input) {
    const householdId = str(input, "household_id");
    const section = str(input, "section") as Section | undefined;
    if (!householdId || !section || !SECTIONS.includes(section)) {
      return { payload: { error: "household_id and a valid section are required." }, recordIds: [] };
    }
    return readSection(householdId, section);
  },
};

const getHouseholdActivity: ToolDef = {
  name: "get_household_activity",
  effect: "read",
  definition: {
    name: "get_household_activity",
    description:
      "Recent meetings, notes, documents, completed tasks, and plan changes for one household, most recent first. Use for 'what happened since', 'when did we last speak', or meeting prep.",
    input_schema: {
      type: "object",
      properties: {
        household_id: { type: "string" },
        limit: { type: "number", description: "Default 8, maximum 20." },
      },
      required: ["household_id"],
    },
  },
  async run(input) {
    const householdId = str(input, "household_id");
    if (!householdId) return { payload: { error: "household_id is required." }, recordIds: [] };
    const limit = Math.min(Math.max(num(input, "limit") ?? 8, 1), 20);
    const events = await prisma.activityEvent.findMany({
      where: { householdId },
      orderBy: { occurredAt: "desc" },
      take: limit,
    });
    return {
      recordIds: events.map((e) => e.id),
      payload: {
        link: `/clients/${householdId}/activity`,
        events: events.map((e) => ({
          kind: e.kind,
          label: e.label,
          detail: e.detail,
          occurred: formatDate(e.occurredAt),
        })),
      },
    };
  },
};

const getOpenInsights: ToolDef = {
  name: "get_open_insights",
  effect: "read",
  definition: {
    name: "get_open_insights",
    description:
      "Open (undismissed) insights — the app's own surfaced observations, which are what the Tasks inbox lists. Filter by household or by section. Use for 'what needs attention'.",
    input_schema: {
      type: "object",
      properties: {
        household_id: { type: "string", description: "Omit to search the whole book." },
        section: { type: "string", description: "e.g. Allocation, Estate, Compliance." },
        limit: { type: "number", description: "Default 10, maximum 25." },
      },
      required: [],
    },
  },
  async run(input) {
    const limit = Math.min(Math.max(num(input, "limit") ?? 10, 1), 25);
    const insights = await prisma.insight.findMany({
      where: {
        dismissed: false,
        ...(str(input, "household_id") ? { householdId: str(input, "household_id") } : {}),
        ...(str(input, "section") ? { section: str(input, "section") } : {}),
      },
      include: { household: { select: { id: true, name: true } } },
      orderBy: { createdAt: "asc" },
      take: limit,
    });
    return {
      recordIds: insights.map((i) => i.id),
      payload: {
        count: insights.length,
        insights: insights.map((i) => ({
          insight_id: i.id,
          household: i.household.name,
          household_id: i.household.id,
          section: i.section,
          text: i.text,
          source: i.sourceLabel,
          link: `/clients/${i.household.id}/${sectionSlug(i.section)}`,
        })),
      },
    };
  },
};

const proposeNavigation: ToolDef = {
  name: "propose_navigation",
  effect: "proposal",
  definition: {
    name: "propose_navigation",
    description:
      "Offer the advisor a button that opens a record in the workspace. This does not navigate on its own — the advisor clicks it. Use it to hand off after answering, not instead of answering.",
    input_schema: {
      type: "object",
      properties: {
        path: { type: "string", description: "An in-app path such as /clients/<id>/allocation." },
        label: { type: "string", description: "What the button should say, e.g. 'Open Ramirez allocation'." },
      },
      required: ["path", "label"],
    },
  },
  async run(input) {
    const path = str(input, "path");
    const label = str(input, "label");
    if (!path || !path.startsWith("/") || !label) {
      return { payload: { error: "path must be an in-app path starting with / and label is required." }, recordIds: [] };
    }
    return {
      recordIds: [],
      proposal: { kind: "navigate", path, label },
      payload: { status: "Offered to the advisor as a button. Not navigated." },
    };
  },
};

const proposeDismissInsight: ToolDef = {
  name: "propose_dismiss_insight",
  effect: "proposal",
  definition: {
    name: "propose_dismiss_insight",
    description:
      "Propose dismissing one open insight. This does NOT dismiss it — the advisor sees a confirmation card and decides. Only propose this when the advisor has asked to clear or dismiss something specific.",
    input_schema: {
      type: "object",
      properties: {
        insight_id: { type: "string", description: "From get_open_insights." },
      },
      required: ["insight_id"],
    },
  },
  async run(input) {
    const insightId = str(input, "insight_id");
    if (!insightId) return { payload: { error: "insight_id is required." }, recordIds: [] };
    const insight = await prisma.insight.findUnique({
      where: { id: insightId },
      select: { id: true, text: true, dismissed: true, householdId: true },
    });
    if (!insight) return { payload: { error: "No insight with that id." }, recordIds: [] };
    if (insight.dismissed) {
      return { payload: { status: "That insight is already dismissed." }, recordIds: [insight.id] };
    }
    return {
      recordIds: [insight.id],
      proposal: { kind: "dismissInsight", insightId: insight.id, text: insight.text, householdId: insight.householdId },
      payload: { status: "Confirmation card shown to the advisor. Nothing has been dismissed yet." },
    };
  },
};

export const TOOLS: ToolDef[] = [
  searchHouseholds,
  getHouseholdSection,
  getHouseholdActivity,
  getOpenInsights,
  proposeNavigation,
  proposeDismissInsight,
];

export const TOOL_DEFINITIONS: Anthropic.Tool[] = TOOLS.map((t) => t.definition);

export function findTool(name: string): ToolDef | undefined {
  return TOOLS.find((t) => t.name === name);
}

/** Insight.section holds display names ("Allocation"); routes use slugs. */
function sectionSlug(section: string): string {
  const slug = section.toLowerCase();
  return slug === "overview" ? "" : slug;
}

// ---------------------------------------------------------------------------
// Section readers. Each returns display-ready strings plus the link to the
// page the advisor can verify them on.

async function readSection(householdId: string, section: Section): Promise<ToolOutcome> {
  const h = await prisma.household.findUnique({
    where: { id: householdId },
    include: {
      advisor: { select: { name: true } },
      members: true,
      goals: true,
      policies: true,
      estateAssets: { orderBy: { sortOrder: "asc" } },
      estateDocs: { orderBy: { sortOrder: "asc" } },
      documents: true,
      complianceItems: { orderBy: { sortOrder: "asc" } },
      attestations: { orderBy: { occurredAt: "desc" } },
    },
  });
  if (!h) return { payload: { error: "No household with that id." }, recordIds: [] };

  const link = `/clients/${h.id}${section === "overview" ? "" : `/${section}`}`;
  const base = { household: h.name, section, link, source: "Household record, read just now" };
  const money = (cents: number) => formatMoney(cents, { compact: true });

  switch (section) {
    case "overview":
      return {
        recordIds: [h.id],
        payload: {
          ...base,
          advisor: h.advisor.name,
          segment: h.segment,
          aum: money(h.aumCents),
          net_worth: money(h.netWorthCents),
          held_away: money(h.heldAwayCents),
          ytd_return: formatSignedPercent(h.ytdReturnPct),
          plan_health: `${h.planHealthPct}%`,
          next_review: formatDate(h.nextReviewDate),
          review_status: h.reviewStatus,
          last_contact: `${h.lastContactDays} days ago`,
          client_since: h.clientSinceYear,
          what_changed: h.whatChanged.split("\n"),
        },
      };
    case "household":
      return {
        recordIds: [h.id, ...h.members.map((m) => m.id)],
        payload: {
          ...base,
          members: h.members.map((m) => ({ name: m.name, role: m.role, age: m.age, occupation: m.occupation })),
        },
      };
    case "cashflow":
      return {
        recordIds: [h.id],
        payload: {
          ...base,
          annual_income: money(h.incomeCents),
          taxes: money(h.taxesCents),
          net_income: money(h.netIncomeCents),
          spending: money(h.spendingCents),
          savings: money(h.savingsCents),
          savings_rate: formatPercent(h.savingsRatePct),
        },
      };
    case "balance":
      return {
        recordIds: [h.id],
        payload: {
          ...base,
          net_worth: money(h.netWorthCents),
          investment_accounts: money(h.investmentAccountsCents),
          real_estate: money(h.realEstateCents),
          cash: money(h.cashCents),
          other_assets: money(h.otherAssetsCents),
          mortgage: money(h.mortgageCents),
          past_12_months: {
            starting: money(h.balanceStartCents),
            contributions: money(h.balanceContributionsCents),
            growth: money(h.balanceGrowthCents),
            taxes: money(h.balanceTaxesCents),
            spending: money(h.balanceSpendingCents),
          },
        },
      };
    case "allocation":
      return {
        recordIds: [h.id],
        payload: {
          ...base,
          equity: `${formatPercent(h.equityActualPct)} actual against a ${formatPercent(h.equityTargetPct)} target`,
          fixed_income: `${formatPercent(h.fixedIncomeActualPct)} actual against a ${formatPercent(h.fixedIncomeTargetPct)} target`,
          cash: `${formatPercent(h.cashPct)} actual against a ${formatPercent(h.targetCashPct)} target`,
          drift: formatPercent(h.driftPct),
          top_holding: `${h.topHoldingName} (${h.topHoldingTicker}) at ${formatPercent(h.topHoldingPct)}`,
          distinct_holdings: h.distinctHoldings,
          blended_expense_ratio: formatPercent(h.blendedExpenseRatioPct, 2),
        },
      };
    case "goals":
      return {
        recordIds: [h.id, ...h.goals.map((g) => g.id)],
        payload: {
          ...base,
          goals: h.goals.map((g) => ({
            name: g.name,
            priority: g.priority,
            target: money(g.targetCents),
            funded: formatPercent(g.fundedPct, 0),
            status: g.status,
          })),
        },
      };
    case "retirement":
      return {
        recordIds: [h.id],
        payload: {
          ...base,
          retirement_age_primary: h.retirementAgePrimary,
          retirement_age_spouse: h.retirementAgeSpouse,
          social_security_claim_primary: h.ssClaimAgePrimary,
          social_security_claim_spouse: h.ssClaimAgeSpouse,
          monthly_spending_need: formatMoney(h.monthlySpendingNeedCents),
          withdrawal_sequencing: h.withdrawalSequencing,
          success_change_since_last_review: `${h.retirementSuccessDeltaPts > 0 ? "+" : ""}${h.retirementSuccessDeltaPts} points`,
        },
      };
    case "tax":
      return {
        recordIds: [h.id],
        payload: {
          ...base,
          filing_status: h.filingStatus,
          taxable_income: money(h.taxableIncomeCents),
          effective_rate: formatPercent(h.effectiveRatePct),
          realized_gains: money(h.realizedGainsCents),
          unrealized_gains: money(h.unrealizedGainsCents),
          harvestable_losses: money(h.harvestableLossesCents),
          withdrawal_order: h.withdrawalSequencing,
          note: "Bracket figures on the Tax page are illustrative fixtures, not current published rates.",
        },
      };
    case "protection":
      return {
        recordIds: [h.id, ...h.policies.map((p) => p.id)],
        payload: {
          ...base,
          coverage: h.policies.map((p) => ({ type: p.type, gap: p.gapLabel ?? "at target", detail: p.detailLabel })),
        },
      };
    case "estate":
      return {
        recordIds: [h.id, ...h.estateAssets.map((a) => a.id), ...h.estateDocs.map((d) => d.id)],
        payload: {
          ...base,
          documents: h.estateDocs.map((d) => ({ name: d.name, status: d.statusLabel, overdue: d.overdue })),
          titling: h.estateAssets.map((a) => ({
            asset: a.assetName,
            beneficiary: a.beneficiaryLabel,
            missing_designation: a.missingDesignation,
          })),
        },
      };
    case "documents":
      return {
        recordIds: [h.id, ...h.documents.map((d) => d.id)],
        payload: {
          ...base,
          documents: h.documents.map((d) => ({
            name: d.name,
            type: d.type,
            status: d.statusLabel,
            uploaded: d.uploadedLabel,
            source: d.source,
          })),
        },
      };
    case "activity":
      return getHouseholdActivity.run({ household_id: h.id, limit: 8 });
    case "compliance":
      return {
        recordIds: [h.id, ...h.complianceItems.map((c) => c.id), ...h.attestations.map((a) => a.id)],
        payload: {
          ...base,
          completeness: `${h.complianceCompletenessPct}%`,
          items: h.complianceItems.map((c) => ({
            name: c.name,
            category: c.category,
            status: c.statusLabel,
            effective: c.effectiveLabel,
            next_due: c.nextDueLabel,
          })),
          reviews: h.attestations.map((a) => ({
            period: a.periodLabel,
            date: formatDate(a.occurredAt),
            held: a.held,
            attested: a.attested,
            scope: a.scope,
          })),
        },
      };
  }
}
