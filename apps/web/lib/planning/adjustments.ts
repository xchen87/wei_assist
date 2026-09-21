/**
 * The levers the assistant is allowed to propose, and what applying one
 * means.
 *
 * A proposal has to be *appliable*, or the Apply button is theatre. The
 * first version of this let the model name a lever in prose — "Karen's
 * retirement age" — which reads well and cannot be turned back into a
 * field without guessing. So the model picks from this catalogue instead:
 * a closed set of keys, each with the unit its value is quoted in. An
 * unknown key is rejected rather than interpreted.
 *
 * Values arrive in the unit an advisor would say out loud — years, ages,
 * percents, whole dollars — and are converted to the record's units here,
 * in one place.
 */

export type LeverScope = "household" | "member";
export type LeverUnit = "age" | "years" | "percent" | "dollars";

export type LeverSpec = {
  key: string;
  scope: LeverScope;
  label: string;
  unit: LeverUnit;
  /** Sanity bounds. A proposal outside them is refused, not clamped: a
   * retirement age of 200 is a model error, and quietly turning it into
   * 85 would hide that. */
  min: number;
  max: number;
};

export const LEVERS: LeverSpec[] = [
  // Per member.
  { key: "retirementAge", scope: "member", label: "retires at", unit: "age", min: 40, max: 85 },
  { key: "planToAge", scope: "member", label: "plans to age", unit: "age", min: 70, max: 110 },
  { key: "ssClaimAge", scope: "member", label: "claims Social Security at", unit: "age", min: 62, max: 70 },
  { key: "ssMonthlyBenefitCents", scope: "member", label: "Social Security estimate", unit: "dollars", min: 0, max: 20_000 },
  { key: "annualSavingsCents", scope: "member", label: "saves per year", unit: "dollars", min: 0, max: 5_000_000 },
  { key: "savingsGrowthPct", scope: "member", label: "savings step-up", unit: "percent", min: -10, max: 15 },
  { key: "partTimeIncomeCents", scope: "member", label: "part-time income", unit: "dollars", min: 0, max: 2_000_000 },
  { key: "partTimeThroughAge", scope: "member", label: "works part-time through", unit: "age", min: 40, max: 90 },
  { key: "pensionMonthlyCents", scope: "member", label: "pension", unit: "dollars", min: 0, max: 100_000 },
  { key: "pensionStartAge", scope: "member", label: "pension starts at", unit: "age", min: 40, max: 90 },
  // Household.
  { key: "retirementSpendingCents", scope: "household", label: "retirement spending", unit: "dollars", min: 0, max: 20_000_000 },
  { key: "spendingShiftPct", scope: "household", label: "spending changes by", unit: "percent", min: -60, max: 60 },
  { key: "spendingShiftAge", scope: "household", label: "spending shift starts at", unit: "age", min: 50, max: 110 },
  { key: "survivorSpendingPct", scope: "household", label: "survivor spends", unit: "percent", min: 40, max: 100 },
  { key: "healthcareAnnualCents", scope: "household", label: "long-term care cost", unit: "dollars", min: 0, max: 5_000_000 },
  { key: "healthcareFromAge", scope: "household", label: "care starts at", unit: "age", min: 50, max: 110 },
  { key: "effectiveTaxRatePct", scope: "household", label: "effective tax on withdrawals", unit: "percent", min: 0, max: 60 },
  { key: "legacyTargetCents", scope: "household", label: "legacy target", unit: "dollars", min: 0, max: 500_000_000 },
  { key: "endAge", scope: "household", label: "plan horizon", unit: "age", min: 75, max: 110 },
  // The assumption levers are here so the assistant can propose testing
  // one, and the comparison will then report it as a yardstick change
  // rather than a plan improvement.
  { key: "realReturnPct", scope: "household", label: "real return assumption", unit: "percent", min: 0, max: 9 },
  { key: "volatilityPct", scope: "household", label: "volatility assumption", unit: "percent", min: 2, max: 22 },
  { key: "inflationPct", scope: "household", label: "inflation assumption", unit: "percent", min: 0, max: 8 },
];

export const LEVER_BY_KEY = new Map(LEVERS.map((l) => [l.key, l]));

export type ProposedLever = {
  key: string;
  /** Required for a per-member lever; the first name is enough. */
  memberName?: string;
  value: number;
};

export type ResolvedLever = {
  spec: LeverSpec;
  memberId: string | null;
  memberName: string | null;
  /** In the record's units: cents for money, otherwise as given. */
  storedValue: number;
  /** What the advisor reads on the card. */
  display: string;
};

export function formatLeverValue(spec: LeverSpec, value: number): string {
  if (spec.unit === "dollars") return `$${Math.round(value).toLocaleString("en-US")}`;
  if (spec.unit === "percent") return `${value}%`;
  if (spec.unit === "age") return `age ${value}`;
  return `${value} yrs`;
}

/**
 * Turns a proposal into something that can be written, or explains why it
 * cannot be. Refusing is the common case worth getting right: a model
 * naming a lever that does not exist, or a member who is not in this
 * household, must not silently do nothing.
 */
export function resolveLever(
  proposed: ProposedLever,
  members: { id: string; name: string }[],
): { ok: true; lever: ResolvedLever } | { ok: false; reason: string } {
  const spec = LEVER_BY_KEY.get(proposed.key);
  if (!spec) return { ok: false, reason: `"${proposed.key}" is not a lever on this plan.` };

  if (!Number.isFinite(proposed.value)) {
    return { ok: false, reason: `No value given for ${spec.label}.` };
  }
  if (proposed.value < spec.min || proposed.value > spec.max) {
    return {
      ok: false,
      reason: `${formatLeverValue(spec, proposed.value)} is outside the range this plan accepts for ${spec.label}.`,
    };
  }

  let memberId: string | null = null;
  let memberName: string | null = null;
  if (spec.scope === "member") {
    const wanted = (proposed.memberName ?? "").trim().toLowerCase();
    if (!wanted) return { ok: false, reason: `${spec.label} needs a person.` };
    const match = members.find(
      (m) => m.name.toLowerCase() === wanted || m.name.toLowerCase().split(" ")[0] === wanted,
    );
    if (!match) return { ok: false, reason: `No one called "${proposed.memberName}" is in this household.` };
    memberId = match.id;
    memberName = match.name;
  }

  return {
    ok: true,
    lever: {
      spec,
      memberId,
      memberName,
      storedValue: spec.unit === "dollars" ? Math.round(proposed.value * 100) : proposed.value,
      display: formatLeverValue(spec, proposed.value),
    },
  };
}
