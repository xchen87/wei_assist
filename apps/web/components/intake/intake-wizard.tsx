"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { formatMoney, absCents, parseDollarsToCents } from "@/lib/format/money";
import { ASSET_CLASS_LABEL } from "@/lib/calc/holdings";
import { MemberCard, surplusOf } from "./member-card";
import { AccountsStep, allocationOf } from "./accounts-step";
import { PropertyStep } from "./property-step";
import { AnalysisPanel } from "./analysis-panel";
import {
  GOAL_HORIZONS,
  GOAL_OPTIONS,
  INPUT_CLASS,
  PRIORITIES,
  ACCOUNT_KINDS,
  emptyAccount,
  emptyGoal,
  emptyMember,
  emptyOtherAsset,
  emptyProperty,
  ageFrom,
  type AccountRow,
  type GoalRow,
  type MemberRow,
  type OtherAssetRow,
  type PropertyRow,
} from "./intake-types";
import { maskSsn } from "@/lib/format/ssn";
import { scoreRiskTolerance } from "@/lib/calc/risk";
import { createHouseholdFromIntake } from "@/app/(app)/intake/create-household";

/** A formatted figure, or "" when nothing was entered — so the block can
 * say "not given" rather than "$0", which is a different claim. */
const moneyOrBlank = (value: string) => {
  const cents = parseDollarsToCents(value);
  return cents === null ? "" : formatMoney(cents);
};

const sumDollars = (values: string[]) =>
  values.reduce<bigint>((total, v) => total + (parseDollarsToCents(v) ?? 0n), 0n);

type Prospect = { id: string; name: string; estValueCents: number; advisorName: string };
type Advisor = { id: string; name: string };

const STEPS = ["Start", "Household basics", "Members", "Accounts", "Property", "Goals", "Review"];
const SEGMENTS = ["Core", "Premier", "Founding"];

/** New-client onboarding, distinct from Prospects (the pipeline before a
 * signed agreement) per CLAUDE.md §1's naming note — this starts once a
 * prospect reaches Agreement. Fully interactive (real step state, real
 * add/remove rows), but "Create household" is deliberately disabled: a
 * Household record has ~70 fields covering cashflow/balance/allocation/
 * retirement/tax figures this wizard never collects (a brand-new household
 * doesn't have plan data yet — that gets built up section by section after
 * intake, the same way every other seeded household's detail was derived,
 * not typed into a form). Wiring a real create means deciding what a
 * freshly-onboarded household's starting state looks like across every
 * section, which is a schema/product decision this pass doesn't make. */
