import { formatMoney } from "@/lib/format/money";
import { householdKeyword } from "@/lib/format/name";
import { pickLabel, squarify, textWidth } from "@/lib/charts/treemap";

type Item = { name: string; aumCents: number; segment: string };

const SEGMENT_COLOR: Record<string, string> = {
  Founding: "var(--pine)",
  Premier: "var(--brass)",
  Core: "var(--info)",
};

// The viewBox the layout is computed in. Everything below is in these
// units and scales with the container, like every other chart here — so
// the aspect ratio is chosen to sit close to the half-width column this
// renders in, and the type sizes are what they are because at that scale
// they come out around 11px and 10px. A squarer viewBox would letterbox
// the treemap inside its column, which on a chart made of rectangles
// reads as a bug rather than as margin.
const W = 560;
const H = 210;
const NAME_SIZE = 11;
const VALUE_SIZE = 10;
const PAD = 4;

/** Book composition as a squarified treemap: area is exactly proportional
 * to AUM, and cells stay close to square so area reads as area.
 *
 * The labelling rule is the point of doing the layout in viewBox units. A
 * cell is measured against the text it would carry and draws a name only
 * if the name fits, a value only if there is a second line's room for it —
 * so nothing is ever clipped mid-word or spilled across a neighbour.
 * Every cell carries a <title> regardless, so the small ones are still
 * identifiable on hover. */
export function BookTreemap({ items }: { items: Item[] }) {
  const cells = squarify(items, (i) => i.aumCents, W, H);

  return (
    <svg
      viewBox={`0 0 ${W} ${H}`}
      className="block w-full"
      style={{ height: H }}
      role="img"
      aria-label={`Book composition: ${cells.length} households by assets under management`}
    >
      {cells.map(({ item, x, y, w, h }) => {
        const value = formatMoney(item.aumCents, { compact: true });
        const inner = w - PAD * 2;
        // Two lines need room for both plus the padding; one line only
        // has to clear the cell.
        // Full name if it fits, otherwise the family name on its own —
        // every name here carries a generic tail ("Household", "Family
        // Trust"), so that word is the one worth keeping.
        const name =
          h >= NAME_SIZE + PAD * 2
            ? pickLabel([item.name, householdKeyword(item.name)], inner, NAME_SIZE)
            : null;
        const showValue =
          name !== null &&
          h >= NAME_SIZE + VALUE_SIZE + PAD * 2 + 2 &&
          textWidth(value, VALUE_SIZE) <= inner;

        return (
          <g key={item.name}>
            <rect
              x={x}
              y={y}
              width={w}
              height={h}
              fill={SEGMENT_COLOR[item.segment] ?? "var(--ink-muted)"}
              stroke="var(--surface)"
              strokeWidth={0.75}
            />
            <title>{`${item.name} · ${item.segment} · ${value}`}</title>
            {name ? (
              <text
                x={x + PAD}
                y={y + PAD + NAME_SIZE}
                fontSize={NAME_SIZE}
                fontWeight={600}
                fill="var(--on-accent)"
                fontFamily="var(--font-public-sans)"
              >
                {name}
              </text>
            ) : null}
            {showValue ? (
              <text
                x={x + PAD}
                y={y + PAD + NAME_SIZE + VALUE_SIZE + 2}
                fontSize={VALUE_SIZE}
                fill="var(--on-accent)"
                fillOpacity={0.85}
                fontFamily="var(--font-public-sans)"
                style={{ fontVariantNumeric: "tabular-nums" }}
              >
                {value}
              </text>
            ) : null}
          </g>
        );
      })}
    </svg>
  );
}
