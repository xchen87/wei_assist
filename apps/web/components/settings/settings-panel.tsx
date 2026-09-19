import type { ReactNode } from "react";

/** The shared scaffold every Settings subpage renders through, so the six
 * areas read as one surface: a page header, then panels of label/value
 * rows, then one honest note about what is and isn't wired. Structure is
 * hairline rules and spacing, not nested cards (CLAUDE.md §7). */
export function SettingsPage({
  title,
  description,
  children,
  note,
}: {
  title: string;
  description: string;
  children: ReactNode;
  note?: ReactNode;
}) {
  return (
    <div className="max-w-[760px] px-8 pb-10 pt-6">
      <div className="mb-5 border-b border-rule pb-[18px]">
        <h1 className="text-lg font-semibold">{title}</h1>
        <p className="mt-0.5 text-xs text-ink-muted">{description}</p>
      </div>
      <div className="flex flex-col gap-6">{children}</div>
      {note ? <div className="mt-7 border-t border-rule pt-3 text-xs text-ink-muted">{note}</div> : null}
    </div>
  );
}

export function Panel({
  title,
  subtitle,
  action,
  children,
}: {
  title: string;
  subtitle?: string;
  action?: ReactNode;
  children: ReactNode;
}) {
  return (
    <section className="rounded-card border border-rule bg-surface">
      <div className="flex items-start justify-between gap-4 border-b border-rule px-5 py-3.5">
        <div>
          <div className="text-sm font-semibold">{title}</div>
          {subtitle ? <div className="mt-0.5 text-xs text-ink-muted">{subtitle}</div> : null}
        </div>
        {action}
      </div>
      <div className="px-5">{children}</div>
    </section>
  );
}

/** One setting: what it is on the left, its current value or control on
 * the right. Rows are separated by a hairline, not boxed individually. */
export function Row({
  label,
  description,
  children,
}: {
  label: string;
  description?: string;
  children: ReactNode;
}) {
  return (
    <div className="flex items-center justify-between gap-6 border-b border-rule py-3 last:border-b-0">
      <div className="min-w-0">
        <div className="text-sm">{label}</div>
        {description ? <div className="mt-0.5 text-xs text-ink-muted">{description}</div> : null}
      </div>
      <div className="shrink-0 text-right text-sm">{children}</div>
    </div>
  );
}

/** A value that has no record behind it yet, rendered as visibly unset
 * rather than filled with an invented placeholder. */
export function Unset({ children = "Not set" }: { children?: ReactNode }) {
  return <span className="text-ink-muted">{children}</span>;
}