export function IntakeWizard({
  prospects,
  advisors,
  securities,
}: {
  prospects: Prospect[];
  advisors: Advisor[];
  securities: { ticker: string; name: string; assetClass: string; kind: string }[];
}) {
  const router = useRouter();
  const [isCreating, startCreating] = useTransition();
  const [createError, setCreateError] = useState<string | null>(null);
  const [step, setStep] = useState(0);
  const [prospectId, setProspectId] = useState<string | null>(null);
  const [name, setName] = useState("");
  const [segment, setSegment] = useState("Core");
  const [advisorId, setAdvisorId] = useState(advisors[0]?.id ?? "");
  const [clientSinceYear] = useState(new Date().getUTCFullYear());
  const [members, setMembers] = useState<MemberRow[]>([emptyMember()]);
  const [goals, setGoals] = useState<GoalRow[]>([emptyGoal()]);
  const [accounts, setAccounts] = useState<AccountRow[]>([emptyAccount()]);
  const [properties, setProperties] = useState<PropertyRow[]>([emptyProperty()]);
  const [otherAssets, setOtherAssets] = useState<OtherAssetRow[]>([emptyOtherAsset()]);
  const [otherLiabilities, setOtherLiabilities] = useState("");
  // Kept so that creating the household files the analysis against it.
  const [analysis, setAnalysis] = useState<{ report: string; instruction: string } | null>(null);

  function pickProspect(p: Prospect | null) {
    setProspectId(p?.id ?? null);
    if (p) {
      setName(p.name);
      const advisor = advisors.find((a) => a.name === p.advisorName);
      if (advisor) setAdvisorId(advisor.id);
    }
    setStep(1);
  }

  function updateMember(i: number, patch: Partial<MemberRow>) {
    setMembers((rows) => rows.map((r, ri) => (ri === i ? { ...r, ...patch } : r)));
  }
  function updateGoal(i: number, patch: Partial<GoalRow>) {
    setGoals((rows) => rows.map((r, ri) => (ri === i ? { ...r, ...patch } : r)));
  }

  function create() {
    setCreateError(null);
    startCreating(async () => {
      const result = await createHouseholdFromIntake({
        name,
        segment,
        advisorId,
        prospectId,
        members: members.map((m) => ({
          name: m.name,
          role: m.role,
          birthDate: m.birthDate,
          occupation: m.occupation,
          annualIncome: m.annualIncome,
          annualExpenses: m.annualExpenses,
          risk: m.risk,
          // The social security number is deliberately not sent: there is
          // no encrypted column for it (CLAUDE.md §11, Phase 9), and a
          // plaintext one is not the thing to make easy.
        })),
        goals: goals.map((g) => ({ name: g.name, priority: g.priority, horizon: g.horizon })),
        accounts,
        properties,
        otherAssets,
        otherLiabilities,
        analysis: analysis ? { report: analysis.report, instruction: analysis.instruction } : null,
      });

      if (!result.ok) {
        setCreateError(result.error);
        return;
      }
      router.push(`/clients/${result.householdId}`);
    });
  }

  const namedMembers = members.filter((m) => m.name.trim());
  const portfolio = allocationOf(accounts);
  const propertyValue = sumDollars(properties.map((p) => p.value));
  const mortgageTotal = sumDollars(properties.map((p) => p.mortgage));
  const otherAssetValue = sumDollars(otherAssets.map((a) => a.value));
  const otherLiabilityCents = parseDollarsToCents(otherLiabilities) ?? 0n;
  const netWorthTotal =
    portfolio.totalCents + propertyValue + otherAssetValue - mortgageTotal - otherLiabilityCents;
  const householdIncome = sumDollars(members.map((m) => m.annualIncome));
  const householdExpenses = sumDollars(members.map((m) => m.annualExpenses));
  const namedGoals = goals.filter((g) => g.name.trim());

  const canAdvance =
    step === 0 ? true : step === 1 ? name.trim().length > 0 && advisorId : step === 2 ? members.some((m) => m.name.trim()) : true;

  return (
    <div>
      {/* Stepper */}
      <div className="mb-7 flex items-center">
        {STEPS.map((label, i) => (
          <div key={label} className="flex flex-1 items-center last:flex-none">
            <div className="flex flex-col items-center gap-1.5">
              <div
                className={`flex h-7 w-7 items-center justify-center rounded-full text-xs font-semibold ${
                  i < step ? "bg-pine text-on-accent" : i === step ? "border-2 border-pine text-pine" : "border border-rule text-ink-muted"
                }`}
              >
                {i + 1}
              </div>
              <div className={`text-xs ${i === step ? "font-semibold text-ink" : "text-ink-muted"}`}>{label}</div>
            </div>
            {i < STEPS.length - 1 && <div className={`mx-2 h-px flex-1 ${i < step ? "bg-pine" : "bg-rule"}`} />}
          </div>
        ))}
      </div>

      <div className="rounded-card border border-rule p-6">
        {step === 0 && (
          <div>
            <div className="mb-1 text-sm font-semibold">Start from a prospect, or from scratch</div>
            <div className="mb-4 text-xs text-ink-muted">
              Prospects that have reached Agreement are ready to onboard — picking one pre-fills what&rsquo;s already
              known.
            </div>
            <div className="mb-4 flex flex-col gap-2">
              {prospects.length === 0 && (
                <div className="rounded-control border border-dashed border-rule p-3 text-sm text-ink-muted">
                  No prospects have reached Agreement yet — see the{" "}
                  <Link href="/prospects" className="text-pine hover:underline">
                    Prospects
                  </Link>{" "}
                  pipeline.
                </div>
              )}
              {prospects.map((p) => (
                <button
                  key={p.id}
                  onClick={() => pickProspect(p)}
                  className="flex items-center justify-between rounded-control border border-rule px-3.5 py-2.5 text-left hover:border-pine hover:bg-pine-tint"
                >
                  <div>
                    <div className="text-sm font-medium">{p.name}</div>
                    <div className="text-xs text-ink-muted">Advisor: {p.advisorName}</div>
                  </div>
                  <div className="tabular text-sm text-ink-muted">{formatMoney(p.estValueCents, { compact: true })} est.</div>
                </button>
              ))}
            </div>
            <button
              onClick={() => pickProspect(null)}
              className="text-sm font-semibold text-pine hover:underline"
            >
              Start from scratch instead →
            </button>
          </div>
        )}

        {step === 1 && (
          <div>
            <div className="mb-4 text-sm font-semibold">Household basics</div>
            <div className="grid grid-cols-2 gap-4">
              <Field label="Household name">
                <input value={name} onChange={(e) => setName(e.target.value)} className={INPUT_CLASS} placeholder="e.g. Ferreira Household" />
              </Field>
              <Field label="Segment">
                <select value={segment} onChange={(e) => setSegment(e.target.value)} className={INPUT_CLASS}>
                  {SEGMENTS.map((s) => (
                    <option key={s} value={s}>
                      {s}
                    </option>
                  ))}
                </select>
              </Field>
              <Field label="Primary advisor">
                <select value={advisorId} onChange={(e) => setAdvisorId(e.target.value)} className={INPUT_CLASS}>
                  {advisors.map((a) => (
                    <option key={a.id} value={a.id}>
                      {a.name}
                    </option>
                  ))}
                </select>
              </Field>
              <Field label="Client since">
                <input value={clientSinceYear} disabled className={`${INPUT_CLASS} opacity-60`} />
              </Field>
            </div>
          </div>
        )}

        {step === 2 && (
          <div>
            <div className="mb-1 text-sm font-semibold">Members</div>
            <div className="mb-4 text-xs text-ink-muted">
              Everyone in this household&rsquo;s plan. Dates of birth rather than ages — an age typed
              today is wrong within a year. Figures here seed the Cashflow and Balance sections;
              the risk answers seed Allocation&rsquo;s suitability record.
            </div>
            <div className="flex flex-col gap-3">
              {members.map((m, i) => (
                <MemberCard
                  key={i}
                  index={i}
                  member={m}
                  canRemove={members.length > 1}
                  onChange={(patch) => updateMember(i, patch)}
                  onRemove={() => setMembers((rows) => rows.filter((_, ri) => ri !== i))}
                />
              ))}
            </div>
            <button
              onClick={() => setMembers((rows) => [...rows, emptyMember()])}
              className="mt-3 text-sm font-semibold text-pine hover:underline"
            >
              + Add member
            </button>
            <div className="mt-3 border-t border-rule pt-3 text-xs text-ink-muted">
              Social security numbers are held in this form only. There is no encrypted column to
              store one in yet (CLAUDE.md §11, Phase 9), so nothing here is saved or transmitted.
            </div>
          </div>
        )}

        {step === 3 && (
          <AccountsStep
            accounts={accounts}
            members={members}
            catalogue={securities}
            onChange={setAccounts}
          />
        )}

        {step === 4 && (
          <PropertyStep
            properties={properties}
            otherAssets={otherAssets}
            otherLiabilities={otherLiabilities}
            onChange={(patch) => {
              if (patch.properties) setProperties(patch.properties);
              if (patch.otherAssets) setOtherAssets(patch.otherAssets);
              if (patch.otherLiabilities !== undefined) setOtherLiabilities(patch.otherLiabilities);
            }}
          />
        )}

        {step === 5 && (
          <div>
            <div className="mb-1 text-sm font-semibold">Initial goals</div>
            <div className="mb-4 text-xs text-ink-muted">
              Optional — can also be added later from the Goals section. Pick from the common ones or
              choose Other to name your own.
            </div>
            <div className="mb-1.5 grid grid-cols-[2fr_1fr_1fr_auto] gap-2 text-xs text-ink-muted">
              <div>Goal</div>
              <div>Priority</div>
              <div>Time horizon</div>
              <div className="w-[70px]" />
            </div>
            <div className="flex flex-col gap-2">
              {goals.map((g, i) => {
                const listed = GOAL_OPTIONS.includes(g.name);
                // "Other" keeps the select on Other while the text box carries
                // the real name, so picking Other doesn't blank the row.
                const selectValue = g.name === "" ? "" : listed ? g.name : "Other";
                return (
                  <div key={i} className="grid grid-cols-[2fr_1fr_1fr_auto] items-start gap-2">
                    <div className="flex flex-col gap-1.5">
                      <select
                        value={selectValue}
                        onChange={(e) =>
                          updateGoal(i, { name: e.target.value === "Other" ? " " : e.target.value })
                        }
                        className={INPUT_CLASS}
                      >
                        <option value="">Choose a goal…</option>
                        {GOAL_OPTIONS.map((option) => (
                          <option key={option} value={option}>
                            {option}
                          </option>
                        ))}
                      </select>
                      {selectValue === "Other" && (
                        <input
                          value={g.name.trim()}
                          onChange={(e) => updateGoal(i, { name: e.target.value || " " })}
                          placeholder="Name this goal"
                          className={INPUT_CLASS}
                          autoFocus
                        />
                      )}
                    </div>
                    <select
                      value={g.priority}
                      onChange={(e) => updateGoal(i, { priority: e.target.value })}
                      className={INPUT_CLASS}
                    >
                      {PRIORITIES.map((p) => (
                        <option key={p} value={p}>
                          {p}
                        </option>
                      ))}
                    </select>
                    <select
                      value={g.horizon}
                      onChange={(e) => updateGoal(i, { horizon: e.target.value })}
                      className={INPUT_CLASS}
                    >
                      {GOAL_HORIZONS.map((h) => (
                        <option key={h} value={h}>
                          {h}
                        </option>
                      ))}
                    </select>
                    <button
                      onClick={() => setGoals((rows) => rows.filter((_, ri) => ri !== i))}
                      disabled={goals.length === 1}
                      className="w-[70px] rounded-control border border-rule px-2 py-2 text-xs text-ink-muted disabled:opacity-30"
                    >
                      Remove
                    </button>
                  </div>
                );
              })}
            </div>
            <button
              onClick={() => setGoals((rows) => [...rows, emptyGoal()])}
              className="mt-3 text-sm font-semibold text-pine hover:underline"
            >
              + Add goal
            </button>
          </div>
        )}

        {step === 6 && (
          <div>
            <div className="mb-4 text-sm font-semibold">Review</div>
            <dl className="mb-5 grid grid-cols-[140px_1fr] gap-y-3 text-sm">
              <dt className="text-ink-muted">Household</dt>
              <dd className="font-medium">{name || "—"}</dd>
              <dt className="text-ink-muted">Segment</dt>
              <dd>{segment}</dd>
              <dt className="text-ink-muted">Advisor</dt>
              <dd>{advisors.find((a) => a.id === advisorId)?.name ?? "—"}</dd>
              {prospectId && (
                <>
                  <dt className="text-ink-muted">Converted from</dt>
                  <dd>{prospects.find((p) => p.id === prospectId)?.name}</dd>
                </>
              )}
            </dl>

            <div className="mb-2 text-sm font-semibold">Members</div>
            <table className="mb-5 w-full border-collapse text-sm">
              <thead>
                <tr className="border-b border-rule text-xs font-semibold text-ink-muted">
                  <th className="py-2 text-left">Name</th>
                  <th className="py-2 text-left">Role</th>
                  <th className="py-2 text-right">Age</th>
                  <th className="py-2 text-right">SSN</th>
                  <th className="py-2 text-right">Annual</th>
                  <th className="py-2 text-left">Risk</th>
                </tr>
              </thead>
              <tbody>
                {namedMembers.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="py-2.5 text-ink-muted">
                      No members added.
                    </td>
                  </tr>
                ) : (
                  namedMembers.map((m, i) => {
                    const age = ageFrom(m.birthDate);
                    const surplus = surplusOf(m);
                    const risk = scoreRiskTolerance(m.risk);
                    return (
                      <tr key={i} className="border-b border-rule">
                        <td className="py-2.5 font-medium">{m.name}</td>
                        <td className="py-2.5 text-ink-muted">{m.role}</td>
                        <td className="tabular py-2.5 text-right">{age ?? "—"}</td>
                        <td className="tabular py-2.5 text-right text-ink-muted">{maskSsn(m.ssn)}</td>
                        <td
                          className={`tabular py-2.5 text-right ${
                            surplus === null ? "" : surplus >= 0n ? "text-gain" : "text-loss"
                          }`}
                        >
                          {surplus === null
                            ? "—"
                            : `${surplus >= 0n ? "+" : "−"}${formatMoney(absCents(surplus))}`}
                        </td>
                        <td className="py-2.5">
                          {risk.profile ?? (
                            <span className="text-brass">{risk.answered}/4 answered</span>
                          )}
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>

            <div className="mb-2 text-sm font-semibold">Portfolio and balance sheet</div>
            <table className="mb-5 w-full border-collapse text-sm">
              <tbody>
                <tr className="border-b border-rule">
                  <td className="py-2 text-ink-muted">Investment accounts</td>
                  <td className="tabular py-2 text-right">
                    {portfolio.totalCents > 0n ? formatMoney(portfolio.totalCents) : "Not entered"}
                  </td>
                  <td className="py-2 pl-4 text-xs text-ink-muted">
                    {portfolio.totalCents > 0n
                      ? Object.entries(portfolio.pct)
                          .map(([cls, pct]) => `${ASSET_CLASS_LABEL[cls] ?? cls} ${pct.toFixed(1)}%`)
                          .join(" · ")
                      : "Allocation will read 0% complete"}
                  </td>
                </tr>
                <tr className="border-b border-rule">
                  <td className="py-2 text-ink-muted">Real estate</td>
                  <td className="tabular py-2 text-right">{formatMoney(propertyValue)}</td>
                  <td className="py-2 pl-4 text-xs text-loss">
                    {mortgageTotal > 0n ? `less ${formatMoney(mortgageTotal)} of mortgage` : ""}
                  </td>
                </tr>
                <tr className="border-b border-rule">
                  <td className="py-2 text-ink-muted">Other assets</td>
                  <td className="tabular py-2 text-right">{formatMoney(otherAssetValue)}</td>
                  <td className="py-2 pl-4 text-xs text-loss">
                    {otherLiabilityCents > 0n ? `less ${formatMoney(otherLiabilityCents)} of other debt` : ""}
                  </td>
                </tr>
                <tr className="border-b border-rule font-semibold">
                  <td className="py-2">Net worth</td>
                  <td className="tabular py-2 text-right">{formatMoney(netWorthTotal)}</td>
                  <td />
                </tr>
              </tbody>
            </table>

            <div className="mb-2 text-sm font-semibold">Initial goals</div>
            {namedGoals.length === 0 ? (
              <div className="mb-5 text-sm text-ink-muted">None yet.</div>
            ) : (
              <table className="mb-5 w-full border-collapse text-sm">
                <thead>
                  <tr className="border-b border-rule text-xs font-semibold text-ink-muted">
                    <th className="py-2 text-left">GOAL</th>
                    <th className="py-2 text-left">PRIORITY</th>
                    <th className="py-2 text-left">TIME HORIZON</th>
                  </tr>
                </thead>
                <tbody>
                  {namedGoals.map((g, i) => (
                    <tr key={i} className="border-b border-rule">
                      <td className="py-2.5 font-medium">{g.name.trim()}</td>
                      <td className="py-2.5 text-ink-muted">{g.priority}</td>
                      <td className="py-2.5 text-ink-muted">{g.horizon}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}

            {/* Two ways out, and they are genuinely different work: take
                the household in as typed, or have the assistant read the
                whole picture first and hand back an opening analysis the
                household record then carries. */}
            <div className="flex flex-wrap items-center gap-2">
              <button
                onClick={create}
                disabled={isCreating || namedMembers.length === 0 || !name.trim()}
                className="rounded-control bg-pine px-4 py-2 text-sm font-semibold text-on-accent disabled:opacity-40"
              >
                {isCreating
                  ? "Creating…"
                  : analysis
                    ? "Create household with this analysis"
                    : "Create household"}
              </button>
              <AnalysisPanel
                disabled={namedMembers.length === 0 || !name.trim()}
                onReport={(report, instruction) => setAnalysis({ report, instruction })}
                buildIntake={(instruction, clarifications) => ({
                  householdName: name.trim(),
                  segment,
                  advisorInstruction: instruction,
                  members: namedMembers.map((m) => {
                    const risk = scoreRiskTolerance(m.risk);
                    return {
                      name: m.name.trim(),
                      role: m.role,
                      age: ageFrom(m.birthDate),
                      occupation: m.occupation.trim(),
                      annualIncome: moneyOrBlank(m.annualIncome),
                      annualExpenses: moneyOrBlank(m.annualExpenses),
                      riskProfile: risk.profile ?? "not scored",
                      riskComplete: risk.complete,
                    };
                  }),
                  goals: goals
                    .filter((g) => g.name.trim())
                    .map((g) => ({ name: g.name.trim(), priority: g.priority, horizon: g.horizon })),
                  accounts: accounts
                    .filter((a) => a.holdings.some((h) => h.ticker.trim() && parseDollarsToCents(h.marketValue)))
                    .map((a) => ({
                      name: a.name.trim() || "Account",
                      kind: ACCOUNT_KINDS.find((k) => k.value === a.kind)?.label ?? a.kind,
                      taxTreatment: ACCOUNT_KINDS.find((k) => k.value === a.kind)?.taxTreatment ?? "Taxable",
                      custodian: a.custodian.trim() || "not given",
                      owner: a.ownerName.trim() || "held jointly",
                      value: formatMoney(
                        a.holdings.reduce<bigint>((sum, h) => sum + (parseDollarsToCents(h.marketValue) ?? 0n), 0n),
                      ),
                      holdings: a.holdings
                        .filter((h) => h.ticker.trim() && parseDollarsToCents(h.marketValue))
                        .map((h) => ({
                          ticker: h.ticker.trim().toUpperCase(),
                          name: h.name.trim() || h.ticker.trim().toUpperCase(),
                          assetClass: ASSET_CLASS_LABEL[h.assetClass] ?? h.assetClass,
                          kind: h.kind,
                          value: formatMoney(parseDollarsToCents(h.marketValue) ?? 0n),
                          costBasis: moneyOrBlank(h.costBasis) || null,
                        })),
                    })),
                  allocation: Object.entries(portfolio.pct).map(([cls, pct]) => ({
                    label: ASSET_CLASS_LABEL[cls] ?? cls,
                    value: formatMoney(portfolio.byClass[cls] ?? 0n),
                    pct: `${pct.toFixed(1)}%`,
                  })),
                  portfolioTotal: formatMoney(portfolio.totalCents),
                  properties: properties
                    .filter((p) => p.label.trim() || parseDollarsToCents(p.value))
                    .map((p) => ({
                      label: p.label.trim() || "Property",
                      value: formatMoney(parseDollarsToCents(p.value) ?? 0n),
                      mortgage: formatMoney(parseDollarsToCents(p.mortgage) ?? 0n),
                    })),
                  otherAssets: otherAssets
                    .filter((a) => a.label.trim() || parseDollarsToCents(a.value))
                    .map((a) => ({
                      label: a.label.trim() || "Other asset",
                      value: formatMoney(parseDollarsToCents(a.value) ?? 0n),
                    })),
                  otherLiabilities: moneyOrBlank(otherLiabilities),
                  netWorth: formatMoney(netWorthTotal),
                  annualIncome: formatMoney(householdIncome),
                  annualExpenses: formatMoney(householdExpenses),
                  annualSurplus: formatMoney(householdIncome - householdExpenses),
                  clarifications,
                })}
              />
            </div>
            {createError ? <div className="mt-2 text-xs text-loss">{createError}</div> : null}
            <div className="mt-2 text-xs text-ink-muted">
              Sections this form doesn&rsquo;t cover — retirement, tax, protection, estate — start
              empty, and each section&rsquo;s completeness ring says so. Allocation is as complete
              as the accounts entered above. The social security number is not saved: there is no
              encrypted column for one yet (CLAUDE.md §11, Phase 9).
            </div>
          </div>
        )}
      </div>

      {step > 0 && (
        <div className="mt-4 flex justify-between">
          <button onClick={() => setStep((s) => Math.max(0, s - 1))} className="rounded-control border border-rule px-3.5 py-1.5 text-sm">
            ← Back
          </button>
          {step < STEPS.length - 1 && (
            <button
              onClick={() => setStep((s) => Math.min(STEPS.length - 1, s + 1))}
              disabled={!canAdvance}
              className="rounded-control bg-pine px-3.5 py-1.5 text-sm font-semibold text-on-accent disabled:opacity-40"
            >
              Continue →
            </button>
          )}
        </div>
      )}
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <div className="mb-1 text-xs text-ink-muted">{label}</div>
      {children}
    </label>
  );
}
