import { formatShortDate, daysUntil } from "@/lib/format/date";

export type AttestationData = {
  id: string;
  periodLabel: string;
  occurredAt: string;
  held: boolean;
  attested: boolean;
  scope: string;
  notes: string | null;
};

type State = "attested" | "unattested" | "scheduled" | "missed";

const STATE_COLOR: Record<State, string> = {
  attested: "var(--pine)",
  unattested: "var(--brass)",
  scheduled: "var(--ink-muted)",
  missed: "var(--loss)",
};
const STATE_LABEL: Record<State, string> = {
  attested: "Attested",
  unattested: "Not attested",
  scheduled: "Scheduled",
  missed: "Missed",
};

/** A review that was held but never attested is a different problem from
 * one that hasn't come due yet, and both are different from one that was
 * missed outright — so the marker carries state, not just presence. Filled
 * means signed; an open ring means the review exists but the sign-off
 * doesn't. */
export function attestationState(a: Pick<AttestationData, "held" | "attested" | "occurredAt">): State {
  if (a.attested) return "attested";
  if (a.held) return "unattested";
  return daysUntil(a.occurredAt) < 0 ? "missed" : "scheduled";
}

export function AttestationTimeline({ attestations }: { attestations: AttestationData[] }) {
  const sorted = [...attestations].sort(
    (a, b) => new Date(a.occurredAt).getTime() - new Date(b.occurredAt).getTime(),
  );
  if (sorted.length === 0) {
    return <div className="text-sm text-ink-muted">No reviews on record for this household yet.</div>;
  }

  const states = sorted.map(attestationState);
  const statesPresent = Array.from(new Set(states));

  return (
    <div>
      <div className="relative flex items-start">
        {/* The spine runs between the first and last marker, not edge to
            edge, so it never trails off past the timeline's own ends. */}
        <div
          className="absolute top-[30px] h-px bg-rule"
          style={{ left: `${50 / sorted.length}%`, right: `${50 / sorted.length}%` }}
        />
        {sorted.map((a, i) => {
          const state = states[i]!;
          const filled = state === "attested";
          return (
            <div key={a.id} className="relative flex flex-1 flex-col items-center px-1 text-center">
              <div className="mb-2 text-xs font-semibold">{a.periodLabel}</div>
              <div
                className="h-4 w-4 rounded-full border-2 bg-surface"
                style={{
                  borderColor: STATE_COLOR[state],
                  background: filled ? STATE_COLOR[state] : "var(--surface)",
                  borderStyle: state === "scheduled" ? "dashed" : "solid",
                }}
              />
              <div className="tabular mt-2 text-xs text-ink-muted">{formatShortDate(a.occurredAt)}</div>
              <div className="text-xs" style={{ color: STATE_COLOR[state] }}>
                {STATE_LABEL[state]}
              </div>
            </div>
          );
        })}
      </div>

      <div className="mt-4 flex flex-wrap gap-3.5 border-t border-rule pt-3.5 text-xs text-ink-muted">
        {statesPresent.map((state) => (
          <div key={state} className="flex items-center gap-1.5">
            <div
              className="h-2.5 w-2.5 rounded-full border-2"
              style={{
                borderColor: STATE_COLOR[state],
                background: state === "attested" ? STATE_COLOR[state] : "var(--surface)",
              }}
            />
            {STATE_LABEL[state]}
          </div>
        ))}
      </div>
    </div>
  );
}
