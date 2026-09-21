"use client";

import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { projectScenario, type ScenarioGoal, type ScenarioMember } from "@/lib/calc/planning";
import { formatMoney } from "@/lib/format/money";
import { saveScenario } from "@/app/(app)/clients/[id]/planning/actions";
import { ScenarioFanChart } from "./scenario-fan-chart";

export type ExplorerBaseline = {
  members: ScenarioMember[];
  portfolioCents: number;
  annualRetirementSpendingCents: number;
  goals: ScenarioGoal[];
  realReturnPct: number;
  endAge: number;
};

/** The what-if surface. Levers on the left, outcome on the right,
 * recomputed on every change — a planning conversation is "what if she
 * goes at 62", and an advisor who has to press Calculate stops asking the
 * third question.
 *
 * The projection runs in the browser: it is pure arithmetic over a few
 * hundred paths (lib/calc/planning.ts), so a round trip per keystroke
 * would add latency for nothing. The baseline stays on screen throughout,
 * because a probability means very little except next to the one it
 * replaced. */
export function ScenarioExplorer({
  householdId,
  baseline,
  seed,
}: {
  householdId: string;
  baseline: ExplorerBaseline;
  seed: number;
}) {
  const router = useRouter();
  const [isSaving, startSaving] = useTransition();
  const [members, setMembers] = useState<ScenarioMember[]>(baseline.members);
  const [spending, setSpending] = useState(baseline.annualRetirementSpendingCents);
  const [realReturn, setRealReturn] = useState(baseline.realReturnPct);
  const [name, setName] = useState("");
  const [saved, setSaved] = useState<string | null>(null);

  const base = useMemo(
    () => projectScenario({ ...baseline, seed, volatilityPct: 11 }),
    [baseline, seed],
  );

  const current = useMemo(
    () =>
      projectScenario({
        ...baseline,
        members,
        annualRetirementSpendingCents: spending,
        realReturnPct: realReturn,
        seed,
        volatilityPct: 11,
      }),
    [baseline, members, spending, realReturn, seed],
  );

  const changed =
    spending !== baseline.annualRetirementSpendingCents ||
    realReturn !== baseline.realReturnPct ||
    members.some((m, i) => {
      const b = baseline.members[i]!;
      return (
        m.retirementAge !== b.retirementAge ||
        m.ssClaimAge !== b.ssClaimAge ||
        m.ssMonthlyBenefitCents !== b.ssMonthlyBenefitCents ||
        m.annualSavingsCents !== b.annualSavingsCents
      );
    });

  const delta = current.successProbabilityPct - base.successProbabilityPct;

  function update(id: string, patch: Partial<ScenarioMember>) {
    setMembers((rows) => rows.map((m) => (m.id === id ? { ...m, ...patch } : m)));
  }

  function reset() {
    setMembers(baseline.members);
    setSpending(baseline.annualRetirementSpendingCents);
    setRealReturn(baseline.realReturnPct);
    setSaved(null);
  }

  function save() {
    startSaving(async () => {
      await saveScenario(householdId, {
        name,
        note: "",
        retirementSpendingCents: spending === baseline.annualRetirementSpendingCents ? null : spending,
        realReturnPct: realReturn === baseline.realReturnPct ? null : realReturn,
        members: members.map((m, i) => {
          const b = baseline.members[i]!;
          return {
            memberId: m.id,
            retirementAge: m.retirementAge === b.retirementAge ? null : m.retirementAge,
            ssClaimAge: m.ssClaimAge === b.ssClaimAge ? null : m.ssClaimAge,
            ssMonthlyBenefitCents:
              m.ssMonthlyBenefitCents === b.ssMonthlyBenefitCents ? null : m.ssMonthlyBenefitCents,
            annualSavingsCents:
              m.annualSavingsCents === b.annualSavingsCents ? null : m.annualSavingsCents,
          };
        }),
      });
      setSaved(name.trim() || "Untitled scenario");
      setName("");
      router.refresh();
    });
  }

  const input = "rounded-control border border-rule bg-surface px-2 py-1.5 text-sm text-ink tabular";

  return (
    <div className="grid grid-cols-[minmax(320px,420px)_1fr] gap-6">
      <div className="flex flex-col gap-4">
        {members.map((m, i) => {
          const b = baseline.members[i]!;
          return (
            <div key={m.id} className="rounded-card border border-rule p-4">
              <div className="mb-0.5 text-sm font-semibold">{m.name}</div>
              <div className="mb-3 text-xs text-ink-muted">
                {m.role} · age {m.currentAge}
              </div>

              <div className="grid grid-cols-2 gap-2.5">
                <Lever
                  label="Retires at"
                  value={m.retirementAge}
                  baseline={b.retirementAge}
                  min={Math.max(40, m.currentAge)}
                  max={85}
                  onChange={(v) => update(m.id, { retirementAge: v })}
                />
                <Lever
                  label="Claims SS at"
                  value={m.ssClaimAge}
                  baseline={b.ssClaimAge}
                  min={62}
                  max={70}
                  onChange={(v) => update(m.id, { ssClaimAge: v })}
                />
                <label className="block">
                  <span className="mb-1 block text-xs text-ink-muted">Saves per year</span>
                  <input
                    className={`${input} w-full`}
                    value={Math.round(m.annualSavingsCents / 100)}
                    onChange={(e) =>
                      update(m.id, { annualSavingsCents: (Number(e.target.value) || 0) * 100 })
                    }
                  />
                </label>
                <label className="block">
                  <span className="mb-1 block text-xs text-ink-muted">SS estimate / month</span>
                  <input
                    className={`${input} w-full`}
                    value={Math.round(m.ssMonthlyBenefitCents / 100)}
                    onChange={(e) =>
                      update(m.id, { ssMonthlyBenefitCents: (Number(e.target.value) || 0) * 100 })
                    }
                  />
                </label>
              </div>
              {m.ssMonthlyBenefitCents === 0 ? (
                <div className="mt-2 text-xs text-ink-muted">
                  No Social Security estimate on file — enter the figure from their SSA statement to
                  include it.
                </div>
              ) : null}
            </div>
          );
        })}

        <div className="rounded-card border border-rule p-4">
          <div className="mb-3 text-sm font-semibold">Household</div>
          <div className="grid grid-cols-2 gap-2.5">
            <label className="block">
              <span className="mb-1 block text-xs text-ink-muted">Spending per year</span>
              <input
                className={`${input} w-full`}
                value={Math.round(spending / 100)}
                onChange={(e) => setSpending((Number(e.target.value) || 0) * 100)}
              />
            </label>
            <Lever
              label="Real return %"
              value={realReturn}
              baseline={baseline.realReturnPct}
              min={0}
              max={9}
              step={0.5}
              onChange={setRealReturn}
            />
          </div>
          <div className="mt-2 text-xs text-ink-muted">
            Return is a real (after-inflation) assumption, illustrative like every projection here.
          </div>
        </div>
      </div>

      <div className="flex flex-col gap-4">
        <div className="rounded-card border border-rule p-5">
          <div className="flex flex-wrap items-end justify-between gap-4">
            <div>
              <div className="text-xs text-ink-muted">Probability of success</div>
              <div className="flex items-baseline gap-3">
                <span
                  className={`tabular text-2xl font-bold ${
                    current.successProbabilityPct >= 80
                      ? "text-gain"
                      : current.successProbabilityPct >= 60
                        ? "text-brass"
                        : "text-loss"
                  }`}
                >
                  {current.successProbabilityPct}%
                </span>
                {changed ? (
                  <span
                    className={`tabular text-sm font-semibold ${delta > 0 ? "text-gain" : delta < 0 ? "text-loss" : "text-ink-muted"}`}
                  >
                    {delta > 0 ? "+" : delta < 0 ? "−" : "±"}
                    {Math.abs(delta)} pts vs plan of record
                  </span>
                ) : (
                  <span className="text-sm text-ink-muted">plan of record</span>
                )}
              </div>
            </div>

            <div className="text-right text-xs text-ink-muted">
              <div>
                Median at {baseline.endAge}:{" "}
                <span className="tabular font-semibold text-ink">
                  {formatMoney(current.medianEndingCents, { compact: true })}
                </span>
              </div>
              <div>
                Worst decile:{" "}
                <span className="tabular font-semibold text-ink">
                  {formatMoney(current.p10EndingCents, { compact: true })}
                </span>
              </div>
              {current.ssIncomeCents > 0 ? (
                <div>
                  Social Security:{" "}
                  <span className="tabular">{formatMoney(current.ssIncomeCents)}/yr</span>
                </div>
              ) : null}
            </div>
          </div>

          <div className="mt-4">
            <ScenarioFanChart current={current} baseline={changed ? base : null} />
          </div>

          {current.goalsAtRisk.length > 0 ? (
            <div className="mt-3 rounded-control border border-brass bg-brass-tint px-3 py-2 text-xs">
              Underfunded in more than a quarter of paths: {current.goalsAtRisk.join(", ")}.
            </div>
          ) : null}
        </div>

        <div className="rounded-card border border-rule p-4">
          <div className="mb-2 text-sm font-semibold">Keep this scenario</div>
          <div className="flex flex-wrap items-end gap-2">
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Retire at 63, spend $8K/mo"
              className="flex-1 rounded-control border border-rule bg-surface px-2.5 py-2 text-sm"
            />
            <button
              onClick={save}
              disabled={!changed || isSaving}
              title={changed ? undefined : "Move a lever first"}
              className="rounded-control bg-pine px-3.5 py-2 text-sm font-semibold text-on-accent disabled:opacity-40"
            >
              {isSaving ? "Saving…" : "Save scenario"}
            </button>
            <button
              onClick={reset}
              disabled={!changed}
              className="rounded-control border border-rule px-3 py-2 text-sm font-semibold disabled:opacity-40"
            >
              Reset
            </button>
          </div>
          {saved ? <div className="mt-2 text-xs text-ink-muted">Saved “{saved}”.</div> : null}
        </div>
      </div>
    </div>
  );
}

function Lever({
  label,
  value,
  baseline,
  min,
  max,
  step = 1,
  onChange,
}: {
  label: string;
  value: number;
  baseline: number;
  min: number;
  max: number;
  step?: number;
  onChange: (value: number) => void;
}) {
  const moved = value !== baseline;
  return (
    <label className="block">
      <span className="mb-1 flex items-baseline justify-between text-xs text-ink-muted">
        {label}
        <span className={`tabular font-semibold ${moved ? "text-pine" : "text-ink"}`}>
          {value}
          {moved ? <span className="font-normal text-ink-muted"> (was {baseline})</span> : null}
        </span>
      </span>
      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        className="w-full accent-pine"
      />
    </label>
  );
}
