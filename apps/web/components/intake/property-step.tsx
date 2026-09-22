"use client";

import {
  INPUT_CLASS,
  emptyOtherAsset,
  emptyProperty,
  type OtherAssetRow,
  type PropertyRow,
} from "./intake-types";
import { formatMoney, parseDollarsToCents } from "@/lib/format/money";

/** Property and everything else the household owns or owes.
 *
 * Each property carries its own mortgage. A house worth $1.2M against an
 * $800K loan is a different household from one that owns it outright, and
 * a single net figure loses the distinction the moment anyone asks what
 * the balance sheet is actually made of.
 *
 * This is also where the liabilities that aren't a mortgage go. They were
 * a box on the member card, which double-counted against the accounts
 * once those were itemised — two answers to one question, with nothing to
 * say which was right. */
export function PropertyStep({
  properties,
  otherAssets,
  otherLiabilities,
  onChange,
}: {
  properties: PropertyRow[];
  otherAssets: OtherAssetRow[];
  otherLiabilities: string;
  onChange: (patch: {
    properties?: PropertyRow[];
    otherAssets?: OtherAssetRow[];
    otherLiabilities?: string;
  }) => void;
}) {
  const propertyValue = sumOf(properties.map((p) => p.value));
  const mortgages = sumOf(properties.map((p) => p.mortgage));
  const otherValue = sumOf(otherAssets.map((a) => a.value));

  return (
    <div>
      <h2 className="mb-0.5 text-base font-semibold">Property and other assets</h2>
      <p className="mb-4 text-sm text-ink-muted">
        Real estate with the debt against it, plus anything else worth carrying on the balance
        sheet — a business interest, a vehicle, collectibles.
      </p>

      <div className="mb-5">
        <div className="mb-2 flex items-baseline justify-between">
          <span className="text-xs font-semibold">Real estate</span>
          <span className="text-xs text-ink-muted">
            <span className="tabular font-semibold text-ink">{formatMoney(propertyValue)}</span> less{" "}
            <span className="tabular font-semibold text-loss">{formatMoney(mortgages)}</span> of debt
            {propertyValue > 0n ? (
              <>
                {" · "}
                <span className="tabular font-semibold text-ink">
                  {formatMoney(propertyValue - mortgages)}
                </span>{" "}
                equity
              </>
            ) : null}
          </span>
        </div>

        <div className="flex flex-col gap-2">
          {properties.map((property, index) => (
            <div key={index} className="grid grid-cols-[1fr_160px_160px_40px] gap-2">
              <input
                value={property.label}
                onChange={(e) =>
                  onChange({
                    properties: properties.map((p, i) => (i === index ? { ...p, label: e.target.value } : p)),
                  })
                }
                placeholder="e.g. Primary residence"
                className={INPUT_CLASS}
              />
              <Money
                label="Value"
                value={property.value}
                onChange={(v) =>
                  onChange({ properties: properties.map((p, i) => (i === index ? { ...p, value: v } : p)) })
                }
              />
              <Money
                label="Mortgage"
                value={property.mortgage}
                onChange={(v) =>
                  onChange({ properties: properties.map((p, i) => (i === index ? { ...p, mortgage: v } : p)) })
                }
              />
              <button
                onClick={() => onChange({ properties: properties.filter((_, i) => i !== index) })}
                disabled={properties.length === 1}
                className="text-sm text-ink-muted hover:text-ink disabled:opacity-40"
              >
                ×
              </button>
            </div>
          ))}
        </div>
        <button
          onClick={() => onChange({ properties: [...properties, emptyProperty()] })}
          className="mt-2 text-xs font-semibold text-pine"
        >
          + Add property
        </button>
      </div>

      <div className="mb-5 border-t border-rule pt-4">
        <div className="mb-2 flex items-baseline justify-between">
          <span className="text-xs font-semibold">Other assets</span>
          <span className="tabular text-xs font-semibold text-ink">{formatMoney(otherValue)}</span>
        </div>
        <div className="flex flex-col gap-2">
          {otherAssets.map((asset, index) => (
            <div key={index} className="grid grid-cols-[1fr_160px_40px] gap-2">
              <input
                value={asset.label}
                onChange={(e) =>
                  onChange({
                    otherAssets: otherAssets.map((a, i) => (i === index ? { ...a, label: e.target.value } : a)),
                  })
                }
                placeholder="e.g. Share of the practice"
                className={INPUT_CLASS}
              />
              <Money
                label="Value"
                value={asset.value}
                onChange={(v) =>
                  onChange({ otherAssets: otherAssets.map((a, i) => (i === index ? { ...a, value: v } : a)) })
                }
              />
              <button
                onClick={() => onChange({ otherAssets: otherAssets.filter((_, i) => i !== index) })}
                disabled={otherAssets.length === 1}
                className="text-sm text-ink-muted hover:text-ink disabled:opacity-40"
              >
                ×
              </button>
            </div>
          ))}
        </div>
        <button
          onClick={() => onChange({ otherAssets: [...otherAssets, emptyOtherAsset()] })}
          className="mt-2 text-xs font-semibold text-pine"
        >
          + Add asset
        </button>
      </div>

      <div className="border-t border-rule pt-4">
        <label className="block max-w-[240px]">
          <span className="mb-1 block text-xs font-semibold">Other liabilities</span>
          <Money label="Other liabilities" value={otherLiabilities} onChange={(v) => onChange({ otherLiabilities: v })} />
        </label>
        <p className="mt-2 text-xs text-ink-muted">
          Anything owed that isn&rsquo;t a mortgage above — a loan, a line of credit, a balance
          carried on cards.
        </p>
      </div>
    </div>
  );
}

function sumOf(values: string[]): bigint {
  return values.reduce<bigint>((total, v) => total + (parseDollarsToCents(v) ?? 0n), 0n);
}

function Money({
  label,
  value,
  onChange,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
}) {
  return (
    <div className="relative">
      <span className="pointer-events-none absolute left-2.5 top-1/2 -translate-y-1/2 text-sm text-ink-muted">
        $
      </span>
      <input
        value={value}
        inputMode="numeric"
        aria-label={label}
        onChange={(e) => onChange(e.target.value)}
        placeholder="0"
        className={`${INPUT_CLASS} tabular pl-6 text-right`}
      />
    </div>
  );
}
