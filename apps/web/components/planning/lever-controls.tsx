"use client";

import { useState } from "react";

/** The controls the scenario workbench is built from.
 *
 * Two things make these different from generic form fields, and both come
 * from what the surface is for. Every control knows its baseline, so a
 * lever that has been moved says what it was moved from and offers to put
 * it back — an advisor mid-conversation needs to undo one lever without
 * resetting the whole scenario. And every figure is a money, age or
 * percent with a fixed unit, so the unit lives in the control rather than
 * in the label, which keeps the labels short enough to read down a column.
 */

const FIELD =
  "w-full rounded-control border border-rule bg-surface px-2 py-1.5 text-sm tabular text-ink " +
  "focus:border-pine focus:outline-none focus:ring-1 focus:ring-pine";

export function Panel({
  title,
  hint,
  children,
}: {
  title: string;
  hint?: string;
  children: React.ReactNode;
}) {
  return (
    <section className="border-b border-rule pb-4 last:border-b-0 last:pb-0">
      <h4 className="mb-0.5 text-sm font-semibold">{title}</h4>
      {hint ? <p className="mb-2.5 text-xs text-ink-muted">{hint}</p> : <div className="mb-2.5" />}
      {children}
    </section>
  );
}

export function Grid({ children }: { children: React.ReactNode }) {
  return <div className="grid grid-cols-2 gap-x-3 gap-y-2.5">{children}</div>;
}

/** Label row shared by every control: name on the left, and on the right
 * the baseline it departed from plus a one-click way back. */
function Label({
  label,
  moved,
  wasLabel,
  onRevert,
}: {
  label: string;
  moved: boolean;
  wasLabel?: string;
  onRevert?: () => void;
}) {
  return (
    <span className="mb-1 flex items-baseline justify-between gap-2 text-xs">
      <span className={moved ? "font-semibold text-pine" : "text-ink-muted"}>{label}</span>
      {moved && wasLabel ? (
        <button
          type="button"
          onClick={onRevert}
          title={`Back to ${wasLabel}`}
          className="shrink-0 text-ink-muted underline decoration-dotted underline-offset-2 hover:text-ink"
        >
          was {wasLabel}
        </button>
      ) : null}
    </span>
  );
}

export function SliderLever({
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
      <Label
        label={label}
        moved={moved}
        wasLabel={String(baseline)}
        onRevert={() => onChange(baseline)}
      />
      <div className="flex items-center gap-2">
        <input
          type="range"
          min={min}
          max={max}
          step={step}
          value={value}
          onChange={(e) => onChange(Number(e.target.value))}
          className="h-1 w-full accent-pine"
        />
        <span className={`w-9 shrink-0 text-right text-sm tabular font-semibold ${moved ? "text-pine" : "text-ink"}`}>
          {value}
        </span>
      </div>
    </label>
  );
}

/** Money in whole dollars, thousands-separated while idle and raw while
 * being typed — reformatting under the cursor moves it, which makes a
 * field impossible to edit from the middle. */
export function MoneyLever({
  label,
  valueCents,
  baselineCents,
  suffix,
  onChange,
}: {
  label: string;
  valueCents: number;
  baselineCents: number;
  suffix?: string;
  onChange: (cents: number) => void;
}) {
  const [draft, setDraft] = useState<string | null>(null);
  const moved = valueCents !== baselineCents;
  const dollars = Math.round(valueCents / 100);
  const shown = draft ?? dollars.toLocaleString("en-US");

  return (
    <label className="block">
      <Label
        label={label}
        moved={moved}
        wasLabel={`$${Math.round(baselineCents / 100).toLocaleString("en-US")}`}
        onRevert={() => {
          setDraft(null);
          onChange(baselineCents);
        }}
      />
      <div className="relative">
        <span className="pointer-events-none absolute left-2 top-1/2 -translate-y-1/2 text-sm text-ink-muted">
          $
        </span>
        <input
          inputMode="numeric"
          value={shown}
          onFocus={() => setDraft(String(dollars))}
          onBlur={() => setDraft(null)}
          onChange={(e) => {
            const digits = e.target.value.replace(/[^\d]/g, "");
            setDraft(digits);
            onChange((Number(digits) || 0) * 100);
          }}
          className={`${FIELD} pl-5 text-right ${suffix ? "pr-8" : ""}`}
        />
        {suffix ? (
          <span className="pointer-events-none absolute right-2 top-1/2 -translate-y-1/2 text-xs text-ink-muted">
            {suffix}
          </span>
        ) : null}
      </div>
    </label>
  );
}

export function NumberLever({
  label,
  value,
  baseline,
  suffix,
  min,
  max,
  step = 1,
  onChange,
}: {
  label: string;
  value: number;
  baseline: number;
  suffix?: string;
  min?: number;
  max?: number;
  step?: number;
  onChange: (value: number) => void;
}) {
  const moved = value !== baseline;
  return (
    <label className="block">
      <Label
        label={label}
        moved={moved}
        wasLabel={`${baseline}${suffix ?? ""}`}
        onRevert={() => onChange(baseline)}
      />
      <div className="relative">
        <input
          type="number"
          value={value}
          min={min}
          max={max}
          step={step}
          onChange={(e) => onChange(e.target.value === "" ? baseline : Number(e.target.value))}
          className={`${FIELD} text-right ${suffix ? "pr-7" : ""}`}
        />
        {suffix ? (
          <span className="pointer-events-none absolute right-2 top-1/2 -translate-y-1/2 text-xs text-ink-muted">
            {suffix}
          </span>
        ) : null}
      </div>
    </label>
  );
}

/** An age that may legitimately be unset — "spending drops at…" has no
 * answer until the advisor gives one, and zero is not that answer. */
export function OptionalAgeLever({
  label,
  value,
  placeholder,
  onChange,
}: {
  label: string;
  value: number | null;
  placeholder: string;
  onChange: (value: number | null) => void;
}) {
  return (
    <label className="block">
      <Label label={label} moved={value !== null} wasLabel="unset" onRevert={() => onChange(null)} />
      <input
        type="number"
        value={value ?? ""}
        placeholder={placeholder}
        onChange={(e) => onChange(e.target.value === "" ? null : Number(e.target.value))}
        className={`${FIELD} text-right`}
      />
    </label>
  );
}

export function TextLever({
  label,
  value,
  placeholder,
  onChange,
}: {
  label: string;
  value: string;
  placeholder: string;
  onChange: (value: string) => void;
}) {
  return (
    <label className="block">
      <Label label={label} moved={value.trim().length > 0} />
      <input
        value={value}
        placeholder={placeholder}
        onChange={(e) => onChange(e.target.value)}
        className={`${FIELD} text-left`}
      />
    </label>
  );
}

export function ToggleLever({
  label,
  value,
  onChange,
}: {
  label: string;
  value: boolean;
  onChange: (value: boolean) => void;
}) {
  return (
    <label className="flex cursor-pointer items-center gap-2 self-end pb-1.5 text-xs text-ink-muted">
      <input
        type="checkbox"
        checked={value}
        onChange={(e) => onChange(e.target.checked)}
        className="h-3.5 w-3.5 accent-pine"
      />
      {label}
    </label>
  );
}
