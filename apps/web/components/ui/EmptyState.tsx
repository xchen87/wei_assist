import type { ReactNode } from "react";

/** Per D-003: an empty section always shows what's missing and one action
 * to start it. Never render "nothing here" without a next step. */
export function EmptyState({
  title,
  description,
  action,
}: {
  title: string;
  description: string;
  action?: ReactNode;
}) {
  return (
    <div className="flex flex-col items-start gap-3 rounded-card border border-dashed border-rule px-6 py-8">
      <div>
        <div className="text-base font-semibold text-ink">{title}</div>
        <div className="mt-1 text-sm text-ink-muted">{description}</div>
      </div>
      {action}
    </div>
  );
}
