import { CURRENT_ADVISOR_NAME } from "@/lib/current-advisor";
import type { MarketSnapshot } from "@/lib/planning/market";

/**
 * The opening analysis: everything intake collected, read once, before
 * the household exists.
 *
 * This is the one place in the app where the assistant is asked to work
 * from a client's whole picture rather than one section of it, and the
 * one place where it is allowed to *ask* rather than answer. A first plan
 * built on an unstated assumption is worse than a first plan delayed by a
 * question, so the model has a tool for putting questions back to the
 * advisor and is told to use it before writing anything it would have to
 * guess at.
 *
 * What it must not do is fill gaps quietly. Intake is a form: it is full
 * of holes by nature, and every one of them is either a question worth
 * asking or a limit worth stating.
 */

export const INTAKE_ANALYSIS_SYSTEM = `You are the assistant inside Meridian, an AI-native workspace for independent financial advisors. You are talking to ${CURRENT_ADVISOR_NAME}, an advisor, who has just finished taking a new household through intake. The household has not been created yet. You are not talking to the client.

Everything intake collected is given to you in the intake block, along with the market conditions of the day and any standing instruction the advisor added. Nothing else about this household exists.

How you work here:

1. Use only what is in the intake block. Quote the figures exactly as written — they are already formatted. Never recompute, re-round, sum or derive a number, and never infer a figure that was not collected. If something you need is missing, that is a question to ask or a limit to state, not a gap to fill.

2. Ask before you assume, and ask *first*. If a conclusion would rest on something intake did not collect, call ask_clarifying_questions before writing anything. Ask only what would actually change your advice — three or four questions at most, each with a sentence on why it matters. Do not ask for something already in the block. Once the advisor answers, treat the answers as fact and write the analysis.

   You get one round of questions and one only. After the advisor answers, write the analysis with what you have — anything still unresolved goes under "Open questions and limits". So spend the round on what matters most.

   The two places an unknown can go are not interchangeable. Something the advisor could tell you right now — whether a large position is restricted, whether there is a will, what a goal is actually meant to cost — is a **question**, and asking it is cheap. The "Open questions and limits" heading is for what no answer could resolve today: a tax return that hasn't been filed, a valuation nobody has done, a target allocation that doesn't exist because there is no IPS yet. Do not park an answerable question under that heading to avoid asking it.

3. Follow the advisor's instruction. If they told you what to pay attention to, that shapes the whole analysis — lead with it, and say plainly if the intake data cannot support what they asked.

4. Be honest about a form's limits. Intake collects a snapshot: no cost basis on some holdings, no target allocation, no insurance, no estate documents, no tax return. Say what you cannot yet see, rather than writing around it.

5. Stay inside your role. You do not recommend specific securities to buy or sell, and you do not give tax or legal advice as though it were settled. You may raise a tax or estate question, quantify what the record shows, and suggest the advisor confirm it with the household's CPA or attorney. The advisor decides; you surface and draft.

6. Market conditions are context, not a forecast. The indicator feed is simulated and labelled as such. Do not turn a rate or a drawdown into a return assumption or a market call.

When you are ready to write, use exactly these headings, as markdown "## " headings, in this order:

## Where they stand
## What stands out
## Suggested approach
## Open questions and limits

Under each: two to five tight bullets. Plain, direct, brief — the way one colleague briefs another. Sentence case. No preamble. Quantify every claim you can from the block, and leave a heading short rather than padding it.`;

export type IntakeAnalysisInput = {
  householdName: string;
  segment: string;
  advisorInstruction: string;
  members: {
    name: string;
    role: string;
    age: number | null;
    occupation: string;
    annualIncome: string;
    annualExpenses: string;
    riskProfile: string;
    riskComplete: boolean;
  }[];
  goals: { name: string; priority: string; horizon: string }[];
  accounts: {
    name: string;
    kind: string;
    taxTreatment: string;
    custodian: string;
    owner: string;
    value: string;
    holdings: { ticker: string; name: string; assetClass: string; kind: string; value: string; costBasis: string | null }[];
  }[];
  allocation: { label: string; value: string; pct: string }[];
  portfolioTotal: string;
  properties: { label: string; value: string; mortgage: string }[];
  otherAssets: { label: string; value: string }[];
  otherLiabilities: string;
  netWorth: string;
  annualIncome: string;
  annualExpenses: string;
  annualSurplus: string;
  market: MarketSnapshot;
  clarifications: { question: string; answer: string }[];
};

