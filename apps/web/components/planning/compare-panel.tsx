"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { formatMoney, formatSignedMoney } from "@/lib/format/money";
import { applyAdjustment } from "@/app/(app)/clients/[id]/planning/compare/actions";

type Adjustment = {
  summary: string;
  rationale: string;
  levers: { key: string; memberName: string | null; label: string; from: string; to: string; value: number }[];
};

export type ComparisonView = {
  recordPct: number;
  scenarioPct: number;
  planPts: number;
  marketPts: number;
  totalPts: number;
  likeForLike: boolean;
  assumptionChanges: { label: string; from: number; to: number }[];
  changes: string[];
  recordMedianCents: number;
  scenarioMedianCents: number;
  recordP10Cents: number;
  scenarioP10Cents: number;
  recordFirstRetirementYear: number;
  scenarioFirstRetirementYear: number;
  goals: { id: string; name: string; targetCents: number | null; atRiskBefore: boolean; atRiskAfter: boolean }[];
};

type Turn = { role: "user" | "assistant"; text: string };

const pts = (n: number) => `${n > 0 ? "+" : n < 0 ? "−" : "±"}${Math.abs(n)} pts`;
const tone = (n: number) => (n > 0 ? "text-gain" : n < 0 ? "text-loss" : "text-ink-muted");

/**
 * The comparison, and the assistant's read on it.
 *
 * The split is the point: everything above the review is computed from
 * `lib/calc` and rendered here, and the model is handed those same
 * figures rather than asked to work them out. What it contributes is
 * judgement — what the change buys, what it costs, what to do next — and
 * the advisor can see the arithmetic it is judging without taking the
 * model's word for any of it.
 */
