/** Advisor working patterns (M-assist item 5, D-037): what the record shows
 * about how one advisor works, inferred from their own rows, and how those
 * patterns are allowed to bear on what the assistant suggests.
 *
 * Pure. Three inferences and two applications:
 *   - booking.weekdays / booking.hours — from meetings held or booked
 *   - cadence.<segment> — the share of a segment's reviews kept on time
 *   - alert-rule.<ruleKey> — acted on versus dismissed, per signal rule
 *   - orderSlots: preferred days and hours first
 *   - alertAdjustment: a modest, stated, downward nudge for a rule the
 *     advisor keeps dismissing — never for a high-severity line, and never
 *     enough to remove anything from the list.
 *
 * Every inferred value carries its evidence and sample size, because a
 * pattern the advisor cannot check is a guess with a confident face. */

export type WeekdaysValue = { kind: "weekdays"; days: number[]; shareByDay: Record<string, number> };
export type HoursValue = { kind: "hours"; startHours: number[]; countByHour: Record<string, number> };
export type CadenceValue = { kind: "cadence"; segment: string; onTimePct: number; households: number };
export type AlertRuleValue = {
  kind: "alert-rule";
  ruleKey: string;
  title: string;
  actedOn: number;
  dismissed: number;
  open: number;
  tendency: "acts" | "dismisses" | "mixed" | "none";
  /** Advisor-set: order this rule's lines lower in the brief. */
  muted: boolean;
};
export type PatternValue = WeekdaysValue | HoursValue | CadenceValue | AlertRuleValue;

export type Pattern = {
  key: string;
  label: string;
  value: PatternValue;
  evidence: string;
  sampleSize: number;
};

export type PatternInput = {
  meetings: { startsAt: Date; status: string }[];
  households: { segment: string; reviewStatus: string }[];
  alerts: { ruleKey: string; title: string; status: string; hasTask: boolean }[];
};

const WEEKDAY_NAMES = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
const MIN_MEETINGS = 5;
const DAY_SHARE_FLOOR = 0.15;
const MIN_HOUR_COUNT = 2;
const MAX_HOURS = 3;
const MIN_ALERT_HISTORY = 3;

