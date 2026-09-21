import { prisma } from "@meridian/db";
import { evaluateHousehold, type IndicatorSnapshot, type SignalHousehold } from "@/lib/calc/signals";

/** The runner: applies a change to its indicator, evaluates every household
 * against the rules, and writes the alerts. Called two ways — a "Run now"
 * button and `pnpm --filter @meridian/web signals`, which is what a cron
 * would call. No BullMQ here (D-014, no Redis in this sandbox) and a script
 * is more demoable anyway: you can trigger it mid-conversation.
 *
 * Re-running a scenario replaces that change's alerts rather than adding a
 * second copy, so demoing the same move twice doesn't double the inbox. */

export type ScenarioInput = { indicatorKey: string; toValue: number; note: string };

export type RunResult = {
  indicator: string;
  from: number;
  to: number;
  householdsEvaluated: number;
  householdsAffected: number;
  alertsCreated: number;
  changeId: string;
};

const SELECT = {
  id: true,
  name: true,
  aumCents: true,
  netWorthCents: true,
  cashPct: true,
  targetCashPct: true,
  cashCents: true,
  driftPct: true,
  equityActualPct: true,
  equityTargetPct: true,
  mortgageCents: true,
  taxableIncomeCents: true,
  harvestableLossesCents: true,
  monthlySpendingNeedCents: true,
  retirementAgePrimary: true,
  reviewStatus: true,
  members: { select: { age: true } },
} as const;

export async function runScenario(input: ScenarioInput): Promise<RunResult | { error: string }> {
  const indicator = await prisma.indicator.findUnique({ where: { key: input.indicatorKey } });
  if (!indicator) return { error: `No indicator with key "${input.indicatorKey}".` };
  if (input.toValue === indicator.value) {
    return { error: `${indicator.name} is already ${indicator.value}${indicator.unit === "%" ? "%" : ""}.` };
  }

  const from = indicator.value;
  const change = await prisma.indicatorChange.create({
    data: { indicatorId: indicator.id, fromValue: from, toValue: input.toValue, note: input.note },
  });
  await prisma.indicator.update({
    where: { id: indicator.id },
    data: { previousValue: from, value: input.toValue },
  });

  const snapshot: IndicatorSnapshot = {
    key: indicator.key,
    name: indicator.name,
    category: indicator.category,
    unit: indicator.unit,
    fromValue: from,
    toValue: input.toValue,
  };

  const households = await prisma.household.findMany({ select: SELECT });
  const affected = new Set<string>();
  const alerts: {
    householdId: string;
    changeId: string;
    ruleKey: string;
    severity: string;
    title: string;
    rationale: string;
    suggestedAction: string;
    section: string | null;
  }[] = [];

  for (const row of households) {
    const household: SignalHousehold = {
      ...row,
      memberAges: row.members.map((m) => m.age),
    };
    for (const match of evaluateHousehold(household, snapshot)) {
      affected.add(row.id);
      alerts.push({
        householdId: row.id,
        changeId: change.id,
        ruleKey: match.ruleKey,
        severity: match.severity,
        title: match.title,
        rationale: match.rationale,
        suggestedAction: match.suggestedAction,
        section: match.section ?? null,
      });
    }
  }

  if (alerts.length > 0) await prisma.alert.createMany({ data: alerts });

  return {
    indicator: indicator.name,
    from,
    to: input.toValue,
    householdsEvaluated: households.length,
    householdsAffected: affected.size,
    alertsCreated: alerts.length,
    changeId: change.id,
  };
}

/** Re-runs the most recent change for an indicator without moving it —
 * what the "Re-run" control does when an advisor wants the current book
 * evaluated against a change that already happened. */
export async function rerunLatest(indicatorKey: string): Promise<RunResult | { error: string }> {
  const indicator = await prisma.indicator.findUnique({
    where: { key: indicatorKey },
    include: { changes: { orderBy: { occurredAt: "desc" }, take: 1 } },
  });
  const last = indicator?.changes[0];
  if (!indicator || !last) return { error: "No change on record for that indicator yet." };

  await prisma.alert.deleteMany({ where: { changeId: last.id } });

  const snapshot: IndicatorSnapshot = {
    key: indicator.key,
    name: indicator.name,
    category: indicator.category,
    unit: indicator.unit,
    fromValue: last.fromValue,
    toValue: last.toValue,
  };

  const households = await prisma.household.findMany({ select: SELECT });
  const affected = new Set<string>();
  let created = 0;

  for (const row of households) {
    const matches = evaluateHousehold({ ...row, memberAges: row.members.map((m) => m.age) }, snapshot);
    if (matches.length === 0) continue;
    affected.add(row.id);
    await prisma.alert.createMany({
      data: matches.map((m) => ({
        householdId: row.id,
        changeId: last.id,
        ruleKey: m.ruleKey,
        severity: m.severity,
        title: m.title,
        rationale: m.rationale,
        suggestedAction: m.suggestedAction,
        section: m.section ?? null,
      })),
    });
    created += matches.length;
  }

  return {
    indicator: indicator.name,
    from: last.fromValue,
    to: last.toValue,
    householdsEvaluated: households.length,
    householdsAffected: affected.size,
    alertsCreated: created,
    changeId: last.id,
  };
}
