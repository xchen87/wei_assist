/** The widget catalog (CLAUDE.md §5). One entry per widget: what it's
 * called, how big it wants to be, and how small it may be dragged.
 *
 * §5 describes each widget exporting its own `{ id, title, defaultSize,
 * minSize, Component }`. The Component half lives in the Today page
 * instead, because every widget is server-rendered from one query block
 * there — a widget can't export a component that fetches its own data
 * until each one owns its fetching (the TanStack Query move §5 implies,
 * still not done). Everything that isn't the component lives here, so the
 * grid, the "add widget" menu, and the default layout all read one list.
 *
 * Heights are grid rows, not pixels: ROW_HEIGHT px each, plus the gap. */
export const GRID_COLUMNS = 12;
export const ROW_HEIGHT = 28;
export const GRID_GAP = 16;

export type WidgetId =
  | "agenda"
  | "tasks"
  | "alerts"
  | "pipeline"
  | "markets"
  | "book"
  | "reviews"
  | "milestones"
  | "recents"
  | "notes";

export type WidgetMeta = {
  id: WidgetId;
  title: string;
  /** What the widget is, for the add menu — the catalog is the only place
   * an advisor sees a widget they don't currently have on screen. */
  description: string;
  defaultSize: { w: number; h: number };
  minSize: { w: number; h: number };
};

export const WIDGETS: WidgetMeta[] = [
  {
    id: "agenda",
    title: "Agenda",
    description: "Today and tomorrow's meetings, with a prep-readiness dot per household meeting.",
    defaultSize: { w: 6, h: 7 },
    minSize: { w: 3, h: 4 },
  },
  {
    id: "tasks",
    title: "Tasks",
    description: "Your due and overdue tasks, grouped by household.",
    defaultSize: { w: 3, h: 7 },
    minSize: { w: 3, h: 4 },
  },
  {
    id: "alerts",
    title: "Alerts",
    description: "Drift breaches and overdue reviews.",
    defaultSize: { w: 3, h: 7 },
    minSize: { w: 3, h: 4 },
  },
  {
    id: "pipeline",
    title: "Pipeline",
    description: "Prospect funnel with a count per stage.",
    defaultSize: { w: 4, h: 7 },
    minSize: { w: 3, h: 5 },
  },
  {
    id: "markets",
    title: "Markets",
    description: "Index snapshot and one headline mover. Static in this build.",
    defaultSize: { w: 4, h: 7 },
    minSize: { w: 3, h: 5 },
  },
  {
    id: "book",
    title: "Book",
    description: "AUM, net flows, and revenue run rate.",
    defaultSize: { w: 4, h: 7 },
    minSize: { w: 3, h: 4 },
  },
  {
    id: "reviews",
    title: "Reviews",
    description: "Households past their review cadence.",
    defaultSize: { w: 3, h: 6 },
    minSize: { w: 3, h: 4 },
  },
  {
    id: "milestones",
    title: "Milestones",
    description: "Birthdays and age-based triggers. Static in this build.",
    defaultSize: { w: 3, h: 6 },
    minSize: { w: 3, h: 4 },
  },
  {
    id: "recents",
    title: "Recents",
    description: "Recently opened households. Static in this build.",
    defaultSize: { w: 3, h: 6 },
    minSize: { w: 3, h: 4 },
  },
  {
    id: "notes",
    title: "Notes",
    description: "Freeform scratchpad. Not persisted in this build.",
    defaultSize: { w: 3, h: 6 },
    minSize: { w: 3, h: 4 },
  },
];

export type WidgetPlacement = { i: WidgetId; x: number; y: number; w: number; h: number };

/** The layout an advisor gets before they've moved anything, and what
 * "Reset layout" restores. Mirrors the arrangement the page shipped with
 * before the grid became configurable, so resetting is recognisable rather
 * than a surprise. §5's org-published default would replace this constant
 * once there's an Org to publish one.
 *
 * Three full-width bands, deliberately collision-free: react-grid-layout
 * compacts anything that overlaps, and a default that gets rewritten on
 * first render can never compare equal to itself — which is what "Reset"
 * depends on to know it has nothing to store. */
export const DEFAULT_LAYOUT: WidgetPlacement[] = [
  { i: "agenda", x: 0, y: 0, w: 6, h: 7 },
  { i: "tasks", x: 6, y: 0, w: 3, h: 7 },
  { i: "alerts", x: 9, y: 0, w: 3, h: 7 },
  { i: "pipeline", x: 0, y: 7, w: 4, h: 7 },
  { i: "markets", x: 4, y: 7, w: 4, h: 7 },
  { i: "book", x: 8, y: 7, w: 4, h: 7 },
  { i: "reviews", x: 0, y: 14, w: 3, h: 6 },
  { i: "milestones", x: 3, y: 14, w: 3, h: 6 },
  { i: "recents", x: 6, y: 14, w: 3, h: 6 },
  { i: "notes", x: 9, y: 14, w: 3, h: 6 },
];

const BY_ID = new Map(WIDGETS.map((w) => [w.id, w]));

export function widgetMeta(id: WidgetId): WidgetMeta | undefined {
  return BY_ID.get(id);
}

/** Drops unknown ids and clamps sizes, so a layout saved before a widget
 * was renamed or resized can't wedge the dashboard. */
export function sanitizeLayout(raw: unknown): WidgetPlacement[] | null {
  if (!Array.isArray(raw)) return null;
  const seen = new Set<string>();
  const placements: WidgetPlacement[] = [];

  for (const entry of raw) {
    if (typeof entry !== "object" || entry === null) continue;
    const { i, x, y, w, h } = entry as Record<string, unknown>;
    if (typeof i !== "string" || seen.has(i)) continue;
    const meta = BY_ID.get(i as WidgetId);
    if (!meta) continue;
    if ([x, y, w, h].some((n) => typeof n !== "number" || !Number.isFinite(n))) continue;

    seen.add(i);
    placements.push({
      i: meta.id,
      x: Math.min(Math.max(Math.round(x as number), 0), GRID_COLUMNS - meta.minSize.w),
      y: Math.max(Math.round(y as number), 0),
      w: Math.min(Math.max(Math.round(w as number), meta.minSize.w), GRID_COLUMNS),
      h: Math.max(Math.round(h as number), meta.minSize.h),
    });
  }

  return placements;
}
