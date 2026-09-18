export function CompletenessRing({ pct, size = 46 }: { pct: number; size?: number }) {
  const inner = size - 12;
  return (
    <div
      className="relative flex shrink-0 items-center justify-center rounded-full"
      style={{
        width: size,
        height: size,
        background: `conic-gradient(var(--pine) 0% ${pct}%, var(--rule) ${pct}% 100%)`,
      }}
    >
      <div
        className="flex items-center justify-center rounded-full bg-surface text-xs font-bold tabular"
        style={{ width: inner, height: inner }}
      >
        {pct}%
      </div>
    </div>
  );
}
