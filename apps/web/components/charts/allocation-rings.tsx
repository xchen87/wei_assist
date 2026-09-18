type Mix = { equity: number; fixedIncome: number; cash: number };

function Ring({ mix, label }: { mix: Mix; label: string }) {
  const equityEnd = mix.equity;
  const fixedEnd = equityEnd + mix.fixedIncome;
  return (
    <div className="flex flex-col items-center">
      <div
        className="flex h-[120px] w-[120px] items-center justify-center rounded-full"
        style={{
          background: `conic-gradient(var(--pine) 0% ${equityEnd}%, var(--info) ${equityEnd}% ${fixedEnd}%, var(--brass) ${fixedEnd}% 100%)`,
        }}
      >
        <div className="h-20 w-20 rounded-full bg-surface" />
      </div>
      <div className="mt-2 text-xs text-ink-muted">{label}</div>
    </div>
  );
}

/** Drift is colored by magnitude of concern, not arithmetic sign — a
 * household running over on cash and one running under on fixed income are
 * both a problem, both shown in --loss. See design/README.md. */
function DriftRow({ label, color, driftPts }: { label: string; color: string; driftPts: number }) {
  const width = Math.min(50, Math.abs(driftPts) * 5);
  return (
    <div className="grid grid-cols-[100px_1fr_60px] items-center gap-2.5">
      <div className="flex items-center gap-1.5 text-sm">
        <span className="h-2 w-2 rounded-full" style={{ background: color }} />
        {label}
      </div>
      <div className="relative h-4">
        <div className="absolute inset-y-0 left-1/2 w-px bg-ink-muted" />
        <div
          className="absolute inset-y-0.5 bg-loss"
          style={
            driftPts >= 0
              ? { left: "50%", width: `${width}%` }
              : { right: "50%", width: `${width}%` }
          }
        />
      </div>
      <div className="tabular text-right text-xs text-loss">
        {driftPts >= 0 ? "+" : "−"}
        {Math.abs(driftPts).toFixed(1)}pt
      </div>
    </div>
  );
}

export function AllocationRings({
  target,
  actual,
}: {
  target: Mix;
  actual: Mix;
}) {
  return (
    <div className="flex items-center gap-8">
      <div className="flex shrink-0 gap-5">
        <Ring mix={target} label="Target" />
        <Ring mix={actual} label="Actual" />
      </div>
      <div className="flex flex-1 flex-col gap-3">
        <DriftRow label="Equities" color="var(--pine)" driftPts={actual.equity - target.equity} />
        <DriftRow label="Fixed income" color="var(--info)" driftPts={actual.fixedIncome - target.fixedIncome} />
        <DriftRow label="Cash" color="var(--brass)" driftPts={actual.cash - target.cash} />
      </div>
    </div>
  );
}
