"use client";

import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { projectScenario, type ScenarioMember } from "@/lib/calc/planning";
import { formatMoney } from "@/lib/format/money";
import type { HouseholdBaseline } from "@/lib/planning/baseline";
import { describeChanges } from "@/lib/planning/describe";
import { saveScenario } from "@/app/(app)/clients/[id]/planning/actions";
import { ScenarioFanChart } from "./scenario-fan-chart";
import {
  Grid,
  MoneyLever,
  NumberLever,
  OptionalAgeLever,
  Panel,
  SliderLever,
  TextLever,
  ToggleLever,
} from "./lever-controls";

/** The what-if surface: levers on the left, outcome on the right,
 * recomputed on every change. A planning conversation is "what if she
 * goes at 62", and an advisor who has to press Calculate stops asking the
 * third question.
 *
 * The levers are grouped into four tabs rather than one long column, and
 * the outcome panel is sticky beside them, because the two things an
 * advisor must never lose sight of are the number and the lever they are
 * holding. Each tab carries a count of what has been moved inside it, so
 * nothing is hidden by being on another tab, and the chips under the chart
 * spell out every active change in full.
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
  baseline: HouseholdBaseline;
  seed: number;
}) {
  const router = useRouter();
  const [isSaving, startSaving] = useTransition();
  const [plan, setPlan] = useState<HouseholdBaseline>(baseline);
  const [tab, setTab] = useState<TabKey>("people");
  const [name, setName] = useState("");
  const [saved, setSaved] = useState<string | null>(null);

  const base = useMemo(() => projectScenario({ ...baseline, seed }), [baseline, seed]);
  const current = useMemo(() => projectScenario({ ...plan, seed }), [plan, seed]);

  const changes = useMemo(() => describeChanges(baseline, plan), [baseline, plan]);
  const changed = changes.length > 0;
  const delta = current.successProbabilityPct - base.successProbabilityPct;
  const counts = countByTab(baseline, plan);

  function set<K extends keyof HouseholdBaseline>(key: K, value: HouseholdBaseline[K]) {
    setPlan((p) => ({ ...p, [key]: value }));
  }

  function updateMember(id: string, patch: Partial<ScenarioMember>) {
    setPlan((p) => ({
      ...p,
      members: p.members.map((m) => {
        if (m.id !== id) return m;
        const next = { ...m, ...patch };
        // Moving a retirement age drags the two ages that were sitting on
        // it along: they default there precisely to mean "not set yet",
        // and leaving them behind would silently switch on a phased
        // retirement the advisor never asked for.
        if (patch.retirementAge !== undefined && patch.retirementAge !== m.retirementAge) {
          if (m.partTimeThroughAge === m.retirementAge) next.partTimeThroughAge = patch.retirementAge;
          if (m.pensionStartAge === m.retirementAge) next.pensionStartAge = patch.retirementAge;
        }
        return next;
      }),
    }));
  }

  function reset() {
    setPlan(baseline);
    setSaved(null);
  }

  function save() {
    startSaving(async () => {
      const diff = <T,>(value: T, before: T) => (value === before ? null : value);
      await saveScenario(householdId, {
        name,
        note: "",
        retirementSpendingCents: diff(
          plan.annualRetirementSpendingCents,
          baseline.annualRetirementSpendingCents,
        ),
        realReturnPct: diff(plan.realReturnPct, baseline.realReturnPct),
        volatilityPct: diff(plan.volatilityPct, baseline.volatilityPct),
        inflationPct: diff(plan.inflationPct, baseline.inflationPct),
        spendingShiftPct: diff(plan.spendingShiftPct, baseline.spendingShiftPct),
        spendingShiftAge: diff(plan.spendingShiftAge, baseline.spendingShiftAge),
        survivorSpendingPct: diff(plan.survivorSpendingPct, baseline.survivorSpendingPct),
        healthcareAnnualCents: diff(plan.healthcareAnnualCents, baseline.healthcareAnnualCents),
        healthcareFromAge: diff(plan.healthcareFromAge, baseline.healthcareFromAge),
        effectiveTaxRatePct: diff(plan.effectiveTaxRatePct, baseline.effectiveTaxRatePct),
        oneTimeInflowCents: diff(plan.oneTimeInflowCents, baseline.oneTimeInflowCents),
        oneTimeInflowYear: diff(plan.oneTimeInflowYear, baseline.oneTimeInflowYear),
        oneTimeInflowLabel: diff(plan.oneTimeInflowLabel, baseline.oneTimeInflowLabel),
        legacyTargetCents: diff(plan.legacyTargetCents, baseline.legacyTargetCents),
        endAge: diff(plan.endAge, baseline.endAge),
        members: plan.members.map((m, i) => {
          const b = baseline.members[i]!;
          return {
            memberId: m.id,
            retirementAge: diff(m.retirementAge, b.retirementAge),
            // Null here means "inherit the scenario's plan-to age", so a
            // member left on the household horizon stays on it even if the
            // household horizon is edited later.
            planToAge: m.planToAge === plan.endAge ? null : m.planToAge,
            ssClaimAge: diff(m.ssClaimAge, b.ssClaimAge),
            ssMonthlyBenefitCents: diff(m.ssMonthlyBenefitCents, b.ssMonthlyBenefitCents),
            annualSavingsCents: diff(m.annualSavingsCents, b.annualSavingsCents),
            savingsGrowthPct: diff(m.savingsGrowthPct, b.savingsGrowthPct),
            partTimeIncomeCents: diff(m.partTimeIncomeCents, b.partTimeIncomeCents),
            // The through-age and start-age only mean something once there
            // is an income to attach them to. Left alone they sit on the
            // retirement age and travel with it, and saving that would put
            // a delta in the record that the advisor never chose.
            partTimeThroughAge:
              m.partTimeIncomeCents > 0 ? diff(m.partTimeThroughAge, b.partTimeThroughAge) : null,
            pensionMonthlyCents: diff(m.pensionMonthlyCents, b.pensionMonthlyCents),
            pensionStartAge:
              m.pensionMonthlyCents > 0 ? diff(m.pensionStartAge, b.pensionStartAge) : null,
            pensionHasCola: m.pensionMonthlyCents > 0 ? diff(m.pensionHasCola, b.pensionHasCola) : null,
          };
        }),
      });
      setSaved(name.trim() || "Untitled scenario");
      setName("");
      router.refresh();
    });
  }

  const guaranteedCents = current.ssIncomeCents + current.pensionIncomeCents;

  return (
    <div className="grid gap-6 xl:grid-cols-[minmax(400px,470px)_1fr]">
      {/* ---------------------------------------------------- workbench */}
      <div className="order-2 xl:order-1">
        <div className="overflow-hidden rounded-card border border-rule bg-surface">
          <div className="flex border-b border-rule">
            {TABS.map((t) => {
              const active = t.key === tab;
              return (
                <button
                  key={t.key}
                  type="button"
                  onClick={() => setTab(t.key)}
                  className={`relative flex-1 px-2 py-2.5 text-xs font-semibold ${
                    active ? "text-pine" : "text-ink-muted hover:text-ink"
                  }`}
                >
                  {t.label}
                  {counts[t.key] > 0 ? (
                    <span className="ml-1.5 rounded-full bg-pine-tint px-1.5 py-0.5 text-[10px] tabular text-pine">
                      {counts[t.key]}
                    </span>
                  ) : null}
                  {active ? (
                    <span className="absolute inset-x-0 -bottom-px h-0.5 bg-pine" aria-hidden />
                  ) : null}
                </button>
              );
            })}
          </div>

          <div className="flex flex-col gap-4 p-4">
            {tab === "people" ? (
              plan.members.map((m, i) => {
                const b = baseline.members[i]!;
                return (
                  <div key={m.id} className="rounded-card border border-rule p-3.5">
                    <div className="mb-3 flex items-baseline justify-between">
                      <span className="text-sm font-semibold">{m.name}</span>
                      <span className="text-xs text-ink-muted">
                        {m.role} · age {m.currentAge} ·{" "}
                        {m.retirementAge > m.currentAge
                          ? `retires in ${m.retirementAge - m.currentAge} yrs`
                          : "retired"}
                      </span>
                    </div>

                    <Panel title="Work and longevity">
                      <Grid>
                        <SliderLever
                          label="Retires at"
                          value={m.retirementAge}
                          baseline={b.retirementAge}
                          min={Math.max(40, m.currentAge)}
                          max={85}
                          onChange={(v) => updateMember(m.id, { retirementAge: v })}
                        />
                        <SliderLever
                          label="Plan to age"
                          value={m.planToAge}
                          baseline={b.planToAge}
                          min={Math.max(m.currentAge + 1, 70)}
                          max={110}
                          onChange={(v) => updateMember(m.id, { planToAge: v })}
                        />
                        <MoneyLever
                          label="Part-time income"
                          valueCents={m.partTimeIncomeCents}
                          baselineCents={b.partTimeIncomeCents}
                          suffix="/yr"
                          onChange={(v) => updateMember(m.id, { partTimeIncomeCents: v })}
                        />
                        <NumberLever
                          label="Part-time through"
                          value={m.partTimeThroughAge}
                          baseline={b.partTimeThroughAge}
                          min={m.currentAge}
                          max={90}
                          onChange={(v) => updateMember(m.id, { partTimeThroughAge: v })}
                        />
                      </Grid>
                    </Panel>

                    <div className="pt-4" />
                    <Panel title="Guaranteed income">
                      <Grid>
                        <SliderLever
                          label="Claims SS at"
                          value={m.ssClaimAge}
                          baseline={b.ssClaimAge}
                          min={62}
                          max={70}
                          onChange={(v) => updateMember(m.id, { ssClaimAge: v })}
                        />
                        <MoneyLever
                          label="SS estimate"
                          valueCents={m.ssMonthlyBenefitCents}
                          baselineCents={b.ssMonthlyBenefitCents}
                          suffix="/mo"
                          onChange={(v) => updateMember(m.id, { ssMonthlyBenefitCents: v })}
                        />
                        <MoneyLever
                          label="Pension"
                          valueCents={m.pensionMonthlyCents}
                          baselineCents={b.pensionMonthlyCents}
                          suffix="/mo"
                          onChange={(v) => updateMember(m.id, { pensionMonthlyCents: v })}
                        />
                        <NumberLever
                          label="Pension starts at"
                          value={m.pensionStartAge}
                          baseline={b.pensionStartAge}
                          min={m.currentAge}
                          max={90}
                          onChange={(v) => updateMember(m.id, { pensionStartAge: v })}
                        />
                        {m.pensionMonthlyCents > 0 ? (
                          <ToggleLever
                            label="Pension adjusts for inflation"
                            value={m.pensionHasCola}
                            onChange={(v) => updateMember(m.id, { pensionHasCola: v })}
                          />
                        ) : null}
                      </Grid>
                      {m.ssMonthlyBenefitCents === 0 ? (
                        <p className="mt-2 text-xs text-ink-muted">
                          No Social Security estimate on file — enter the figure from their SSA
                          statement to include it.
                        </p>
                      ) : null}
                      {m.pensionMonthlyCents > 0 && !m.pensionHasCola && plan.inflationPct === 0 ? (
                        <p className="mt-2 text-xs text-ink-muted">
                          A level pension only loses ground once an inflation rate is set, under
                          Markets &amp; tax.
                        </p>
                      ) : null}
                    </Panel>

                    <div className="pt-4" />
                    <Panel title="Saving">
                      <Grid>
                        <MoneyLever
                          label="Saves"
                          valueCents={m.annualSavingsCents}
                          baselineCents={b.annualSavingsCents}
                          suffix="/yr"
                          onChange={(v) => updateMember(m.id, { annualSavingsCents: v })}
                        />
                        <NumberLever
                          label="Steps up"
                          value={m.savingsGrowthPct}
                          baseline={b.savingsGrowthPct}
                          suffix="%"
                          min={-10}
                          max={15}
                          step={0.5}
                          onChange={(v) => updateMember(m.id, { savingsGrowthPct: v })}
                        />
                      </Grid>
                      <p className="mt-2 text-xs text-ink-muted">
                        A step-up is real, above inflation: 0% keeps contributions at today&rsquo;s
                        purchasing power.
                      </p>
                    </Panel>
                  </div>
                );
              })
            ) : null}

            {tab === "spending" ? (
              <>
                <Panel
                  title="Retirement spending"
                  hint="What the household needs each year once the first person stops working, in today's dollars."
                >
                  <Grid>
                    <MoneyLever
                      label="Spending"
                      valueCents={plan.annualRetirementSpendingCents}
                      baselineCents={baseline.annualRetirementSpendingCents}
                      suffix="/yr"
                      onChange={(v) => set("annualRetirementSpendingCents", v)}
                    />
                  </Grid>
                </Panel>

                <Panel
                  title="How spending changes"
                  hint="Few households spend the same at 85 as at 65. A negative shift is the usual case; leave the age unset to hold spending flat."
                >
                  <Grid>
                    <NumberLever
                      label="Spending changes by"
                      value={plan.spendingShiftPct}
                      baseline={baseline.spendingShiftPct}
                      suffix="%"
                      min={-60}
                      max={60}
                      step={5}
                      onChange={(v) => set("spendingShiftPct", v)}
                    />
                    <OptionalAgeLever
                      label="Starting at age"
                      value={plan.spendingShiftAge}
                      placeholder="e.g. 80"
                      onChange={(v) => set("spendingShiftAge", v)}
                    />
                  </Grid>
                </Panel>

                <Panel
                  title="Survivor"
                  hint="What the household spends once one member is gone. 100% assumes no reduction — the neutral starting point, not a finding."
                >
                  <Grid>
                    <NumberLever
                      label="Survivor spends"
                      value={plan.survivorSpendingPct}
                      baseline={baseline.survivorSpendingPct}
                      suffix="%"
                      min={40}
                      max={100}
                      step={5}
                      onChange={(v) => set("survivorSpendingPct", v)}
                    />
                  </Grid>
                </Panel>

                <Panel
                  title="Health and long-term care"
                  hint="A cost on top of ordinary spending, from the age the advisor expects it to begin."
                >
                  <Grid>
                    <MoneyLever
                      label="Care cost"
                      valueCents={plan.healthcareAnnualCents}
                      baselineCents={baseline.healthcareAnnualCents}
                      suffix="/yr"
                      onChange={(v) => set("healthcareAnnualCents", v)}
                    />
                    <OptionalAgeLever
                      label="From age"
                      value={plan.healthcareFromAge}
                      placeholder="e.g. 85"
                      onChange={(v) => set("healthcareFromAge", v)}
                    />
                  </Grid>
                </Panel>
              </>
            ) : null}

            {tab === "markets" ? (
              <>
                <Panel
                  title="Portfolio assumptions"
                  hint="Return is real, after inflation. Volatility is the spread the fan chart is drawn from — a more conservative allocation is a lower return and a narrower spread together."
                >
                  <Grid>
                    <SliderLever
                      label="Real return"
                      value={plan.realReturnPct}
                      baseline={baseline.realReturnPct}
                      min={0}
                      max={9}
                      step={0.5}
                      onChange={(v) => set("realReturnPct", v)}
                    />
                    <SliderLever
                      label="Volatility"
                      value={plan.volatilityPct}
                      baseline={baseline.volatilityPct}
                      min={2}
                      max={22}
                      step={1}
                      onChange={(v) => set("volatilityPct", v)}
                    />
                  </Grid>
                </Panel>

                <Panel
                  title="Tax"
                  hint="One effective rate, grossed up on portfolio withdrawals so the household nets its spending. Not a tax calculation: there is no withdrawal ordering or bracket model here."
                >
                  <Grid>
                    <NumberLever
                      label="Effective rate on draws"
                      value={plan.effectiveTaxRatePct}
                      baseline={baseline.effectiveTaxRatePct}
                      suffix="%"
                      min={0}
                      max={60}
                      step={1}
                      onChange={(v) => set("effectiveTaxRatePct", v)}
                    />
                  </Grid>
                </Panel>

                <Panel
                  title="Inflation"
                  hint="Used only to erode income that does not adjust — a level pension. Everything else here is already in today's dollars, and Social Security's COLA is statutory."
                >
                  <Grid>
                    <NumberLever
                      label="Inflation"
                      value={plan.inflationPct}
                      baseline={baseline.inflationPct}
                      suffix="%"
                      min={0}
                      max={8}
                      step={0.5}
                      onChange={(v) => set("inflationPct", v)}
                    />
                  </Grid>
                </Panel>
              </>
            ) : null}

            {tab === "events" ? (
              <>
                <Panel
                  title="One-time inflow"
                  hint="An inheritance, a business sale, a downsize — money that arrives once, in a year the advisor names."
                >
                  <Grid>
                    <MoneyLever
                      label="Amount"
                      valueCents={plan.oneTimeInflowCents}
                      baselineCents={baseline.oneTimeInflowCents}
                      onChange={(v) => set("oneTimeInflowCents", v)}
                    />
                    <NumberLever
                      label="Years from now"
                      value={plan.oneTimeInflowYear}
                      baseline={baseline.oneTimeInflowYear}
                      suffix="yr"
                      min={0}
                      max={40}
                      onChange={(v) => set("oneTimeInflowYear", v)}
                    />
                    <div className="col-span-2">
                      <TextLever
                        label="What it is"
                        value={plan.oneTimeInflowLabel ?? ""}
                        placeholder="e.g. Sale of the practice"
                        onChange={(v) => set("oneTimeInflowLabel", v || null)}
                      />
                    </div>
                  </Grid>
                </Panel>

                <Panel
                  title="Legacy"
                  hint="With a target set, success means ending at or above it rather than merely not running out."
                >
                  <Grid>
                    <MoneyLever
                      label="Leave behind"
                      valueCents={plan.legacyTargetCents}
                      baselineCents={baseline.legacyTargetCents}
                      onChange={(v) => set("legacyTargetCents", v)}
                    />
                  </Grid>
                </Panel>

                <Panel
                  title="Plan horizon"
                  hint="The household's plan-to age. Members keep this unless given one of their own on the People tab."
                >
                  <Grid>
                    <SliderLever
                      label="Plan to age"
                      value={plan.endAge}
                      baseline={baseline.endAge}
                      min={75}
                      max={110}
                      onChange={(v) =>
                        setPlan((p) => ({
                          ...p,
                          endAge: v,
                          members: p.members.map((m) =>
                            m.planToAge === p.endAge ? { ...m, planToAge: v } : m,
                          ),
                        }))
                      }
                    />
                  </Grid>
                </Panel>
              </>
            ) : null}
          </div>
        </div>
      </div>

      {/* ------------------------------------------------------ outcome */}
      <div className="order-1 xl:order-2">
        <div className="flex flex-col gap-4 xl:sticky xl:top-4">
          <div className="rounded-card border border-rule bg-surface p-5">
            <div className="flex flex-wrap items-start justify-between gap-4">
              <div>
                <div className="text-xs text-ink-muted">Probability of success</div>
                <div className="flex items-baseline gap-3">
                  <span
                    className={`tabular text-3xl font-bold ${probabilityTone(current.successProbabilityPct)}`}
                  >
                    {current.successProbabilityPct}%
                  </span>
                  {changed ? (
                    <span
                      className={`tabular text-sm font-semibold ${
                        delta > 0 ? "text-gain" : delta < 0 ? "text-loss" : "text-ink-muted"
                      }`}
                    >
                      {delta > 0 ? "+" : delta < 0 ? "−" : "±"}
                      {Math.abs(delta)} pts vs plan of record ({base.successProbabilityPct}%)
                    </span>
                  ) : (
                    <span className="text-sm text-ink-muted">plan of record</span>
                  )}
                </div>
              </div>

              <div className="flex gap-2">
                <button
                  onClick={reset}
                  disabled={!changed}
                  className="rounded-control border border-rule px-3 py-1.5 text-xs font-semibold disabled:opacity-40"
                >
                  Reset levers
                </button>
              </div>
            </div>

            <dl className="mt-4 grid grid-cols-2 gap-x-5 gap-y-3 border-t border-rule pt-3.5">
              <Stat
                label="Median at plan end"
                value={formatMoney(current.medianEndingCents, { compact: true })}
              />
              <Stat
                label="Worst decile"
                value={formatMoney(current.p10EndingCents, { compact: true })}
              />
              <Stat
                label="Guaranteed income"
                value={
                  guaranteedCents > 0 ? `${formatMoney(guaranteedCents, { compact: true })}/yr` : "None on file"
                }
              />
              <Stat
                label="First retirement"
                value={
                  current.firstRetirementYear === 0
                    ? "Already"
                    : `${current.firstRetirementYear} yrs`
                }
              />
            </dl>

            <div className="mt-4">
              <ScenarioFanChart current={current} baseline={changed ? base : null} />
            </div>

            {current.goalsAtRisk.length > 0 ? (
              <div className="mt-3 rounded-control border border-brass bg-brass-tint px-3 py-2 text-xs">
                Underfunded in more than a quarter of paths: {current.goalsAtRisk.join(", ")}.
              </div>
            ) : null}

            {current.medianDepletionYear !== null && plan.members[0] ? (
              <p className="mt-3 text-xs text-ink-muted">
                Where the plan fails, the portfolio is typically exhausted around{" "}
                <span className="tabular font-semibold text-ink">
                  {current.medianDepletionYear} years
                </span>{" "}
                from now — {plan.members[0].name.split(" ")[0]} at{" "}
                <span className="tabular font-semibold text-ink">
                  {plan.members[0].currentAge + current.medianDepletionYear}
                </span>
                .
              </p>
            ) : null}
          </div>

          <div className="rounded-card border border-rule bg-surface p-4">
            <div className="mb-2 text-sm font-semibold">
              {changed ? "What this scenario changes" : "Keep this scenario"}
            </div>

            {changed ? (
              <div className="mb-3 flex flex-wrap gap-1.5">
                {changes.map((c) => (
                  <span
                    key={c}
                    className="rounded-control bg-pine-tint px-2 py-1 text-xs font-medium text-pine"
                  >
                    {c}
                  </span>
                ))}
              </div>
            ) : (
              <p className="mb-3 text-xs text-ink-muted">
                Move a lever to explore an alternative. Nothing is written until you save.
              </p>
            )}

            <div className="flex flex-wrap items-center gap-2">
              <input
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Name this scenario, e.g. Retire at 63, trim spending"
                className="min-w-[220px] flex-1 rounded-control border border-rule bg-surface px-2.5 py-2 text-sm focus:border-pine focus:outline-none focus:ring-1 focus:ring-pine"
              />
              <button
                onClick={save}
                disabled={!changed || isSaving}
                title={changed ? undefined : "Move a lever first"}
                className="rounded-control bg-pine px-3.5 py-2 text-sm font-semibold text-on-accent disabled:opacity-40"
              >
                {isSaving ? "Saving…" : "Save scenario"}
              </button>
            </div>
            {saved ? <div className="mt-2 text-xs text-ink-muted">Saved “{saved}”.</div> : null}
          </div>
        </div>
      </div>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <dt className="text-xs text-ink-muted">{label}</dt>
      <dd className="tabular text-sm font-semibold">{value}</dd>
    </div>
  );
}

