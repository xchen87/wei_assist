import { WidgetCard } from "./widget-card";

/** Freeform scratchpad — no persistence yet (Phase 4 item). */
export function NotesWidget() {
  return (
    <WidgetCard title="Notes" span={3}>
      <div className="text-sm text-ink-muted">
        Ask compliance about the new attestation cadence before Friday&rsquo;s team meeting.
      </div>
    </WidgetCard>
  );
}
