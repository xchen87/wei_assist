import { formatMoney } from "@/lib/format/money";
import { formatPercent } from "@/lib/format/percent";

/** The impact rules: given an indicator that moved and a household's own
 * figures, decide whether this household is affected and say why.
 *
 * Pure, like the rest of lib/calc — no Prisma, no React — because these
 * are the part worth reasoning about carefully. Every rule returns a
 * rationale built from that household's actual numbers, never a template
 * with the household's name dropped in: an alert that can't say why this
 * household matched is indistinguishable from a guess, and an advisor will
 * stop trusting the whole feed after one of those.
 *
 * Two deliberate limits, both from CLAUDE.md §9 rule 4 and §13. Suggested
 * actions are prompts to review, never instructions — "worth confirming
 * with them", not "move to cash". And no rule asserts a tax rule or a
 * threshold of its own: where a threshold is involved it comes from the
 * simulated indicator's own value, which the UI labels as a fixture.
 */

export type SignalHousehold = {
  id: string;
  name: string;
  aumCents: number;
  netWorthCents: number;
  cashPct: number;
  targetCashPct: number;
  cashCents: number;
  driftPct: number;
  equityActualPct: number;
  equityTargetPct: number;
  mortgageCents: number;
  taxableIncomeCents: number;
  harvestableLossesCents: number;
  monthlySpendingNeedCents: number;
  retirementAgePrimary: number;
  memberAges: number[];
  reviewStatus: string;
};

export type IndicatorSnapshot = {
  key: string;
  name: string;
  category: string;
  unit: string;
  fromValue: number;
  toValue: number;
};

export type SignalMatch = {
  ruleKey: string;
  severity: "high" | "medium" | "low";
  title: string;
  rationale: string;
  suggestedAction: string;
  section?: string;
};

type Rule = {
  key: string;
  /** Indicator keys this rule responds to. */
  indicators: string[];
  /** Only fires when the move goes this way; "any" for either direction. */
  direction: "up" | "down" | "any";
  evaluate: (h: SignalHousehold, indicator: IndicatorSnapshot) => SignalMatch | null;
};

const delta = (i: IndicatorSnapshot) => i.toValue - i.fromValue;
const move = (i: IndicatorSnapshot) =>
  `${i.name} ${delta(i) > 0 ? "up" : "down"} from ${i.fromValue}${i.unit === "%" ? "%" : ""} to ${i.toValue}${i.unit === "%" ? "%" : ""}`;

