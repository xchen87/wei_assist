/** Risk-tolerance scoring for the intake questionnaire.
 *
 * Pure, like everything else in lib/calc — no React, no Prisma, so the
 * bands can be reasoned about (and later tested) without a form around
 * them.
 *
 * The questions and the score-to-profile bands are illustrative fixtures,
 * the same status as the tax brackets in lib/calc/tax.ts: a real firm's
 * questionnaire is a compliance artifact its own compliance team owns, and
 * inventing one here and presenting it as authoritative is exactly what
 * CLAUDE.md §13 rules out. What is real is the mechanism — four answers,
 * one score, one profile, shown to the advisor rather than computed
 * invisibly. */

export type RiskQuestion = {
  id: string;
  prompt: string;
  /** Ordered least to most risk-tolerant; index + 1 is the score. */
  options: string[];
};

export const RISK_QUESTIONS: RiskQuestion[] = [
  {
    id: "drawdown",
    prompt: "If this portfolio fell 20% over a year, what would they most likely do?",
    options: ["Sell most of it", "Sell some of it", "Hold and wait", "Buy more"],
  },
  {
    id: "horizon",
    prompt: "When do they expect to draw meaningfully on this money?",
    options: ["Within 3 years", "In 3–7 years", "In 7–15 years", "In 15 years or more"],
  },
  {
    id: "priority",
    prompt: "Which matters more to them?",
    options: [
      "Protecting capital above all",
      "Mostly protection, some growth",
      "Mostly growth, some protection",
      "Maximising growth",
    ],
  },
  {
    id: "experience",
    prompt: "How would they describe their investing experience?",
    options: ["None", "Some", "Comfortable", "Extensive"],
  },
];

export type RiskProfile = "Conservative" | "Moderate" | "Growth" | "Aggressive";

/** Answers are 1-4 per question, or 0 for unanswered. */
export type RiskAnswers = Record<string, number>;

export type RiskResult = {
  score: number;
  maxScore: number;
  answered: number;
  complete: boolean;
  /** null until every question is answered — a profile from a half-filled
   * questionnaire would be a guess wearing a label. */
  profile: RiskProfile | null;
};

const BANDS: { max: number; profile: RiskProfile }[] = [
  { max: 7, profile: "Conservative" },
  { max: 10, profile: "Moderate" },
  { max: 13, profile: "Growth" },
  { max: 16, profile: "Aggressive" },
];

export function scoreRiskTolerance(answers: RiskAnswers): RiskResult {
  const values = RISK_QUESTIONS.map((q) => answers[q.id] ?? 0);
  const answered = values.filter((v) => v > 0).length;
  const score = values.reduce((sum, v) => sum + v, 0);
  const complete = answered === RISK_QUESTIONS.length;

  return {
    score,
    maxScore: RISK_QUESTIONS.length * 4,
    answered,
    complete,
    profile: complete ? (BANDS.find((b) => score <= b.max)?.profile ?? "Aggressive") : null,
  };
}
