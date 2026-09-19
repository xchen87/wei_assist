"use client";

import { useState } from "react";
import Link from "next/link";
import { formatMoney } from "@/lib/format/money";

type Prospect = { id: string; name: string; estValueCents: number; advisorName: string };
type Advisor = { id: string; name: string };

type MemberRow = { name: string; role: string; age: string; occupation: string };
type GoalRow = { name: string; priority: string };

const STEPS = ["Start", "Household basics", "Members", "Goals", "Review"];
const SEGMENTS = ["Core", "Premier", "Founding"];
const ROLES = ["Primary", "Spouse", "Dependent"];
const PRIORITIES = ["Low", "Medium", "High"];

const emptyMember = (): MemberRow => ({ name: "", role: "Primary", age: "", occupation: "" });
const emptyGoal = (): GoalRow => ({ name: "", priority: "Medium" });
const INPUT_CLASS = "w-full rounded-control border border-rule bg-surface px-2.5 py-2 text-sm text-ink";

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
export function IntakeWizard({ prospects, advisors }: { prospects: Prospect[]; advisors: Advisor[] }) {
  const [step, setStep] = useState(0);
  const [prospectId, setProspectId] = useState<string | null>(null);
  const [name, setName] = useState("");
  const [segment, setSegment] = useState("Core");
  const [advisorId, setAdvisorId] = useState(advisors[0]?.id ?? "");
  const [clientSinceYear] = useState(new Date().getUTCFullYear());
  const [members, setMembers] = useState<MemberRow[]>([emptyMember()]);
  const [goals, setGoals] = useState<GoalRow[]>([emptyGoal()]);

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
                  i < step ? "bg-pine text-white" : i === step ? "border-2 border-pine text-pine" : "border border-rule text-ink-muted"
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
            <div className="mb-4 text-xs text-ink-muted">Everyone in this household&rsquo;s plan.</div>
            <div className="flex flex-col gap-3">
              {members.map((m, i) => (
                <div key={i} className="grid grid-cols-[1.4fr_1fr_0.7fr_1.2fr_auto] items-center gap-2">
                  <input value={m.name} onChange={(e) => updateMember(i, { name: e.target.value })} placeholder="Full name" className={INPUT_CLASS} />
                  <select value={m.role} onChange={(e) => updateMember(i, { role: e.target.value })} className={INPUT_CLASS}>
                    {ROLES.map((r) => (
                      <option key={r} value={r}>
                        {r}
                      </option>
                    ))}
                  </select>
                  <input value={m.age} onChange={(e) => updateMember(i, { age: e.target.value })} placeholder="Age" className={INPUT_CLASS} />
                  <input
                    value={m.occupation}
                    onChange={(e) => updateMember(i, { occupation: e.target.value })}
                    placeholder="Occupation"
                    className={INPUT_CLASS}
                  />
                  <button
                    onClick={() => setMembers((rows) => rows.filter((_, ri) => ri !== i))}
                    disabled={members.length === 1}
                    className="rounded-control border border-rule px-2 py-1.5 text-xs text-ink-muted disabled:opacity-30"
                  >
                    Remove
                  </button>
                </div>
              ))}
            </div>
            <button onClick={() => setMembers((rows) => [...rows, emptyMember()])} className="mt-3 text-sm font-semibold text-pine hover:underline">
              + Add member
            </button>
          </div>
        )}

        {step === 3 && (
          <div>
            <div className="mb-1 text-sm font-semibold">Initial goals</div>
            <div className="mb-4 text-xs text-ink-muted">Optional — can also be added later from the Goals section.</div>
            <div className="flex flex-col gap-3">
              {goals.map((g, i) => (
                <div key={i} className="grid grid-cols-[2fr_1fr_auto] items-center gap-2">
                  <input value={g.name} onChange={(e) => updateGoal(i, { name: e.target.value })} placeholder="e.g. Retirement" className={INPUT_CLASS} />
                  <select value={g.priority} onChange={(e) => updateGoal(i, { priority: e.target.value })} className={INPUT_CLASS}>
                    {PRIORITIES.map((p) => (
                      <option key={p} value={p}>
                        {p}
                      </option>
                    ))}
                  </select>
                  <button
                    onClick={() => setGoals((rows) => rows.filter((_, ri) => ri !== i))}
                    disabled={goals.length === 1}
                    className="rounded-control border border-rule px-2 py-1.5 text-xs text-ink-muted disabled:opacity-30"
                  >
                    Remove
                  </button>
                </div>
              ))}
            </div>
            <button onClick={() => setGoals((rows) => [...rows, emptyGoal()])} className="mt-3 text-sm font-semibold text-pine hover:underline">
              + Add goal
            </button>
          </div>
        )}

        {step === 4 && (
          <div>
            <div className="mb-4 text-sm font-semibold">Review</div>
            <dl className="mb-5 grid grid-cols-2 gap-y-3 text-sm">
              <dt className="text-ink-muted">Household</dt>
              <dd className="font-medium">{name || "—"}</dd>
              <dt className="text-ink-muted">Segment</dt>
              <dd>{segment}</dd>
              <dt className="text-ink-muted">Advisor</dt>
              <dd>{advisors.find((a) => a.id === advisorId)?.name ?? "—"}</dd>
              <dt className="text-ink-muted">Members</dt>
              <dd>{members.filter((m) => m.name.trim()).map((m) => m.name).join(", ") || "—"}</dd>
              <dt className="text-ink-muted">Initial goals</dt>
              <dd>{goals.filter((g) => g.name.trim()).map((g) => g.name).join(", ") || "None yet"}</dd>
              {prospectId && (
                <>
                  <dt className="text-ink-muted">Converted from</dt>
                  <dd>{prospects.find((p) => p.id === prospectId)?.name}</dd>
                </>
              )}
            </dl>
            <button
              disabled
              title="Not wired up in this build — see this component's file comment for why"
              className="rounded-control bg-pine px-4 py-2 text-sm font-semibold text-white opacity-50"
            >
              Create household
            </button>
            <div className="mt-2 text-xs text-ink-muted">
              Not wired up in this build — creating a real household means populating every plan section&rsquo;s
              starting state, a decision this pass doesn&rsquo;t make. See PROGRESS.md.
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
              className="rounded-control bg-pine px-3.5 py-1.5 text-sm font-semibold text-white disabled:opacity-40"
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