export function inferPatterns(input: PatternInput): Pattern[] {
  const out: Pattern[] = [];
  const meetings = input.meetings.filter((m) => m.status === "held" || m.status === "confirmed");

  // Booking days and hours.
  if (meetings.length >= MIN_MEETINGS) {
    const byDay: Record<string, number> = {};
    const byHour: Record<string, number> = {};
    for (const m of meetings) {
      const d = String(m.startsAt.getUTCDay());
      byDay[d] = (byDay[d] ?? 0) + 1;
      const h = String(m.startsAt.getUTCHours() + (m.startsAt.getUTCMinutes() >= 30 ? 0.5 : 0));
      byHour[h] = (byHour[h] ?? 0) + 1;
    }
    const shareByDay: Record<string, number> = {};
    for (const [d, n] of Object.entries(byDay)) shareByDay[d] = Math.round((n / meetings.length) * 100) / 100;
    const days = Object.entries(shareByDay)
      .filter(([, share]) => share >= DAY_SHARE_FLOOR)
      .map(([d]) => Number(d))
      .sort((a, b) => a - b);
    const evidence = `${meetings.length} meetings held or booked`;
    out.push({
      key: "booking.weekdays",
      label: "Days you book",
      value: { kind: "weekdays", days, shareByDay },
      evidence: `${evidence}: ${days.map((d) => `${WEEKDAY_NAMES[d]} ${Math.round(shareByDay[String(d)]! * 100)}%`).join(", ")}`,
      sampleSize: meetings.length,
    });
    const startHours = Object.entries(byHour)
      .filter(([, n]) => n >= MIN_HOUR_COUNT)
      .sort((a, b) => b[1] - a[1] || Number(a[0]) - Number(b[0]))
      .slice(0, MAX_HOURS)
      .map(([h]) => Number(h))
      .sort((a, b) => a - b);
    out.push({
      key: "booking.hours",
      label: "Start times you favour",
      value: { kind: "hours", startHours, countByHour: byHour },
      evidence: `${evidence}: ${startHours.map((h) => `${hourLabel(h)} ×${byHour[String(h)]}`).join(", ") || "no start time used twice"}`,
      sampleSize: meetings.length,
    });
  }

  // Review cadence kept, per segment.
  const bySegment = new Map<string, { total: number; onTime: number }>();
  for (const h of input.households) {
    const s = bySegment.get(h.segment) ?? { total: 0, onTime: 0 };
    s.total += 1;
    if (h.reviewStatus === "scheduled") s.onTime += 1;
    bySegment.set(h.segment, s);
  }
  for (const [segment, s] of Array.from(bySegment.entries()).sort((a, b) => a[0].localeCompare(b[0]))) {
    const onTimePct = Math.round((s.onTime / s.total) * 100);
    out.push({
      key: `cadence.${segment}`,
      label: `${segment} reviews kept on time`,
      value: { kind: "cadence", segment, onTimePct, households: s.total },
      evidence: `${s.onTime} of ${s.total} ${segment} households have their next review booked; the rest are due or overdue`,
      sampleSize: s.total,
    });
  }

  // Signal rules acted on versus dismissed.
  const byRule = new Map<string, { title: string; actedOn: number; dismissed: number; open: number }>();
  for (const a of input.alerts) {
    const r = byRule.get(a.ruleKey) ?? { title: a.title, actedOn: 0, dismissed: 0, open: 0 };
    if (a.status === "dismissed") r.dismissed += 1;
    else if (a.status === "acknowledged" || a.hasTask) r.actedOn += 1;
    else r.open += 1;
    byRule.set(a.ruleKey, r);
  }
  for (const [ruleKey, r] of Array.from(byRule.entries()).sort((a, b) => a[0].localeCompare(b[0]))) {
    const history = r.actedOn + r.dismissed;
    const tendency: AlertRuleValue["tendency"] =
      history < MIN_ALERT_HISTORY ? "none" : r.actedOn >= 2 * r.dismissed ? "acts" : r.dismissed >= 2 * r.actedOn ? "dismisses" : "mixed";
    out.push({
      key: `alert-rule.${ruleKey}`,
      label: r.title,
      value: { kind: "alert-rule", ruleKey, title: r.title, actedOn: r.actedOn, dismissed: r.dismissed, open: r.open, tendency, muted: false },
      evidence:
        history === 0
          ? `${r.open} raised, none acted on or dismissed yet`
          : `${r.actedOn} acted on, ${r.dismissed} dismissed, ${r.open} still open`,
      sampleSize: history,
    });
  }

  return out;
}

export function hourLabel(h: number): string {
  const whole = Math.floor(h);
  const min = h % 1 >= 0.5 ? "30" : "00";
  const suffix = whole >= 12 ? "PM" : "AM";
  const twelve = whole % 12 === 0 ? 12 : whole % 12;
  return `${twelve}:${min} ${suffix}`;
}

export { WEEKDAY_NAMES };

// ---------------------------------------------------------------------------
// Applications

/** Preferred day and hour first, then preferred day, then the rest —
 * stable, so within a group the earlier slot still comes first. Never
 * drops a slot. */
export function orderSlots<T extends { startsAt: Date }>(slots: T[], booking: { days: number[]; startHours: number[] }): T[] {
  const rank = (s: T) => {
    const day = booking.days.includes(s.startsAt.getUTCDay());
    const hour = s.startsAt.getUTCHours() + (s.startsAt.getUTCMinutes() >= 30 ? 0.5 : 0);
    const hr = booking.startHours.includes(hour);
    return day && hr ? 0 : day ? 1 : 2;
  };
  return slots.map((s, i) => ({ s, i, r: rank(s) })).sort((a, b) => a.r - b.r || a.i - b.i).map((x) => x.s);
}

export const ALERT_ADJUSTMENT = { dismisses: -15, muted: -25 } as const;

/** How far, and why, a brief line for this rule moves down. Zero for a
 * high-severity line: a pattern may reorder ordinary noise, not a signal
 * the engine rated high. */
export function alertAdjustment(rule: AlertRuleValue | undefined, severity: string): { delta: number; note: string } | null {
  if (!rule || severity === "high") return null;
  if (rule.muted) return { delta: ALERT_ADJUSTMENT.muted, note: "You set this rule to order lower in the brief (Settings → AI)." };
  if (rule.tendency === "dismisses") {
    return {
      delta: ALERT_ADJUSTMENT.dismisses,
      note: `Ordered lower: you have dismissed this rule ${rule.dismissed} of ${rule.actedOn + rule.dismissed} times. Reset or mute it in Settings → AI.`,
    };
  }
  return null;
}
