"use client";

import { useState, useTransition } from "react";
import { recomputePatternsAction, resetPatternAction, setAlertRuleMutedAction, setBookingDaysAction, setBookingHoursAction } from "@/app/(app)/settings/ai/actions";
import type { AlertRuleValue, HoursValue, WeekdaysValue } from "@/lib/calc/patterns";
import { hourLabel, WEEKDAY_NAMES } from "@/lib/calc/patterns";

const BTN = "rounded-control border border-rule bg-surface px-2.5 py-1 text-xs disabled:opacity-50";
const BTN_PRIMARY = "rounded-control bg-pine px-2.5 py-1 text-xs font-semibold text-on-accent disabled:opacity-50";

export function RecomputeButton() {
  const [isPending, startTransition] = useTransition();
  return (
    <button className={BTN} disabled={isPending} onClick={() => startTransition(() => recomputePatternsAction())}>
      {isPending ? "Recomputing…" : "Recompute"}
    </button>
  );
}

export function ResetLink({ patternKey }: { patternKey: string }) {
  const [isPending, startTransition] = useTransition();
  return (
    <button className="text-xs text-ink-muted hover:underline disabled:opacity-50" disabled={isPending} onClick={() => startTransition(() => resetPatternAction(patternKey))}>
      Reset to inferred
    </button>
  );
}

/** Weekday checkboxes. Saving makes the row advisor-set; inference stops
 * touching it until reset. */
export function WeekdaysControl({ value }: { value: WeekdaysValue }) {
  const [days, setDays] = useState<number[]>(value.days);
  const [isPending, startTransition] = useTransition();
  const dirty = JSON.stringify([...days].sort()) !== JSON.stringify([...value.days].sort());
  return (
    <div className="flex items-center gap-2">
      {[1, 2, 3, 4, 5].map((d) => (
        <label key={d} className="flex items-center gap-1 text-xs">
          <input type="checkbox" checked={days.includes(d)} onChange={(e) => setDays(e.target.checked ? [...days, d] : days.filter((x) => x !== d))} />
          {WEEKDAY_NAMES[d]}
        </label>
      ))}
      <button className={BTN_PRIMARY} disabled={!dirty || isPending} onClick={() => startTransition(() => setBookingDaysAction(days))}>
        Save
      </button>
    </div>
  );
}

export function HoursControl({ value }: { value: HoursValue }) {
  const [hours, setHours] = useState<number[]>(value.startHours);
  const [isPending, startTransition] = useTransition();
  const dirty = JSON.stringify(hours) !== JSON.stringify(value.startHours);
  // Half-hour steps: two of the seeded advisors book on the half hour, and
  // a control that cannot show the inferred value would be lying about it.
  const options = Array.from({ length: 18 }, (_, i) => 8 + i / 2);
  return (
    <div className="flex flex-wrap items-center gap-2">
      {options.map((h) => (
        <label key={h} className="flex items-center gap-1 text-xs">
          <input
            type="checkbox"
            checked={hours.includes(h)}
            onChange={(e) => setHours((e.target.checked ? [...hours, h] : hours.filter((x) => x !== h)).sort((a, b) => a - b))}
          />
          {hourLabel(h)}
        </label>
      ))}
      <button className={BTN_PRIMARY} disabled={!dirty || isPending} onClick={() => startTransition(() => setBookingHoursAction(hours))}>
        Save
      </button>
    </div>
  );
}

export function AlertRuleControl({ value }: { value: AlertRuleValue }) {
  const [isPending, startTransition] = useTransition();
  return (
    <button className={BTN} disabled={isPending} onClick={() => startTransition(() => setAlertRuleMutedAction(value, !value.muted))}>
      {value.muted ? "Stop ordering lower" : "Order lower in the brief"}
    </button>
  );
}
