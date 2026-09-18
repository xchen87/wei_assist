import { CompletenessRing } from "./completeness-ring";
import { EmptyState } from "@/components/ui/empty-state";
import { Button } from "@/components/ui/button";

/** Per D-003: every section always exists, even with nothing in it yet.
 * An empty section says what's missing and offers one action — it is
 * never just hidden. This covers the seven sections not yet wired to real
 * data (see PROGRESS.md): Retirement, Tax, Protection, Estate, household
 * Documents, Activity, Compliance. */
export function EmptySection({ title, description }: { title: string; description: string }) {
  return (
    <div className="px-8 py-6">
      <div className="mb-5 flex items-center gap-3.5 border-b border-rule pb-[18px]">
        <CompletenessRing pct={0} />
        <div>
          <div className="text-lg font-semibold">{title}</div>
          <div className="text-xs text-ink-muted">Not started</div>
        </div>
      </div>

      <EmptyState
        title={`No ${title.toLowerCase()} data yet`}
        description={description}
        action={
          <Button variant="primary" disabled title="Not wired up in this build">
            Start {title.toLowerCase()}
          </Button>
        }
      />
    </div>
  );
}