const RULES: Rule[] = [
  {
    key: "cash-drag-on-rate-move",
    indicators: ["fed_funds_rate", "treasury_10y"],
    direction: "any",
    evaluate: (h, i) => {
      // 1.5 points over target caught 25 of 40 — this book simply runs
      // cash-heavy, so that gate was describing the book rather than
      // selecting from it. Three points is a position an advisor would
      // actually act on.
      const over = h.cashPct - h.targetCashPct;
      if (over < 3) return null;
      return {
        ruleKey: "cash-drag-on-rate-move",
        severity: over >= 6 ? "high" : over >= 4 ? "medium" : "low",
        title: delta(i) > 0 ? "Cash position worth revisiting as rates rise" : "Cash position exposed as rates fall",
        rationale: `${move(i)}. This household holds ${formatPercent(h.cashPct)} in cash against a ${formatPercent(h.targetCashPct)} target — ${formatMoney(h.cashCents, { compact: true })}, ${formatPercent(over)} above where the plan puts it.`,
        suggestedAction:
          delta(i) > 0
            ? "Worth reviewing where that cash is held before the next review — the opportunity cost moved with the rate."
            : "Worth revisiting the cash target with them: falling short rates change what an overweight cash position earns.",
        section: "allocation",
      };
    },
  },
  {
    key: "mortgage-exposure",
    indicators: ["fed_funds_rate", "mortgage_30y"],
    direction: "up",
    evaluate: (h, i) => {
      // Every household in the book carries some mortgage; $700K is where
      // a rate move is worth a conversation rather than a note.
      if (h.mortgageCents < 700_000_00) return null;
      return {
        ruleKey: "mortgage-exposure",
        severity: h.mortgageCents >= 1_000_000_00 ? "high" : "medium",
        title: "Borrowing costs worth confirming",
        rationale: `${move(i)}. This household carries ${formatMoney(h.mortgageCents, { compact: true })} in mortgage debt on the balance sheet.`,
        suggestedAction:
          "Worth confirming whether any of it is variable-rate or due to reset, and what that does to their cashflow.",
        section: "balance",
      };
    },
  },
  {
    key: "drift-widened-by-market",
    indicators: ["equity_drawdown", "equity_ytd"],
    direction: "any",
    evaluate: (h, i) => {
      if (h.driftPct < 4) return null;
      // Name the asset class actually out of position rather than always
      // quoting equities: in this book the drift usually sits in cash, and
      // "drift is 6.2%, equities 0.3% over target" invites the question of
      // where the other 5.9% went.
      const equityGap = h.equityActualPct - h.equityTargetPct;
      const cashGap = h.cashPct - h.targetCashPct;
      const worst =
        Math.abs(cashGap) >= Math.abs(equityGap)
          ? { label: "cash", actual: h.cashPct, target: h.targetCashPct, gap: cashGap }
          : { label: "equities", actual: h.equityActualPct, target: h.equityTargetPct, gap: equityGap };
      return {
        ruleKey: "drift-widened-by-market",
        severity: h.driftPct >= 6 ? "high" : "medium",
        title: "Allocation already past its drift band",
        rationale: `${move(i)}. Drift here is ${formatPercent(h.driftPct)}, most of it in ${worst.label}: ${formatPercent(worst.actual)} against a ${formatPercent(worst.target)} target, ${formatPercent(Math.abs(worst.gap))} ${worst.gap >= 0 ? "over" : "under"}. A move of this size widens it further.`,
        suggestedAction: "Worth putting a rebalance on the agenda for the next review.",
        section: "allocation",
      };
    },
  },
  {
    key: "sequence-risk-near-retirement",
    indicators: ["equity_drawdown"],
    direction: "down",
    evaluate: (h, i) => {
      const nearest = h.memberAges.filter((a) => a >= 55 && a <= 72).sort((a, b) => b - a)[0];
      if (nearest === undefined) return null;
      if (h.equityActualPct < 50) return null;
      return {
        ruleKey: "sequence-risk-near-retirement",
        severity: nearest >= 62 ? "high" : "medium",
        title: "Drawdown lands close to the retirement date",
        rationale: `${move(i)}. A member is ${nearest}, with ${formatPercent(h.equityActualPct)} in equities and a stated monthly spending need of ${formatMoney(h.monthlySpendingNeedCents)}. Withdrawals starting into a fall are the sequence the plan is most sensitive to.`,
        suggestedAction:
          "Worth walking through the withdrawal sequence with them before it becomes a live decision.",
        section: "retirement",
      };
    },
  },
  {
    key: "harvest-opportunity",
    indicators: ["equity_drawdown"],
    direction: "down",
    evaluate: (h, i) => {
      // Absolute size alone flagged 31 of 40 households, which is not a
      // signal — it is a property of the book, and an advisor who sees
      // three-quarters of their clients flagged stops reading the feed.
      // Losses only matter next to the portfolio they sit in.
      // Both gates earn their place: the dollar floor keeps small books
      // out, the share keeps large ones from qualifying on size alone.
      // Across this book that lands on eight households rather than
      // thirty-one, which is a list an advisor can actually work through.
      const share = h.aumCents > 0 ? h.harvestableLossesCents / h.aumCents : 0;
      if (h.harvestableLossesCents < 75_000_00 || share < 0.008) return null;
      return {
        ruleKey: "harvest-opportunity",
        severity: share >= 0.012 ? "medium" : "low",
        title: "Harvestable losses worth a look at this size",
        rationale: `${move(i)}. This household is carrying ${formatMoney(h.harvestableLossesCents, { compact: true })} in harvestable losses — ${formatPercent(share * 100)} of the portfolio — and a further fall adds to them.`,
        suggestedAction:
          "Worth reviewing the loss position with their tax preparer before year end — this is a question for them, not a recommendation from here.",
        section: "tax",
      };
    },
  },
  {
    key: "rmd-age-change",
    indicators: ["rmd_age"],
    direction: "any",
    evaluate: (h, i) => {
      // The threshold comes from the indicator itself, not from this file:
      // no rule here asserts what any real rule says (§13).
      const affected = h.memberAges.filter((a) => a >= i.toValue - 3 && a <= i.toValue + 6);
      if (affected.length === 0) return null;
      return {
        ruleKey: "rmd-age-change",
        severity: affected.some((a) => a >= i.toValue) ? "high" : "medium",
        title: "Distribution timing affected by the scenario",
        rationale: `${i.name} moves from ${i.fromValue} to ${i.toValue} in this scenario. ${affected.length === 1 ? "A member is" : "Members are"} aged ${affected.sort((a, b) => b - a).join(", ")} — inside the window this change would move.`,
        suggestedAction:
          "Worth confirming the first distribution year with their tax preparer and revisiting the withdrawal order.",
        section: "retirement",
      };
    },
  },
  {
    key: "estate-scenario-exposure",
    indicators: ["estate_exclusion"],
    direction: "down",
    evaluate: (h, i) => {
      // 0.6x flagged 31 of 40. At 0.9x it flags the households genuinely
      // at or near the scenario's threshold — which, for a scenario that
      // halves it, is still a large slice of a book with a $7.7M median
      // net worth. That is the scenario being dramatic, not the rule being
      // loose, and each alert says where that household actually sits.
      const scenarioCents = i.toValue * 100;
      if (h.netWorthCents < scenarioCents * 0.9) return null;
      return {
        ruleKey: "estate-scenario-exposure",
        severity: h.netWorthCents >= scenarioCents ? "high" : "medium",
        title: "Net worth sits near the scenario's transfer threshold",
        rationale: `In this scenario ${i.name.toLowerCase()} moves to ${formatMoney(scenarioCents, { compact: true })}. This household's net worth is ${formatMoney(h.netWorthCents, { compact: true })}, ${h.netWorthCents >= scenarioCents ? "above" : "within reach of"} it.`,
        suggestedAction:
          "Worth raising with their estate attorney — the transfer plan was built under different assumptions.",
        section: "estate",
      };
    },
  },
  {
    key: "bracket-proximity",
    indicators: ["bracket_edge"],
    direction: "any",
    evaluate: (h, i) => {
      const edgeCents = i.toValue * 100;
      const distance = Math.abs(h.taxableIncomeCents - edgeCents);
      if (distance > 40_000_00) return null;
      return {
        ruleKey: "bracket-proximity",
        severity: distance <= 15_000_00 ? "medium" : "low",
        title: "Taxable income sits close to the scenario's edge",
        rationale: `This scenario moves ${i.name.toLowerCase()} to ${formatMoney(edgeCents, { compact: true })}. Taxable income on file is ${formatMoney(h.taxableIncomeCents, { compact: true })} — ${formatMoney(distance, { compact: true })} away.`,
        suggestedAction:
          "Worth checking with their tax preparer whether the change moves them, and what it does to any conversion room.",
        section: "tax",
      };
    },
  },
];

/** Every match for one indicator change across one household. */
export function evaluateHousehold(
  household: SignalHousehold,
  indicator: IndicatorSnapshot,
): SignalMatch[] {
  const d = delta(indicator);
  const direction = d > 0 ? "up" : d < 0 ? "down" : "any";

  return RULES.filter(
    (rule) =>
      rule.indicators.includes(indicator.key) &&
      (rule.direction === "any" || rule.direction === direction),
  )
    .map((rule) => rule.evaluate(household, indicator))
    .filter((match): match is SignalMatch => match !== null);
}

export const SIGNAL_RULE_COUNT = RULES.length;

/** Severity ordering has to be explicit. Sorting the string ascending puts
 * "low" above "medium" — alphabetical, not meaningful — which quietly
 * buried every medium alert beneath the low ones everywhere alerts are
 * listed. */
const SEVERITY_RANK: Record<string, number> = { high: 0, medium: 1, low: 2 };

export function bySeverity(a: { severity: string }, b: { severity: string }): number {
  return (SEVERITY_RANK[a.severity] ?? 9) - (SEVERITY_RANK[b.severity] ?? 9);
}
