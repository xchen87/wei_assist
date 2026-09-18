import { formatMoney } from "@/lib/format/money";

type Item = { name: string; aumCents: number; segment: string };

const SEGMENT_COLOR: Record<string, string> = {
  Founding: "var(--pine)",
  Premier: "var(--brass)",
  Core: "var(--info)",
};

/** A real slice-and-dice treemap: two bands (top 3 by AUM, then the rest),
 * each cell's flex-grow set directly to its AUM so area is exactly
 * proportional to value. */
export function BookTreemap({ items }: { items: Item[] }) {
  const sorted = [...items].sort((a, b) => b.aumCents - a.aumCents);
  const top = sorted.slice(0, 3);
  const rest = sorted.slice(3);
  const topTotal = top.reduce((s, i) => s + i.aumCents, 0);
  const restTotal = rest.reduce((s, i) => s + i.aumCents, 0);

  return (
    <div className="flex flex-col gap-0.5" style={{ height: 220 }}>
      <div className="flex gap-0.5" style={{ flexGrow: topTotal, minHeight: 0 }}>
        {top.map((item) => (
          <div
            key={item.name}
            className="flex flex-col justify-end p-2.5 text-white"
            style={{ flexGrow: item.aumCents, background: SEGMENT_COLOR[item.segment], minWidth: 0 }}
          >
            <div className="truncate text-sm font-semibold">{item.name}</div>
            <div className="tabular text-xs opacity-85">{formatMoney(item.aumCents, { compact: true })}</div>
          </div>
        ))}
      </div>
      <div className="flex gap-0.5" style={{ flexGrow: restTotal, minHeight: 0 }}>
        {rest.map((item) => (
          <div
            key={item.name}
            className="flex flex-col justify-end p-2 text-white"
            style={{ flexGrow: item.aumCents, background: SEGMENT_COLOR[item.segment], minWidth: 0 }}
          >
            <div className="truncate text-xs font-semibold">{item.name}</div>
            <div className="tabular text-xs opacity-85">{formatMoney(item.aumCents, { compact: true })}</div>
          </div>
        ))}
      </div>
    </div>
  );
}
