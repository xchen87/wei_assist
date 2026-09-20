"use client";

import { useMemo, useRef, useState, type ReactNode, type RefObject } from "react";
import { GridLayout, useContainerWidth, type Layout } from "react-grid-layout";
import "react-grid-layout/css/styles.css";
import "react-resizable/css/styles.css";
import {
  DEFAULT_LAYOUT,
  GRID_COLUMNS,
  GRID_GAP,
  ROW_HEIGHT,
  WIDGETS,
  sanitizeLayout,
  widgetMeta,
  type WidgetId,
  type WidgetPlacement,
} from "./catalog";
import { resetDashboardLayout, saveDashboardLayout } from "@/app/(app)/today/actions";

/** The configurable half of Today (CLAUDE.md §5): drag to move, drag the
 * corner to resize, remove a widget, add one back from the catalog, reset
 * to the default.
 *
 * Widgets are rendered on the server and handed in as `panels` — this
 * component owns placement, never content. That keeps one query block on
 * the page instead of ten client fetches, and means a widget can be moved
 * without its data being re-requested.
 *
 * Editing is a mode, not the default. A dashboard whose cards wobble under
 * the cursor while you are trying to read them is worse than one that
 * doesn't move, so drag and resize are off until "Edit layout" is on. */
export function WidgetGrid({
  panels,
  initialLayout,
}: {
  panels: Partial<Record<WidgetId, ReactNode>>;
  initialLayout: WidgetPlacement[];
}) {
  const [layout, setLayout] = useState<WidgetPlacement[]>(initialLayout);
  // v2 has no WidthProvider: the grid needs a measured pixel width, and
  // measureBeforeMount keeps the first paint from laying out against the
  // 1280px default and then jumping.
  const { width, containerRef, mounted } = useContainerWidth({ measureBeforeMount: true });
  const [editing, setEditing] = useState(false);
  const [adding, setAdding] = useState(false);
  const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const present = useMemo(() => new Set(layout.map((l) => l.i)), [layout]);
  const missing = WIDGETS.filter((w) => !present.has(w.id));

  /** Dragging fires a change per animation frame; only the final position
   * is worth a database write.
   *
   * A layout identical to the default is stored as *no row* rather than a
   * copy of the default — that is what keeps "Reset" meaning "follow the
   * default from now on" instead of freezing today's default into the
   * advisor's record. Without this, resetting deleted the row and the
   * resulting layout change wrote it straight back.  */
  function persist(next: WidgetPlacement[]) {
    setLayout(next);
    if (saveTimer.current) clearTimeout(saveTimer.current);
    const isDefault = JSON.stringify(next) === JSON.stringify(DEFAULT_LAYOUT);
    saveTimer.current = setTimeout(() => {
      void (isDefault ? resetDashboardLayout() : saveDashboardLayout(next));
    }, 400);
  }

  function onLayoutChange(next: Layout) {
    const clean = sanitizeLayout(next);
    if (!clean || clean.length === 0) return;
    // react-grid-layout reports a change on mount too; ignore the no-ops so
    // a page view doesn't write a layout row.
    if (JSON.stringify(clean) === JSON.stringify(layout)) return;
    persist(clean);
  }

  function remove(id: WidgetId) {
    persist(layout.filter((l) => l.i !== id));
  }

  function add(id: WidgetId) {
    const meta = widgetMeta(id);
    if (!meta) return;
    // Drop it below everything currently placed, where it can't displace
    // what the advisor already arranged.
    const bottom = layout.reduce((max, l) => Math.max(max, l.y + l.h), 0);
    persist([...layout, { i: id, x: 0, y: bottom, w: meta.defaultSize.w, h: meta.defaultSize.h }]);
    setAdding(false);
  }

  function reset() {
    setAdding(false);
    persist(DEFAULT_LAYOUT);
  }

  return (
    <div>
      <div className="mb-3 flex items-center justify-end gap-2">
        {editing ? (
          <>
            <div className="mr-auto text-xs text-ink-muted">
              Drag to move, drag a corner to resize. Changes save as you go.
            </div>
            <div className="relative">
              <button
                onClick={() => setAdding((v) => !v)}
                disabled={missing.length === 0}
                className="rounded-control border border-rule px-3 py-1.5 text-xs font-semibold disabled:opacity-40"
                title={missing.length === 0 ? "Every widget is already on the dashboard" : undefined}
              >
                Add widget
              </button>
              {adding && missing.length > 0 ? (
                <div className="absolute right-0 top-9 z-20 w-72 rounded-card border border-rule bg-surface p-1.5 shadow-sm">
                  {missing.map((w) => (
                    <button
                      key={w.id}
                      onClick={() => add(w.id)}
                      className="block w-full rounded-control px-2.5 py-2 text-left hover:bg-paper"
                    >
                      <div className="text-sm font-semibold">{w.title}</div>
                      <div className="text-xs text-ink-muted">{w.description}</div>
                    </button>
                  ))}
                </div>
              ) : null}
            </div>
            <button onClick={reset} className="rounded-control border border-rule px-3 py-1.5 text-xs font-semibold">
              Reset
            </button>
            <button
              onClick={() => {
                setEditing(false);
                setAdding(false);
              }}
              className="rounded-control bg-pine px-3 py-1.5 text-xs font-semibold text-on-accent"
            >
              Done
            </button>
          </>
        ) : (
          <button
            onClick={() => setEditing(true)}
            className="rounded-control border border-rule px-3 py-1.5 text-xs font-semibold text-ink-muted hover:text-ink"
          >
            Edit layout
          </button>
        )}
      </div>

      {/* The library types its ref React 19-style (HTMLDivElement | null);
          this app is on React 18, where RefObject isn't nullable. */}
      <div ref={containerRef as RefObject<HTMLDivElement>}>
        {mounted ? (
          <GridLayout
            width={width}
            className="-mx-2"
            layout={layout}
            gridConfig={{
              cols: GRID_COLUMNS,
              rowHeight: ROW_HEIGHT,
              margin: [GRID_GAP, GRID_GAP],
              containerPadding: [8, 0],
            }}
            dragConfig={{ enabled: editing, cancel: "button, a, input, textarea" }}
            resizeConfig={{ enabled: editing, handles: ["se"] }}
            onLayoutChange={onLayoutChange}
          >
            {layout.map((placement) => (
              <div key={placement.i} className="relative">
                {editing ? (
                  <button
                    onClick={() => remove(placement.i)}
                    aria-label={`Remove ${widgetMeta(placement.i)?.title ?? placement.i}`}
                    title="Remove from dashboard"
                    className="absolute -right-1.5 -top-1.5 z-10 flex h-5 w-5 items-center justify-center rounded-full border border-rule bg-surface text-xs text-ink-muted hover:border-loss hover:text-loss"
                  >
                    ×
                  </button>
                ) : null}
                <div className={`h-full ${editing ? "cursor-grab active:cursor-grabbing" : ""}`}>
                  {panels[placement.i] ?? null}
                </div>
              </div>
            ))}
          </GridLayout>
        ) : null}
      </div>
    </div>
  );
}
