"use client";

import { donutSegments } from "@/lib/charts/donut";
import { ASSET_CLASS_LABEL } from "@/lib/calc/holdings";
import { CLASS_COLOR } from "@/lib/charts/asset-class";

export type Mix = { equity: number; fixedIncome: number; cash: number };

const CLASSES = ["Equity", "FixedIncome", "Cash"] as const;
export type AssetClassKey = (typeof CLASSES)[number];

const SIZE = 132;
const CENTRE = SIZE / 2;

function share(mix: Mix, key: AssetClassKey): number {
  return key === "Equity" ? mix.equity : key === "FixedIncome" ? mix.fixedIncome : mix.cash;
}

/** One ring. Segments are paths rather than a conic-gradient so a slice
 * is an element that can be hovered, dimmed and clicked — which is what
 * makes "select equities and see what is in it" possible at all.
 *
 * The segments are `aria-hidden`: the legend beneath is a real radio
 * group carrying the same choice, and exposing the selection twice would
 * mean a screen-reader user hearing every class name twice. */
function Ring({
  mix,
  label,
  selected,
  onSelect,
}: {
  mix: Mix;
  label: string;
  selected: AssetClassKey;
  onSelect?: (key: AssetClassKey) => void;
}) {
  const segments = donutSegments([...CLASSES], (key) => share(mix, key), {
    cx: CENTRE,
    cy: CENTRE,
    innerRadius: 40,
    outerRadius: 64,
  });

  return (
    <div className="flex flex-col items-center">
      <svg width={SIZE} height={SIZE} viewBox={`0 0 ${SIZE} ${SIZE}`} aria-hidden>
        {/* An empty ring still has to look like a ring. Without the track
            a household with nothing on file renders as a bare "0%" over
            blank space, which reads as a chart that failed rather than a
            portfolio that is empty. */}
        {segments.length === 0 ? (
          <circle
            cx={CENTRE}
            cy={CENTRE}
            r={52}
            fill="none"
            stroke="var(--rule)"
            strokeWidth={24}
          />
        ) : null}
        {segments.map(({ item, path }) => {
          const isSelected = item === selected;
          return (
            <path
              key={item}
              d={path}
              fill={CLASS_COLOR[item]}
              fillOpacity={isSelected ? 1 : 0.32}
              stroke="var(--surface)"
              strokeWidth={1.5}
              className={onSelect ? "cursor-pointer" : undefined}
              onClick={onSelect ? () => onSelect(item) : undefined}
            />
          );
        })}
        <text
          x={CENTRE}
          y={CENTRE - 2}
          textAnchor="middle"
          fontSize={19}
          fontWeight={700}
          fill="var(--ink)"
          fontFamily="var(--font-public-sans)"
          style={{ fontVariantNumeric: "tabular-nums" }}
        >
          {share(mix, selected).toFixed(0)}%
        </text>
        <text
          x={CENTRE}
          y={CENTRE + 12}
          textAnchor="middle"
          fontSize={9}
          fill="var(--ink-muted)"
          fontFamily="var(--font-public-sans)"
        >
          {ASSET_CLASS_LABEL[selected]}
        </text>
      </svg>
      <div className="mt-1.5 text-xs text-ink-muted">{label}</div>
    </div>
  );
}

/** Drift is colored by magnitude of concern, not arithmetic sign — a
 * household running over on cash and one running under on fixed income are
 * both a problem, both shown in --loss. See design/README.md. */
