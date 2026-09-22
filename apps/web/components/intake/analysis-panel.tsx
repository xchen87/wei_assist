"use client";

import { useRef, useState } from "react";
import type { IntakeAnalysisInput } from "@/lib/ai/intake-analysis";

type Question = { question: string; why: string };

/**
 * The second path out of intake.
 *
 * An advisor can take the household in as typed — that is the button
 * beside this — or hand the whole picture to the assistant first and get
 * an opening read on it. The difference matters at the end of an intake
 * meeting, when everything is fresh and nobody has yet decided what the
 * first conversation with this household should be about.
 *
 * The assistant is allowed to stop and ask. When it does, the report
 * doesn't get written: the questions come back as cards, the advisor
 * answers them, and the analysis runs again with the answers folded into
 * the block. One report, written once, with the gaps closed — rather than
 * a confident first draft that has to be walked back.
 */
export function AnalysisPanel({
  buildIntake,
  disabled,
  onReport,
}: {
  /** Built on demand, so the analysis always reads the form as it is now
   * rather than as it was when the panel opened. */
  buildIntake: (instruction: string, clarifications: { question: string; answer: string }[]) => Omit<IntakeAnalysisInput, "market">;
  disabled: boolean;
  /** Handed up so "Create household" can file the report against the
   * household it creates. */
  onReport: (report: string, instruction: string) => void;
}) {
  const [open, setOpen] = useState(false);
  const [instruction, setInstruction] = useState("");
  const [report, setReport] = useState("");
  const [questions, setQuestions] = useState<Question[]>([]);
  const [answers, setAnswers] = useState<Record<number, string>>({});
  const [answered, setAnswered] = useState<{ question: string; answer: string }[]>([]);
  const [streaming, setStreaming] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [guardrail, setGuardrail] = useState<{ rule: string; explanation: string; excerpt: string }[]>([]);
  const abort = useRef<AbortController | null>(null);

  async function run(clarifications: { question: string; answer: string }[]) {
    setStreaming(true);
    setError(null);
    setGuardrail([]);
    setQuestions([]);
    setReport("");
    abort.current?.abort();
    const controller = new AbortController();
    abort.current = controller;

    let text = "";
    try {
      const response = await fetch("/api/intake-analysis", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ intake: buildIntake(instruction, clarifications) }),
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
            text += event.delta;
            setReport(text);
          } else if (event.type === "questions") {
            setQuestions(event.items);
            setAnswers({});
          } else if (event.type === "guardrail") {
            setGuardrail(event.flags);
          } else if (event.type === "error") {
            setError(event.message);
          }
        }
      }
      if (text.trim()) onReport(text, instruction);
    } catch (e) {
      if (!(e instanceof DOMException && e.name === "AbortError")) {
        setError(e instanceof Error ? e.message : "The analysis failed.");
      }
    } finally {
      setStreaming(false);
    }
  }

  function sendAnswers() {
    const filled = questions.map((q, i) => ({ question: q.question, answer: (answers[i] ?? "").trim() }));
    const all = [...answered, ...filled];
    setAnswered(all);
    run(all);
  }

  if (!open) {
    return (
      <button
        onClick={() => setOpen(true)}
        disabled={disabled}
        className="rounded-control border border-pine px-3.5 py-2 text-sm font-semibold text-pine disabled:opacity-40"
      >
        Analyse and draft a plan first
      </button>
    );
  }

  return (
    <div className="mt-3 rounded-card border border-rule bg-surface p-4">
      <div className="mb-0.5 text-sm font-semibold">Opening analysis</div>
      <p className="mb-3 text-xs text-ink-muted">
        The assistant reads everything on this form, today&rsquo;s market conditions and anything
        you add below. It will ask before assuming — answer its questions and it writes the
        analysis once, with them in hand.
      </p>

      <label className="block">
        <span className="mb-1 block text-xs text-ink-muted">
          Anything it should pay particular attention to?
        </span>
        <textarea
          value={instruction}
          onChange={(e) => setInstruction(e.target.value)}
          rows={3}
          placeholder="e.g. They're anxious about the concentration in one stock and want to retire early — focus there."
          className="w-full rounded-control border border-rule bg-surface px-2.5 py-2 text-sm focus:border-pine focus:outline-none focus:ring-1 focus:ring-pine"
        />
      </label>

      <div className="mt-3 flex flex-wrap items-center gap-2">
        <button
          onClick={() => {
            setAnswered([]);
            run([]);
          }}
          disabled={streaming}
          className="rounded-control bg-pine px-3.5 py-2 text-sm font-semibold text-on-accent disabled:opacity-40"
        >
          {streaming ? "Reading…" : report ? "Run again" : "Start analysis"}
        </button>
        {answered.length > 0 ? (
          <span className="text-xs text-ink-muted">
            {answered.length} question{answered.length === 1 ? "" : "s"} answered
          </span>
        ) : null}
      </div>

      {error ? (
        <div className="mt-3 rounded-control border border-loss px-3 py-2 text-xs text-loss">{error}</div>
      ) : null}

      {guardrail.length > 0 ? (
        <div className="mt-3 rounded-control border border-brass bg-brass-tint px-3 py-2 text-xs">
          Flagged for review before this goes to a client:{" "}
          {guardrail.map((f) => f.explanation).join(" ")}
        </div>
      ) : null}

      {questions.length > 0 ? (
        <div className="mt-3 rounded-card border border-brass bg-brass-tint p-3">
          <div className="mb-2 text-sm font-semibold">
            Before it writes, it needs {questions.length} thing{questions.length === 1 ? "" : "s"}{" "}
            clarified
          </div>
          <div className="flex flex-col gap-3">
            {questions.map((q, i) => (
              <div key={i}>
                <div className="text-sm">{q.question}</div>
                <div className="mb-1 text-xs text-ink-muted">{q.why}</div>
                <input
                  value={answers[i] ?? ""}
                  onChange={(e) => setAnswers((prev) => ({ ...prev, [i]: e.target.value }))}
                  placeholder="Your answer — or say it isn't known"
                  className="w-full rounded-control border border-rule bg-surface px-2.5 py-1.5 text-sm"
                />
              </div>
            ))}
          </div>
          <button
            onClick={sendAnswers}
            disabled={streaming}
            className="mt-3 rounded-control bg-pine px-3 py-1.5 text-xs font-semibold text-on-accent disabled:opacity-40"
          >
            Send answers and write the analysis
          </button>
        </div>
      ) : null}

      {report ? (
        <div className="mt-3 border-t border-rule pt-3">
          <Report text={report} streaming={streaming} />
          {!streaming ? (
            <p className="mt-3 text-xs text-ink-muted">
              Creating the household files this analysis against it, in Activity.
            </p>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}

/** Four fixed headings and bullets. Rendering those directly rather than
 * pulling in a markdown dependency for two constructs. */
function Report({ text, streaming }: { text: string; streaming: boolean }) {
  return (
    <div className="text-sm leading-relaxed">
      {text.split("\n").map((line, i) => {
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
      {streaming ? (
        <span className="ml-0.5 inline-block h-3.5 w-1.5 animate-pulse bg-pine align-middle" />
      ) : null}
    </div>
  );
}
