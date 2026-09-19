import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Panel, Row, SettingsPage } from "@/components/settings/settings-panel";

/** Nothing here is connected: packages/integrations doesn't exist yet
 * (Phase 8 — see PROGRESS.md). Rather than show a plausible list of
 * "Connected" feeds with invented last-sync times, each row states what
 * the feed would supply and what's standing in for it today. */

const FEEDS: { name: string; feeds: string; standIn: string }[] = [
  {
    name: "Custodian",
    feeds: "Accounts, positions, balances, and transactions behind Balance and Allocation.",
    standIn: "Seeded per-household fixtures",
  },
  {
    name: "Market data",
    feeds: "Quotes, series, and movers behind Markets and every sparkline.",
    standIn: "Static snapshot in the Markets page",
  },
  {
    name: "Calendar",
    feeds: "Meetings behind Schedule and the Agenda widget.",
    standIn: "Household review dates",
  },
  {
    name: "Email",
    feeds: "Client correspondence in Activity, and delivery for Reports.",
    standIn: "Nothing — Activity shows seeded events only",
  },
];

export default function IntegrationsSettingsPage() {
  return (
    <SettingsPage
      title="Integrations"
      description="External feeds that would replace the fixtures the app currently runs on."
      note={
        <>
          No adapter is built: <code>packages/integrations</code> is Phase 8 and doesn&rsquo;t exist yet,
          and there are no credentials to store. Each row names what&rsquo;s standing in for that feed
          today so it&rsquo;s clear which screens are reading fixtures rather than live data.
        </>
      }
    >
      <Panel title="Data feeds" subtitle="Read-only connections. Meridian never trades (CLAUDE.md §1).">
        {FEEDS.map((f) => (
          <div key={f.name} className="flex items-center justify-between gap-6 border-b border-rule py-3.5 last:border-b-0">
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <span className="text-sm font-semibold">{f.name}</span>
                <Badge tone="neutral">Not connected</Badge>
              </div>
              <div className="mt-0.5 text-xs text-ink-muted">{f.feeds}</div>
              <div className="mt-0.5 text-xs text-ink-muted">Standing in: {f.standIn}</div>
            </div>
            <Button disabled title="No integration adapters in this build (Phase 8)">
              Connect
            </Button>
          </div>
        ))}
      </Panel>

      <Panel
        title="Sync health"
        subtitle="Per-feed last success and error detail, once a feed exists to report on."
      >
        <Row label="Scheduled jobs" description="Market sync, nightly recalcs, and digests (BullMQ + Redis).">
          <span className="text-ink-muted">Not running</span>
        </Row>
        <Row label="Last successful sync" description="Per feed, with the record counts it wrote.">
          <span className="text-ink-muted">No syncs yet</span>
        </Row>
      </Panel>
    </SettingsPage>
  );
}
