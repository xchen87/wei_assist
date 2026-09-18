import type { ReactNode } from "react";

export function WidgetCard({
  title,
  span,
  children,
}: {
  title: string;
  span: number;
  children: ReactNode;
}) {
  return (
    <div
      className="rounded-card border border-rule bg-surface p-4"
      style={{ gridColumn: `span ${span} / span ${span}` }}
    >
      <div className="mb-3 text-sm font-semibold">{title}</div>
      {children}
    </div>
  );
}
