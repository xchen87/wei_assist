import { prisma } from "@meridian/db";
import { DAY_MS } from "@/lib/agenda";
import { inferPatterns, type AlertRuleValue, type HoursValue, type Pattern, type PatternValue, type WeekdaysValue } from "@/lib/calc/patterns";

/** Loads an advisor's working patterns, recomputing the inferred ones when
 * they are missing or a day old. A row the advisor set themselves
 * (`source: "advisor"`) is returned as is and never overwritten by
 * inference (D-037). */

export type LoadedPattern = Pattern & { source: "inferred" | "advisor"; computedAt: Date; updatedAt: Date };

export type PatternSet = {
  all: LoadedPattern[];
  booking: { days: number[]; startHours: number[] } | null;
  alertRules: Record<string, AlertRuleValue>;
};

const STALE_AFTER_MS = DAY_MS;

export async function loadPatterns(advisorId: string, now: Date = new Date()): Promise<PatternSet> {
  let rows = await prisma.advisorPattern.findMany({ where: { advisorId } });
  const inferred = rows.filter((r) => r.source === "inferred");
  const stale = inferred.length === 0 || inferred.some((r) => now.getTime() - r.computedAt.getTime() > STALE_AFTER_MS);
  if (stale) {
    await recomputePatterns(advisorId, now);
    rows = await prisma.advisorPattern.findMany({ where: { advisorId } });
  }
  return toSet(rows);
}

/** Re-infers every pattern from the advisor's rows. Advisor-set rows are
 * left alone; inferred rows that no longer have any evidence are removed
 * (a segment the advisor no longer serves, a rule that never fired). */
export async function recomputePatterns(advisorId: string, now: Date = new Date()): Promise<void> {
  const [meetings, households, alerts] = await Promise.all([
    prisma.meeting.findMany({ where: { advisorId }, select: { startsAt: true, status: true } }),
    prisma.household.findMany({ where: { advisorId }, select: { segment: true, reviewStatus: true } }),
    prisma.alert.findMany({
      where: { household: { advisorId } },
      select: { id: true, ruleKey: true, title: true, status: true },
    }),
  ]);
  const alertIdsWithTask = new Set(
    (await prisma.task.findMany({ where: { advisorId, alertId: { not: null } }, select: { alertId: true } })).map((t) => t.alertId!),
  );
  const patterns = inferPatterns({
    meetings,
    households,
    alerts: alerts.map((a) => ({ ruleKey: a.ruleKey, title: a.title, status: a.status, hasTask: alertIdsWithTask.has(a.id) })),
  });

  const advisorSet = new Set(
    (await prisma.advisorPattern.findMany({ where: { advisorId, source: "advisor" }, select: { key: true } })).map((r) => r.key),
  );
  const keep = new Set(patterns.map((p) => p.key));
  await prisma.advisorPattern.deleteMany({ where: { advisorId, source: "inferred", key: { notIn: Array.from(keep) } } });
  for (const p of patterns) {
    if (advisorSet.has(p.key)) continue;
    await prisma.advisorPattern.upsert({
      where: { advisorId_key: { advisorId, key: p.key } },
      create: { advisorId, key: p.key, source: "inferred", valueJson: JSON.stringify(p.value), evidence: p.evidence, sampleSize: p.sampleSize, computedAt: now },
      update: { valueJson: JSON.stringify(p.value), evidence: p.evidence, sampleSize: p.sampleSize, computedAt: now },
    });
  }
}

/** The advisor's own setting for a key. Kept as a row with source
 * "advisor" so recompute skips it; `evidence` says it was set by hand. */
export async function setAdvisorPattern(advisorId: string, key: string, value: PatternValue, label: string): Promise<void> {
  const now = new Date();
  await prisma.advisorPattern.upsert({
    where: { advisorId_key: { advisorId, key } },
    create: { advisorId, key, source: "advisor", valueJson: JSON.stringify(value), evidence: `Set by you (${label})`, sampleSize: 0, computedAt: now },
    update: { source: "advisor", valueJson: JSON.stringify(value), evidence: `Set by you (${label})`, sampleSize: 0, computedAt: now },
  });
}

/** Drops the advisor's own setting so inference fills the key again. */
export async function resetAdvisorPattern(advisorId: string, key: string): Promise<void> {
  await prisma.advisorPattern.deleteMany({ where: { advisorId, key } });
  await recomputePatterns(advisorId);
}

function toSet(rows: { key: string; source: string; valueJson: string; evidence: string; sampleSize: number; computedAt: Date; updatedAt: Date }[]): PatternSet {
  const all: LoadedPattern[] = [];
  for (const r of rows) {
    let value: PatternValue;
    try {
      value = JSON.parse(r.valueJson) as PatternValue;
    } catch {
      continue; // a corrupt row costs one pattern, not the page
    }
    all.push({ key: r.key, label: labelFor(r.key, value), value, evidence: r.evidence, sampleSize: r.sampleSize, source: r.source === "advisor" ? "advisor" : "inferred", computedAt: r.computedAt, updatedAt: r.updatedAt });
  }
  all.sort((a, b) => order(a.key) - order(b.key) || a.key.localeCompare(b.key));
  const days = all.find((p) => p.key === "booking.weekdays")?.value as WeekdaysValue | undefined;
  const hours = all.find((p) => p.key === "booking.hours")?.value as HoursValue | undefined;
  const alertRules: Record<string, AlertRuleValue> = {};
  for (const p of all) if (p.value.kind === "alert-rule") alertRules[p.value.ruleKey] = p.value;
  return { all, booking: days || hours ? { days: days?.days ?? [], startHours: hours?.startHours ?? [] } : null, alertRules };
}

function order(key: string): number {
  return key.startsWith("booking.") ? 0 : key.startsWith("cadence.") ? 1 : 2;
}

function labelFor(key: string, value: PatternValue): string {
  switch (value.kind) {
    case "weekdays":
      return "Days you book";
    case "hours":
      return "Start times you favour";
    case "cadence":
      return `${value.segment} reviews kept on time`;
    case "alert-rule":
      return value.title;
    default:
      return key;
  }
}