/**
 * The intake, rendered for the model.
 *
 * Labelled prose rather than JSON: the model has to keep several
 * distinctions straight — what was collected against what was left blank,
 * what the advisor asked for against what the data shows — and in a
 * nested object those distinctions become a matter of indentation.
 */
export function buildIntakeBlock(input: IntakeAnalysisInput): string {
  const lines: string[] = [];
  const orNone = (value: string, fallback = "not collected at intake") => value || fallback;

  lines.push(`HOUSEHOLD: ${input.householdName} (${input.segment} tier)`);
  lines.push("");

  if (input.advisorInstruction.trim()) {
    lines.push("ADVISOR'S INSTRUCTION — what they asked you to pay attention to:");
    lines.push(`  ${input.advisorInstruction.trim()}`);
    lines.push("");
  } else {
    lines.push("ADVISOR'S INSTRUCTION: none given. Read the household on its own terms.");
    lines.push("");
  }

  lines.push("PEOPLE:");
  for (const member of input.members) {
    lines.push(
      `  ${member.name} — ${member.role}, ${member.age === null ? "age not given" : `age ${member.age}`}, ${orNone(member.occupation, "occupation not given")}`,
    );
    lines.push(
      `    income ${orNone(member.annualIncome, "not given")}/yr, spending ${orNone(member.annualExpenses, "not given")}/yr`,
    );
    lines.push(
      `    risk tolerance: ${member.riskComplete ? member.riskProfile : "questionnaire not completed"}`,
    );
  }
  lines.push("");

  lines.push("HOUSEHOLD CASHFLOW:");
  lines.push(`  income ${input.annualIncome}/yr, spending ${input.annualExpenses}/yr, surplus ${input.annualSurplus}/yr`);
  lines.push("");

  lines.push(`PORTFOLIO: ${input.portfolioTotal} across ${input.accounts.length} account(s)`);
  if (input.accounts.length === 0) {
    lines.push("  No accounts were entered. Allocation, drift and AUM are unknown for this household.");
  }
  for (const account of input.accounts) {
    lines.push(
      `  ${account.name} — ${account.kind}, ${account.taxTreatment}, held at ${account.custodian}, owned by ${account.owner}: ${account.value}`,
    );
    for (const holding of account.holdings) {
      lines.push(
        `    ${holding.ticker} ${holding.name} (${holding.kind}, ${holding.assetClass}): ${holding.value}${holding.costBasis ? `, cost basis ${holding.costBasis}` : ", cost basis not given"}`,
      );
    }
  }
  if (input.allocation.length > 0) {
    lines.push(`  Asset mix: ${input.allocation.map((a) => `${a.label} ${a.pct} (${a.value})`).join(", ")}`);
    lines.push("  No target allocation has been agreed: there is no IPS yet, so drift cannot be measured.");
  }
  lines.push("");

  lines.push("BALANCE SHEET:");
  for (const property of input.properties) {
    lines.push(`  ${property.label}: ${property.value}, mortgage ${property.mortgage}`);
  }
  for (const asset of input.otherAssets) lines.push(`  ${asset.label}: ${asset.value}`);
  if (input.otherLiabilities) lines.push(`  Other liabilities: ${input.otherLiabilities}`);
  lines.push(`  Net worth: ${input.netWorth}`);
  lines.push("");

  lines.push("GOALS:");
  if (input.goals.length === 0) lines.push("  None captured at intake.");
  for (const goal of input.goals) {
    lines.push(`  ${goal.name} — ${goal.priority} priority, horizon ${goal.horizon}. No target amount costed yet.`);
  }
  lines.push("");

  lines.push(`MARKET CONDITIONS, as of ${input.market.asOf.toISOString().slice(0, 10)}:`);
  for (const item of input.market.items) {
    lines.push(`  ${item.name}: ${item.value}${item.change ? ` (${item.change})` : ""}`);
  }
  lines.push(
    "  A simulated feed, labelled as such in the product. Context only — do not derive a return assumption or a market call from it.",
  );
  lines.push("");

  if (input.clarifications.length > 0) {
    lines.push("YOUR QUESTIONS, ANSWERED BY THE ADVISOR — treat these as fact:");
    for (const item of input.clarifications) {
      lines.push(`  Q: ${item.question}`);
      lines.push(`  A: ${item.answer || "(no answer given)"}`);
    }
    lines.push("");
  }

  lines.push(
    "NOT COLLECTED AT INTAKE, and therefore unknown: target allocation, insurance and coverage, estate documents and beneficiaries, tax returns and bracket position, held-away assets, employer plan details, and any goal's cost.",
  );

  return lines.join("\n");
}
