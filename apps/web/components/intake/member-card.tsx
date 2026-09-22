"use client";

import { useState } from "react";
import { RiskQuestionnaire } from "./risk-questionnaire";
import {
  INPUT_CLASS,
  ROLES,
  ageFrom,
  type MemberRow,
} from "./intake-types";
import { formatSsn, ssnDigits } from "@/lib/format/ssn";
import { absCents, formatMoney, parseDollarsToCents } from "@/lib/format/money";

/** One member, in three parts: who they are, what they have, and how much
 * risk they can live with. A row of inputs stopped being enough once
 * intake started collecting finances and a questionnaire per person.
 *
 * Nothing here is stored — "Create household" is still disabled (see the
 * wizard's file comment) — which is also why the SSN is only held in
 * component state: there is no encrypted column to put it in yet
 * (CLAUDE.md §11, Phase 9), and adding a plaintext one would be the wrong
 * thing to make easy. */
export function MemberCard({
  index,
  member,
  canRemove,
  onChange,
  onRemove,
}: {
  index: number;
  member: MemberRow;
  canRemove: boolean;
  onChange: (patch: Partial<MemberRow>) => void;
  onRemove: () => void;
}) {
  const [showSsn, setShowSsn] = useState(false);
  const age = ageFrom(member.birthDate);
  const surplus = surplusOf(member);

  return (
    <div className="rounded-card border border-rule p-4">
      <div className="mb-3 flex items-center justify-between">
        <div className="text-xs font-semibold text-ink-muted">
          {member.name.trim() || `Member ${index + 1}`}
        </div>
        <button
          onClick={onRemove}
          disabled={!canRemove}
          className="rounded-control border border-rule px-2 py-1 text-xs text-ink-muted disabled:opacity-30"
        >
          Remove
        </button>
      </div>

      <div className="mb-4 grid grid-cols-4 gap-2">
        <Labelled label="Full name" className="col-span-2">
          <input
            value={member.name}
            onChange={(e) => onChange({ name: e.target.value })}
            placeholder="Full name"
            className={INPUT_CLASS}
          />
        </Labelled>
        <Labelled label="Role">
          <select value={member.role} onChange={(e) => onChange({ role: e.target.value })} className={INPUT_CLASS}>
            {ROLES.map((r) => (
              <option key={r} value={r}>
                {r}
              </option>
            ))}
          </select>
        </Labelled>
        <Labelled label={age === null ? "Date of birth" : `Date of birth · age ${age}`}>
          <input
            type="date"
            value={member.birthDate}
            max={new Date().toISOString().slice(0, 10)}
            onChange={(e) => onChange({ birthDate: e.target.value })}
            className={INPUT_CLASS}
          />
        </Labelled>

        <Labelled label="Occupation" className="col-span-2">
          <input
            value={member.occupation}
            onChange={(e) => onChange({ occupation: e.target.value })}
            placeholder="Occupation"
            className={INPUT_CLASS}
          />
        </Labelled>
        <Labelled label="Social security number" className="col-span-2">
          <div className="flex gap-2">
            <input
              // Masking is the browser's job. Replacing each character
              // with a bullet and putting that in `value` looked right and
              // meant the field held no digits: every keystroke, the
              // handler stripped the bullets as non-digits along with
              // everything already typed, so only the newest digit
              // survived. Nine keystrokes stored one digit (D-032).
              type={showSsn ? "text" : "password"}
              value={formatSsn(member.ssn)}
              onChange={(e) => onChange({ ssn: ssnDigits(e.target.value) })}
              inputMode="numeric"
              autoComplete="off"
              placeholder="123-45-6789"
              className={`${INPUT_CLASS} tabular`}
            />
            <button
              onClick={() => setShowSsn((v) => !v)}
              aria-pressed={showSsn}
              className="shrink-0 rounded-control border border-rule px-2.5 text-xs text-ink-muted hover:text-ink"
            >
              {showSsn ? "Hide" : "Show"}
            </button>
          </div>
        </Labelled>
      </div>

      <div className="mb-4 border-t border-rule pt-3">
        <div className="mb-2 flex items-baseline justify-between">
          <div className="text-xs font-semibold">Income and spending</div>
          <div className="text-xs text-ink-muted">
            {surplus !== null ? (
              <>
                Annual {surplus >= 0n ? "surplus" : "deficit"}{" "}
                <span className={`tabular font-semibold ${surplus >= 0n ? "text-gain" : "text-loss"}`}>
                  {formatMoney(absCents(surplus))}
                </span>
              </>
            ) : null}
          </div>
        </div>
        <div className="grid grid-cols-2 gap-2">
          <Money label="Annual income" value={member.annualIncome} onChange={(v) => onChange({ annualIncome: v })} />
          <Money label="Annual expenses" value={member.annualExpenses} onChange={(v) => onChange({ annualExpenses: v })} />
        </div>
        {/* What they own is itemised two steps on, as accounts and
            property. Asking for a lump sum here as well would double-count
            the balance sheet and leave two answers to the same question. */}
        <p className="mt-2 text-xs text-ink-muted">
          What this household owns and owes is itemised in the next two steps.
        </p>
      </div>

      <div className="border-t border-rule pt-3">
        <RiskQuestionnaire
          answers={member.risk}
          onChange={(risk) => onChange({ risk })}
          namePrefix={`member-${index}`}
        />
      </div>
    </div>
  );
}

/** Income minus expenses — what the Cashflow section will call savings. */
export function surplusOf(member: MemberRow): bigint | null {
  const income = parseDollarsToCents(member.annualIncome);
  const expenses = parseDollarsToCents(member.annualExpenses);
  if (income === null && expenses === null) return null;
  return (income ?? 0n) - (expenses ?? 0n);
}

function Labelled({
  label,
  className,
  children,
}: {
  label: string;
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <label className={`block ${className ?? ""}`}>
      <div className="mb-1 truncate text-xs text-ink-muted">{label}</div>
      {children}
    </label>
  );
}

function Money({
  label,
  value,
  onChange,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
}) {
  return (
    <Labelled label={label}>
      <div className="relative">
        <span className="pointer-events-none absolute left-2.5 top-1/2 -translate-y-1/2 text-sm text-ink-muted">$</span>
        <input
          value={value}
          onChange={(e) => onChange(e.target.value)}
          inputMode="decimal"
          placeholder="0"
          className={`${INPUT_CLASS} tabular pl-5`}
        />
      </div>
    </Labelled>
  );
}
