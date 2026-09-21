"use client";

import { useId, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { formatMoney } from "@/lib/format/money";
import { householdKeyword } from "@/lib/format/name";
import { neighbour, pickLabel, squarify, textWidth, type Direction } from "@/lib/charts/treemap";

type Item = { id: string; name: string; aumCents: number; segment: string };

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

const ARROW_KEYS: Record<string, Direction> = {
  ArrowUp: "up",
  ArrowDown: "down",
  ArrowLeft: "left",
  ArrowRight: "right",
};

/** Book composition as a squarified treemap: area is exactly proportional
 * to AUM, and cells stay close to square so area reads as area.
 *
 * The labelling rule is the point of doing the layout in viewBox units. A
 * cell is measured against the text it would carry and draws a name only
 * if the name fits, a value only if there is a second line's room for it —
 * so nothing is ever clipped mid-word or spilled across a neighbour.
 * Every cell carries a <title> regardless, so the small ones are still
 * identifiable on hover.
 *
 * ## Getting into and around it
 *
 * Every cell is a real link to its household, so middle-click, open in a
 * new tab and copy-link all behave the way they do anywhere else; the
 * click handler only intercepts a plain left click, to route without a
 * page load.
 *
 * Keyboard navigation is a roving tabindex rather than forty tab stops:
 * the chart is one stop, and the arrow keys move between cells
 * *spatially* — → from a tall cell reaches whatever is beside it, not
 * whatever happens to be next in value order (`neighbour`). Home and End
 * jump to the largest and smallest household. Enter follows the link,
 * which is the link's own behaviour rather than anything handled here. */
export function BookTreemap({ items }: { items: Item[] }) {
  const router = useRouter();
  const hintId = useId();
  const cells = useMemo(() => squarify(items, (i) => i.aumCents, W, H), [items]);

  // Which cell the keyboard is on, and which is lit up. They differ:
  // the highlight follows the mouse when there is one, and the chart is
  // not highlighted at all until it is hovered or focused.
  const [keyboardIndex, setKeyboardIndex] = useState(0);
  const [focused, setFocused] = useState<number | null>(null);
  const [hovered, setHovered] = useState<number | null>(null);
  const highlighted = hovered ?? focused;

  // React types JSX `<a>` as an HTML anchor; inside an <svg> the element
  // it actually creates is an SVGAElement. Both have focus(), which is
  // all this needs.
  const anchors = useRef<(HTMLAnchorElement | null)[]>([]);

  function moveTo(index: number) {
    setKeyboardIndex(index);
    anchors.current[index]?.focus();
  }

  function onKeyDown(event: React.KeyboardEvent) {
    const direction = ARROW_KEYS[event.key];
    if (direction) {
      event.preventDefault();
      moveTo(neighbour(cells, keyboardIndex, direction));
      return;
    }
    if (event.key === "Home") {
      event.preventDefault();
      moveTo(0);
    } else if (event.key === "End") {
      event.preventDefault();
      moveTo(cells.length - 1);
    }
  }

  function onClick(event: React.MouseEvent, href: string) {
    // Anything but a plain left click is the browser's to handle — a
    // modifier means the viewer asked for a new tab or window.
    if (event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
    event.preventDefault();
    router.push(href);
  }

  if (cells.length === 0) {
    return (
      <div
        className="flex items-center justify-center rounded-card border border-dashed border-rule text-sm text-ink-muted"
        style={{ height: H }}
      >
        No households with assets under management yet.
      </div>
    );
  }

  return (
    <>
      <svg
        viewBox={`0 0 ${W} ${H}`}
        className="block w-full"
        style={{ height: H }}
        role="group"
        aria-label={`Book composition: ${cells.length} households by assets under management`}
        aria-describedby={hintId}
        onKeyDown={onKeyDown}
        onMouseLeave={() => setHovered(null)}
      >
        {cells.map(({ item, x, y, w, h }, i) => {
          const value = formatMoney(item.aumCents, { compact: true });
          const href = `/clients/${item.id}`;
          const inner = w - PAD * 2;
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
            <a
              key={item.id}
              ref={(el) => {
                anchors.current[i] = el;
              }}
              href={href}
              tabIndex={i === keyboardIndex ? 0 : -1}
              aria-label={`${item.name}, ${item.segment}, ${value} under management`}
              className="cursor-pointer outline-none"
              onClick={(e) => onClick(e, href)}
              onFocus={() => {
                setKeyboardIndex(i);
                setFocused(i);
              }}
              onBlur={() => setFocused(null)}
              onMouseEnter={() => setHovered(i)}
            >
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
            </a>
          );
        })}

        {/* Drawn last so it sits over the neighbouring fills rather than
            being half-covered by them. Inset by half the stroke so the
            ring reads as inside the cell it belongs to. */}
        {highlighted !== null && cells[highlighted] ? (
          <rect
            x={cells[highlighted]!.x + 1}
            y={cells[highlighted]!.y + 1}
            width={Math.max(0, cells[highlighted]!.w - 2)}
            height={Math.max(0, cells[highlighted]!.h - 2)}
            fill="none"
            stroke="var(--on-accent)"
            strokeWidth={2}
            pointerEvents="none"
          />
        ) : null}
      </svg>
      <p id={hintId} className="sr-only">
        Use the arrow keys to move between households, Home and End for the largest and
        smallest, and Enter to open the one you are on.
      </p>
    </>
  );
}