export function ComparePanel({
  householdId,
  householdName,
  scenarios,
  selectedId,
  selectedName,
  comparison,
  market,
}: {
  householdId: string;
  householdName: string;
  scenarios: { id: string; name: string; kind: string }[];
  selectedId: string;
  selectedName: string;
  comparison: ComparisonView;
  market: { asOf: string; items: { key: string; name: string; category: string; value: string; change: string | null; sourceLabel: string }[] };
}) {
  const router = useRouter();
  const [turns, setTurns] = useState<Turn[]>([]);
  const [streaming, setStreaming] = useState(false);
  const [adjustments, setAdjustments] = useState<{ id: string; adjustment: Adjustment; applied?: string }[]>([]);
  const [guardrail, setGuardrail] = useState<{ rule: string; explanation: string; excerpt: string }[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [question, setQuestion] = useState("");
  const abort = useRef<AbortController | null>(null);

  const hasReview = turns.some((t) => t.role === "assistant" && t.text.length > 0);

  async function run(history: Turn[]) {
    setStreaming(true);
    setError(null);
    setGuardrail([]);
    abort.current?.abort();
    const controller = new AbortController();
    abort.current = controller;

    // The assistant's turn is appended as it streams, so the advisor
    // watches it arrive rather than waiting on a spinner.
    setTurns([...history, { role: "assistant", text: "" }]);

    try {
      const response = await fetch("/api/plan-review", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ householdId, scenarioId: selectedId, messages: history }),
        signal: controller.signal,
      });
      const reader = response.body?.getReader();
      if (!reader) throw new Error("No response body.");
      const decoder = new TextDecoder();
      let buffer = "";

      for (;;) {
        const { done, value } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split("\n");
        buffer = lines.pop() ?? "";
        for (const line of lines) {
          if (!line.trim()) continue;
          const event = JSON.parse(line);
          if (event.type === "text") {
            setTurns((prev) => {
              const next = [...prev];
              const last = next[next.length - 1];
              if (last?.role === "assistant") next[next.length - 1] = { ...last, text: last.text + event.delta };
              return next;
            });
          } else if (event.type === "adjustment") {
            setAdjustments((prev) => [...prev, { id: event.id, adjustment: event.adjustment }]);
          } else if (event.type === "guardrail") {
            setGuardrail(event.flags);
          } else if (event.type === "error") {
            setError(event.message);
          }
        }
      }
    } catch (e) {
      if (!(e instanceof DOMException && e.name === "AbortError")) {
        setError(e instanceof Error ? e.message : "The review failed.");
      }
    } finally {
      setStreaming(false);
    }
  }

  function ask() {
    const text = question.trim();
    if (!text || streaming) return;
    setQuestion("");
    run([...turns, { role: "user", text }]);
  }

  async function apply(id: string, adjustment: Adjustment) {
    const result = await applyAdjustment(
      householdId,
      selectedId,
      adjustment.levers.map((l) => ({ key: l.key, memberName: l.memberName, value: l.value })),
    );
    setAdjustments((prev) =>
      prev.map((a) =>
        a.id === id
          ? {
              ...a,
              applied:
                result.refused.length > 0
                  ? `Applied ${result.applied}. ${result.refused.join(" ")}`
                  : `Applied to “${selectedName}”.`,
            }
          : a,
      ),
    );
    router.refresh();
  }

  return (
    <div className="flex flex-col gap-5">
      {/* ----------------------------------------------- scenario picker */}
      <div className="flex flex-wrap items-center gap-2">
        <span className="text-xs text-ink-muted">Comparing</span>
        {scenarios.map((scenario) => (
          <a
            key={scenario.id}
            href={`/clients/${householdId}/planning/compare?scenario=${scenario.id}`}
            className={`rounded-control border px-2.5 py-1 text-xs font-semibold ${
              scenario.id === selectedId
                ? "border-pine bg-pine-tint text-pine"
                : "border-rule text-ink-muted hover:text-ink"
            }`}
          >
            {scenario.name}
            {scenario.kind === "recommended" ? " ·  recommended" : ""}
          </a>
        ))}
      </div>

      <div className="grid gap-5 xl:grid-cols-[minmax(420px,1fr)_minmax(420px,1fr)]">
        {/* ------------------------------------------------- the numbers */}
        <div className="flex flex-col gap-4">
          <div className="rounded-card border border-rule bg-surface p-5">
            <div className="grid grid-cols-2 gap-4">
              <Side label="Plan of record" pct={comparison.recordPct} />
              <Side label={selectedName} pct={comparison.scenarioPct} highlight />
            </div>

            <dl className="mt-4 grid grid-cols-2 gap-x-5 gap-y-3 border-t border-rule pt-3.5">
              <Stat
                label="Median at plan end"
                value={formatMoney(comparison.scenarioMedianCents, { compact: true })}
                note={`${formatSignedMoney(comparison.scenarioMedianCents - comparison.recordMedianCents, { compact: true })} vs record`}
                noteTone={tone(comparison.scenarioMedianCents - comparison.recordMedianCents)}
              />
              <Stat
                label="Worst decile"
                value={formatMoney(comparison.scenarioP10Cents, { compact: true })}
                note={`${formatSignedMoney(comparison.scenarioP10Cents - comparison.recordP10Cents, { compact: true })} vs record`}
                noteTone={tone(comparison.scenarioP10Cents - comparison.recordP10Cents)}
              />
              <Stat
                label="First retirement"
                value={
                  comparison.scenarioFirstRetirementYear === 0
                    ? "Already"
                    : `${comparison.scenarioFirstRetirementYear} yrs`
                }
                note={`was ${comparison.recordFirstRetirementYear} yrs`}
              />
              <Stat
                label="Goals newly at risk"
                value={String(comparison.goals.filter((g) => !g.atRiskBefore && g.atRiskAfter).length)}
                note={`${comparison.goals.filter((g) => g.atRiskBefore && !g.atRiskAfter).length} no longer at risk`}
              />
            </dl>
          </div>

          {/* The decomposition — the thing that makes the headline honest. */}
          <div className="rounded-card border border-rule bg-surface p-4">
            <div className="mb-2 text-sm font-semibold">Where the {pts(comparison.totalPts)} comes from</div>
            <div className="flex flex-col gap-1.5 text-sm">
              <Attribution label="Changes to the plan" value={comparison.planPts} />
              <Attribution label="Changes to the assumptions" value={comparison.marketPts} />
            </div>
            <p className="mt-2.5 text-xs text-ink-muted">
              {comparison.likeForLike ? (
                <>
                  Like for like: this scenario leaves the market assumptions alone, so the whole
                  difference is the plan&rsquo;s doing.
                </>
              ) : (
                <>
                  Not like for like — this scenario also moves{" "}
                  {comparison.assumptionChanges
                    .map((a) => `${a.label.toLowerCase()} ${a.from}% → ${a.to}%`)
                    .join(" and ")}
                  . That part would have moved the number with the plan untouched.
                </>
              )}
            </p>
          </div>

          <div className="rounded-card border border-rule bg-surface p-4">
            <div className="mb-2 text-sm font-semibold">What this scenario changes</div>
            {comparison.changes.length === 0 ? (
              <p className="text-xs text-ink-muted">Nothing — it matches the plan of record.</p>
            ) : (
              <div className="flex flex-wrap gap-1.5">
                {comparison.changes.map((change) => (
                  <span
                    key={change}
                    className="rounded-control bg-pine-tint px-2 py-1 text-xs font-medium text-pine"
                  >
                    {change}
                  </span>
                ))}
              </div>
            )}
          </div>

          <details className="rounded-card border border-rule bg-surface p-4">
            <summary className="cursor-pointer text-sm font-semibold">
              Market conditions as of {market.asOf}
            </summary>
            <p className="mt-1.5 text-xs text-ink-muted">
              Both plans are projected under these, identically. A simulated feed — context for
              the review, not an input: no return assumption is derived from it.
            </p>
            <table className="mt-2.5 w-full border-collapse text-xs">
              <tbody>
                {market.items.map((item) => (
                  <tr key={item.key} className="border-t border-rule">
                    <td className="py-1.5 pr-3 text-ink-muted">{item.name}</td>
                    <td className="tabular py-1.5 pr-3 text-right font-semibold">{item.value}</td>
                    <td className="py-1.5 text-right text-ink-muted">{item.change ?? "—"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </details>
        </div>

        {/* -------------------------------------------------- the review */}
        <div className="flex flex-col gap-3">
          <div className="rounded-card border border-rule bg-surface p-5">
            <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
              <div>
                <div className="text-sm font-semibold">Assistant&rsquo;s review</div>
                <div className="text-xs text-ink-muted">
                  {householdName} · reading the comparison beside it
                </div>
              </div>
              <button
                onClick={() => run([])}
                disabled={streaming}
                className="rounded-control bg-pine px-3.5 py-2 text-sm font-semibold text-on-accent disabled:opacity-40"
              >
                {streaming ? "Reading…" : hasReview ? "Run again" : "Review this change"}
              </button>
            </div>

            {error ? (
              <div className="mb-3 rounded-control border border-loss bg-surface px-3 py-2 text-xs text-loss">
                {error}
              </div>
            ) : null}

            {guardrail.length > 0 ? (
              <div className="mb-3 rounded-control border border-brass bg-brass-tint px-3 py-2 text-xs">
                Flagged for review before this goes to a client:{" "}
                {guardrail.map((f) => f.explanation).join(" ")}
              </div>
            ) : null}

            {turns.length === 0 ? (
              <p className="text-sm text-ink-muted">
                The figures beside this are computed locally and are already correct. Ask the
                assistant to read them and say what the change buys, what it costs, and what to
                do next.
              </p>
            ) : (
              <div className="flex flex-col gap-3">
                {turns.map((turn, i) =>
                  turn.role === "user" ? (
                    <div key={i} className="self-end rounded-card bg-pine-tint px-3 py-2 text-sm text-pine">
                      {turn.text}
                    </div>
                  ) : (
                    <Review key={i} text={turn.text} streaming={streaming && i === turns.length - 1} />
                  ),
                )}
              </div>
            )}

            {adjustments.map(({ id, adjustment, applied }) => (
              <div key={id} className="mt-3 rounded-card border border-brass bg-brass-tint p-3">
                <div className="text-sm font-semibold">{adjustment.summary}</div>
                <p className="mt-1 text-xs">{adjustment.rationale}</p>
                <ul className="mt-2 flex flex-col gap-0.5 text-xs">
                  {adjustment.levers.map((lever) => (
                    <li key={`${lever.key}-${lever.memberName ?? ""}`} className="tabular">
                      {lever.label}: {lever.from} → <span className="font-semibold">{lever.to}</span>
                    </li>
                  ))}
                </ul>
                {applied ? (
                  <div className="mt-2 text-xs font-medium">{applied}</div>
                ) : (
                  <button
                    onClick={() => apply(id, adjustment)}
                    className="mt-2.5 rounded-control bg-pine px-3 py-1.5 text-xs font-semibold text-on-accent"
                  >
                    Apply to “{selectedName}”
                  </button>
                )}
              </div>
            ))}
          </div>

          {/* ---------------------------------------------------- follow-ups */}
          <div className="rounded-card border border-rule bg-surface p-4">
            <div className="mb-2 text-sm font-semibold">Ask about this comparison</div>
            <div className="flex gap-2">
              <input
                value={question}
                onChange={(e) => setQuestion(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && !e.shiftKey) {
                    e.preventDefault();
                    ask();
                  }
                }}
                placeholder="What would it take to get to 90%?"
                className="flex-1 rounded-control border border-rule bg-surface px-2.5 py-2 text-sm focus:border-pine focus:outline-none focus:ring-1 focus:ring-pine"
              />
              <button
                onClick={ask}
                disabled={streaming || question.trim().length === 0}
                className="rounded-control border border-rule px-3 py-2 text-sm font-semibold disabled:opacity-40"
              >
                Ask
              </button>
            </div>
            <p className="mt-2 text-xs text-ink-muted">
              The assistant can suggest a further change; it arrives as a card you apply, never as
              an edit it made itself.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

function Side({ label, pct, highlight }: { label: string; pct: number; highlight?: boolean }) {
  return (
    <div className={highlight ? "" : "opacity-80"}>
      <div className="truncate text-xs text-ink-muted">{label}</div>
      <div
        className={`tabular text-3xl font-bold ${pct >= 80 ? "text-gain" : pct >= 60 ? "text-brass" : "text-loss"}`}
      >
        {pct}%
      </div>
    </div>
  );
}

function Stat({
  label,
  value,
  note,
  noteTone,
}: {
  label: string;
  value: string;
  note: string;
  noteTone?: string;
}) {
  return (
    <div>
      <dt className="text-xs text-ink-muted">{label}</dt>
      <dd className="tabular text-sm font-semibold">{value}</dd>
      <dd className={`tabular text-xs ${noteTone ?? "text-ink-muted"}`}>{note}</dd>
    </div>
  );
}

function Attribution({ label, value }: { label: string; value: number }) {
  return (
    <div className="flex items-center justify-between gap-3">
      <span className="text-ink-muted">{label}</span>
      <span className={`tabular font-semibold ${tone(value)}`}>{pts(value)}</span>
    </div>
  );
}

/** The review arrives as markdown with four fixed headings. Rendering
 * just those and bullets keeps it readable without pulling in a markdown
 * dependency for four constructs. */
function Review({ text, streaming }: { text: string; streaming: boolean }) {
  const lines = text.split("\n");
  return (
    <div className="text-sm leading-relaxed">
      {lines.map((line, i) => {
        const trimmed = line.trim();
        if (trimmed.startsWith("## ")) {
          return (
            <h4 key={i} className="mb-1 mt-3.5 text-sm font-semibold first:mt-0">
              {trimmed.slice(3)}
            </h4>
          );
        }
        if (trimmed.startsWith("- ") || trimmed.startsWith("* ")) {
          return (
            <div key={i} className="mb-1 flex gap-2">
              <span className="text-ink-muted">·</span>
              <span>{trimmed.slice(2)}</span>
            </div>
          );
        }
        if (!trimmed) return null;
        return (
          <p key={i} className="mb-1.5">
            {trimmed}
          </p>
        );
      })}
      {streaming ? <span className="ml-0.5 inline-block h-3.5 w-1.5 animate-pulse bg-pine align-middle" /> : null}
    </div>
  );
}