function probabilityTone(pct: number): string {
  if (pct >= 80) return "text-gain";
  if (pct >= 60) return "text-brass";
  return "text-loss";
}

type TabKey = "people" | "spending" | "markets" | "events";

const TABS: { key: TabKey; label: string }[] = [
  { key: "people", label: "People" },
  { key: "spending", label: "Spending" },
  { key: "markets", label: "Markets & tax" },
  { key: "events", label: "Events" },
];

/** How many levers have been moved on each tab. A count on the tab is
 * what stops grouping from hiding anything: the advisor can see there are
 * two changes on Spending without opening it. */
function countByTab(
  baseline: HouseholdBaseline,
  plan: HouseholdBaseline,
): Record<TabKey, number> {
  const memberKeys: (keyof ScenarioMember)[] = [
    "retirementAge",
    "planToAge",
    "ssClaimAge",
    "ssMonthlyBenefitCents",
    "annualSavingsCents",
    "savingsGrowthPct",
    "partTimeIncomeCents",
    "pensionMonthlyCents",
  ];

  let people = 0;
  for (const [i, m] of plan.members.entries()) {
    const b = baseline.members[i];
    if (!b) continue;
    for (const key of memberKeys) if (m[key] !== b[key]) people++;
    // The ages attached to part-time work and a pension count only once
    // that income exists. Otherwise moving the retirement slider — which
    // drags both along — would report three changes for one decision.
    if (m.partTimeIncomeCents > 0 && m.partTimeThroughAge !== b.partTimeThroughAge) people++;
    if (m.pensionMonthlyCents > 0) {
      if (m.pensionStartAge !== b.pensionStartAge) people++;
      if (m.pensionHasCola !== b.pensionHasCola) people++;
    }
  }

  const count = (...pairs: [unknown, unknown][]) =>
    pairs.reduce((n, [a, b]) => n + (a === b ? 0 : 1), 0);

  return {
    people,
    spending: count(
      [plan.annualRetirementSpendingCents, baseline.annualRetirementSpendingCents],
      [plan.spendingShiftPct, baseline.spendingShiftPct],
      [plan.spendingShiftAge, baseline.spendingShiftAge],
      [plan.survivorSpendingPct, baseline.survivorSpendingPct],
      [plan.healthcareAnnualCents, baseline.healthcareAnnualCents],
      [plan.healthcareFromAge, baseline.healthcareFromAge],
    ),
    markets: count(
      [plan.realReturnPct, baseline.realReturnPct],
      [plan.volatilityPct, baseline.volatilityPct],
      [plan.inflationPct, baseline.inflationPct],
      [plan.effectiveTaxRatePct, baseline.effectiveTaxRatePct],
    ),
    events: count(
      [plan.oneTimeInflowCents, baseline.oneTimeInflowCents],
      [plan.oneTimeInflowYear, baseline.oneTimeInflowYear],
      [plan.oneTimeInflowLabel, baseline.oneTimeInflowLabel],
      [plan.legacyTargetCents, baseline.legacyTargetCents],
      [plan.endAge, baseline.endAge],
    ),
  };
}
