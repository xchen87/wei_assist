"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { rerunAction, runScenarioAction } from "@/app/(app)/signals/actions";

export type IndicatorOption = {
  key: string;
  name: string;
  unit: string;
  value: number;
  category: string;
};

/** Move an indicator and run the book against it. This is the control the
 * demo turns on: the advisor picks a watched indicator, states where it
 * moved to, and watches the engine name the households it touches.
 *
 * Deliberately not a free-text "what if" box — the engine answers one
 * specific question ("this indicator is now X"), and a natural-language
 * front door would imply reasoning it doesn't do. */
export function ScenarioRunner({ indicators }: { indicators: IndicatorOption[] }) {
  const router = useRouter();
  const [isRunning, startRun] = useTransition();
  const [key, setKey] = useState(indicators[0]?.key ?? "");
  const [value, setValue] = useState(String(indicators[0]?.value ?? ""));
  const [note, setNote] = useState("");
  const [message, setMessage] = useState<string | null>(null);

  const selected = indicators.find((i) => i.key === key);
  const input = "rounded-control border border-rule bg-surface px-2.5 py-2 text-sm text-ink";

  function run() {
    setMessage(null);
    startRun(async () => {
      const result = await runScenarioAction(
        key,
        Number(value),
        note.trim() || `Simulated scenario: ${selected?.name ?? key} moves to ${value}`,
      );
      if ("error" in result) {
        setMessage(result.error);
        return;
      }
      setMessage(
        `${result.indicator} ${result.from} → ${result.to}: ${result.householdsAffected} of ${result.householdsEvaluated} households affected, ${result.alertsCreated} alerts raised.`,
      );
      router.refresh();
    });
  }

  return (
    <div className="rounded-card border border-rule bg-surface p-4">
      <div className="mb-1 text-sm font-semibold">Run a scenario</div>
      <div className="mb-3 text-xs text-ink-muted">
        Move a watched indicator and run every household against the rules. The same run happens on a
        schedule via <span className="tabular">pnpm signals</span>.
      </div>

      <div className="flex flex-wrap items-end gap-2">
        <label className="flex flex-col gap-1">
          <span className="text-xs text-ink-muted">Indicator</span>
          <select
            value={key}
            onChange={(e) => {
              setKey(e.target.value);
              setValue(String(indicators.find((i) => i.key === e.target.value)?.value ?? ""));
            }}
            className={`${input} w-64`}
          >
            {indicators.map((i) => (
              <option key={i.key} value={i.key}>
                {i.name} ({i.category})
              </option>
            ))}
          </select>
        </label>

        <label className="flex flex-col gap-1">
          <span className="text-xs text-ink-muted">
            Moves to{selected ? ` (now ${selected.value}${selected.unit === "%" ? "%" : ""})` : ""}
          </span>
          <input value={value} onChange={(e) => setValue(e.target.value)} className={`${input} tabular w-32`} />
        </label>

        <label className="flex min-w-[220px] flex-1 flex-col gap-1">
          <span className="text-xs text-ink-muted">Note (optional)</span>
          <input
            value={note}
            onChange={(e) => setNote(e.target.value)}
            placeholder="What happened, in one line"
            className={`${input} w-full`}
          />
        </label>

        <button
          onClick={run}
          disabled={isRunning || !key || value === ""}
          className="rounded-control bg-pine px-3.5 py-2 text-sm font-semibold text-on-accent disabled:opacity-40"
        >
          {isRunning ? "Running…" : "Run now"}
        </button>
        <button
          onClick={() =>
            startRun(async () => {
              const result = await rerunAction(key);
              setMessage(
                "error" in result
                  ? result.error
                  : `Re-ran ${result.indicator}: ${result.householdsAffected} of ${result.householdsEvaluated} affected.`,
              );
              router.refresh();
            })
          }
          disabled={isRunning || !key}
          className="rounded-control border border-rule px-3 py-2 text-sm font-semibold disabled:opacity-40"
          title="Evaluate the book against this indicator's last change again"
        >
          Re-run last
        </button>
      </div>

      {message ? <div className="mt-2.5 text-xs text-ink">{message}</div> : null}
    </div>
  );
}