function DriftRow({
  assetClass,
  target,
  actual,
  selected,
  hasTarget,
  onSelect,
}: {
  assetClass: AssetClassKey;
  target: number;
  actual: number;
  selected: AssetClassKey;
  /** False when no target allocation has been agreed. Drift against a
   * target of zero is arithmetically enormous and means nothing: a
   * household onboarded this morning has no IPS, and a full red bar on
   * every class reads as a breach where there is only an absence. */
  hasTarget: boolean;
  onSelect: (key: AssetClassKey) => void;
}) {
  const driftPts = Math.round((actual - target) * 10) / 10;
  const width = Math.min(50, Math.abs(driftPts) * 5);
  const isSelected = assetClass === selected;

  return (
    <button
      type="button"
      role="radio"
      aria-checked={isSelected}
      tabIndex={isSelected ? 0 : -1}
      onClick={() => onSelect(assetClass)}
      className={`grid w-full grid-cols-[112px_1fr_112px] items-center gap-2.5 rounded-control px-1.5 py-1 text-left ${
        isSelected ? "bg-pine-tint" : "hover:bg-paper"
      }`}
    >
      <span className={`flex items-center gap-1.5 text-sm ${isSelected ? "font-semibold" : ""}`}>
        <span
          className="h-2 w-2 shrink-0 rounded-full"
          style={{ background: CLASS_COLOR[assetClass] }}
        />
        {ASSET_CLASS_LABEL[assetClass]}
      </span>
      <span className="relative block h-4">
        {hasTarget ? (
          <>
            <span className="absolute inset-y-0 left-1/2 w-px bg-ink-muted" />
            <span
              className="absolute inset-y-0.5 bg-loss"
              style={
                driftPts >= 0
                  ? { left: "50%", width: `${width}%` }
                  : { right: "50%", width: `${width}%` }
              }
            />
          </>
        ) : (
          <span
            className="absolute inset-y-0.5 left-0 rounded-sm opacity-30"
            style={{ width: `${actual}%`, background: CLASS_COLOR[assetClass] }}
          />
        )}
      </span>
      <span className="tabular text-right text-xs text-ink-muted">
        {hasTarget ? `${target.toFixed(1)} → ${actual.toFixed(1)}%` : `${actual.toFixed(1)}%`}
      </span>
    </button>
  );
}

/**
 * Target against actual, with the class you are looking at selected.
 *
 * The legend rows are the accessible control — a radio group, one tab
 * stop, arrow keys to move between classes — because that is exactly what
 * the choice is: one of three. The ring segments click through to the
 * same selection as a second, pointer-only affordance.
 */
export function AllocationRings({
  target,
  actual,
  selected,
  onSelect,
}: {
  target: Mix;
  actual: Mix;
  selected: AssetClassKey;
  onSelect: (key: AssetClassKey) => void;
}) {
  // A target of zero across the board is not a target of zero — it is the
  // absence of an agreed allocation, which is the normal state of a
  // household on the day it is onboarded.
  const hasTarget = target.equity + target.fixedIncome + target.cash > 0;

  function onKeyDown(event: React.KeyboardEvent) {
    const step = event.key === "ArrowRight" || event.key === "ArrowDown" ? 1 : event.key === "ArrowLeft" || event.key === "ArrowUp" ? -1 : 0;
    if (step === 0) return;
    event.preventDefault();
    const next = CLASSES[(CLASSES.indexOf(selected) + step + CLASSES.length) % CLASSES.length]!;
    onSelect(next);
  }

  return (
    <div className="flex flex-wrap items-center gap-7">
      <div className="flex gap-5">
        {hasTarget ? (
          <Ring mix={target} label="Target" selected={selected} onSelect={onSelect} />
        ) : null}
        <Ring mix={actual} label="Actual" selected={selected} onSelect={onSelect} />
      </div>
      <div
        role="radiogroup"
        aria-label="Asset class"
        onKeyDown={onKeyDown}
        className="flex min-w-[300px] flex-1 flex-col gap-1"
      >
        {CLASSES.map((assetClass) => (
          <DriftRow
            key={assetClass}
            assetClass={assetClass}
            target={share(target, assetClass)}
            actual={share(actual, assetClass)}
            selected={selected}
            hasTarget={hasTarget}
            onSelect={onSelect}
          />
        ))}
        <p className="mt-1 px-1.5 text-xs text-ink-muted">
          {hasTarget
            ? "Select a class to see the holdings behind it."
            : "No target allocation agreed yet, so there is no drift to measure — set one in this household's IPS. Select a class to see the holdings behind it."}
        </p>
      </div>
    </div>
  );
}
