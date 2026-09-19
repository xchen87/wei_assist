/** CLAUDE.md §9 rule 4 is enforced in two places: the system prompt tells
 * the model the rules, and this module checks what actually came back. The
 * prompt is the control; this is the smoke alarm — it can't stop a bad
 * sentence being generated, but it means one never reaches the advisor
 * unlabelled, and every trip is written to the audit log.
 *
 * These are deliberately narrow string checks, not a classifier. A wide net
 * here would flag ordinary advisor language ("the household sold the
 * business", "their CPA files jointly") constantly, and a warning banner
 * that cries wolf is worse than none. */

export type GuardrailFlag = {
  rule: "security_recommendation" | "authoritative_tax_or_legal" | "ungrounded_figure";
  explanation: string;
  excerpt: string;
};

/** "buy AAPL", "sell into VTI", "we should purchase NPK" — an action verb
 * aimed at something ticker-shaped. Cases that are plainly about what the
 * household already did ("bought", "sold") are not recommendations. */
const SECURITY_RECOMMENDATION = /\b(buy|sell|short|purchase|liquidate|add to)\b[^.!?\n]{0,40}\b([A-Z]{2,5})\b/;

/** Tax and legal claims stated as settled fact. The modal is what makes it
 * advice presented as authoritative rather than a prompt to go check. */
const AUTHORITATIVE_TAX_LEGAL =
  /\b(you|they|the client|the household)\s+(must|are required to|will be required to|owe|will owe|have to)\b[^.!?\n]{0,60}\b(tax|taxes|taxable|IRS|deduction|RMD|penalty|file|filing|estate tax|gift tax|law|legally)\b/i;

const FIGURE = /(\$[\d,]+(\.\d+)?[KMB]?|\b\d+(\.\d+)?%)/;

function sentenceAround(text: string, index: number): string {
  const start = Math.max(0, text.lastIndexOf(".", index) + 1);
  const endDot = text.indexOf(".", index);
  const end = endDot === -1 ? text.length : endDot + 1;
  return text.slice(start, end).trim().slice(0, 220);
}

export function checkAssistantText(
  text: string,
  opts: { readToolsCalled: number },
): GuardrailFlag[] {
  const flags: GuardrailFlag[] = [];

  const security = SECURITY_RECOMMENDATION.exec(text);
  if (security) {
    flags.push({
      rule: "security_recommendation",
      explanation:
        "Reads as a recommendation to buy or sell a specific security. Meridian surfaces and drafts; the advisor decides (CLAUDE.md §9 rule 4).",
      excerpt: sentenceAround(text, security.index),
    });
  }

  const taxLegal = AUTHORITATIVE_TAX_LEGAL.exec(text);
  if (taxLegal) {
    flags.push({
      rule: "authoritative_tax_or_legal",
      explanation:
        "States a tax or legal obligation as settled fact. The assistant may raise the question; it may not answer it authoritatively.",
      excerpt: sentenceAround(text, taxLegal.index),
    });
  }

  const figure = FIGURE.exec(text);
  if (figure && opts.readToolsCalled === 0) {
    flags.push({
      rule: "ungrounded_figure",
      explanation:
        "A dollar or percentage figure appeared in a reply where no tool was called, so nothing backs it. Every claim about a client's finances has to come from a tool result (§9 rule 1).",
      excerpt: sentenceAround(text, figure.index),
    });
  }

  return flags;
}
