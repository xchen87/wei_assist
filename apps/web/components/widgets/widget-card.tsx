import type { ReactNode } from "react";

/** A widget's frame. It no longer carries its own column span: placement is
 * the grid's job now (components/widgets/widget-grid.tsx), and a widget
 * that also decided its width would fight the layout the advisor dragged.
 *
 * `h-full` plus an internal scroll means a widget resized shorter than its
 * content clips inside its own card rather than overflowing onto the one
 * below it. */
export function WidgetCard({ title, children }: { title: string; children: ReactNode }) {
  return (
    <div className="flex h-full flex-col overflow-hidden rounded-card border border-rule bg-surface p-4">
      <div className="mb-3 shrink-0 text-sm font-semibold">{title}</div>
      <div className="min-h-0 flex-1 overflow-y-auto">{children}</div>
    </div>
  );
}
