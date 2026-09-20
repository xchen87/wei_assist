"use client";

import { RISK_QUESTIONS, scoreRiskTolerance, type RiskAnswers } from "@/lib/calc/risk";

/** Four questions, one profile, per member (CLAUDE.md §6 lists risk profile
 * under Household/Allocation; this is where it gets collected). The score
 * and the profile are shown as they're filled in rather than computed out
 * of sight — an advisor about to put "Growth" on a client's file should be
 * able to see what produced it. */
export function RiskQuestionnaire({
  answers,
  onChange,
  /** Unique per member: radio groups are keyed by name, so two members
   * sharing one would answer each other's questions. */
  namePrefix,
}: {
  answers: RiskAnswers;
  onChange: (answers: RiskAnswers) => void;
  namePrefix: string;
}) {
  const result = scoreRiskTolerance(answers);

  return (
    <div>
      <div className="mb-2.5 flex items-baseline justify-between">
        <div className="text-xs font-semibold">Risk tolerance</div>
        <div className="text-xs text-ink-muted">
          {result.profile ? (
            <>
              <span className="font-semibold text-pine">{result.profile}</span>
              <span className="tabular"> · {result.score} of {result.maxScore}</span>
            </>
          ) : (
            `${result.answered} of ${RISK_QUESTIONS.length} answered`
          )}
        </div>
      </div>

      <div className="flex flex-col gap-2.5">
        {RISK_QUESTIONS.map((q) => (
          <fieldset key={q.id}>
            <legend className="mb-1 text-xs text-ink-muted">{q.prompt}</legend>
            <div className="flex flex-wrap gap-1.5">
              {q.options.map((option, oi) => {
                const value = oi + 1;
                const selected = answers[q.id] === value;
                return (
                  <label
                    key={option}
                    className={`cursor-pointer rounded-control border px-2.5 py-1 text-xs ${
                      selected ? "border-pine bg-pine-tint font-semibold text-pine" : "border-rule text-ink-muted hover:text-ink"
                    }`}
                  >
                    <input
                      type="radio"
                      name={`${namePrefix}-${q.id}`}
                      checked={selected}
                      onChange={() => onChange({ ...answers, [q.id]: value })}
                      className="sr-only"
                    />
                    {option}
                  </label>
                );
              })}
            </div>
          </fieldset>
        ))}
      </div>
    </div>
  );
}
