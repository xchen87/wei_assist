import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Panel, Row, SettingsPage } from "@/components/settings/settings-panel";
import { calendar } from "@/lib/integrations";

export const dynamic = "force-dynamic";

/** Nothing here is connected to anything outside Meridian. One adapter
 * interface exists — calendar, with a mock provider that reads the firm's
 * own meeting rows (D-036) — and its status is read live below. The rest is
 * Phase 8. Rather than show a plausible list of "Connected" feeds with
 * invented last-sync times, each row states what the feed would supply and
 * what's standing in for it today. */

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
    feeds: "Busy time behind Schedule, the Agenda widget, and the assistant's free-slot search.",
    standIn: "Mock adapter over Meridian's own meeting rows",
  },
  {
    name: "Email",
    feeds: "Client correspondence in Activity, and delivery for Reports.",
    standIn: "Nothing — Activity shows seeded events only",
  },
];

export default async function IntegrationsSettingsPage() {
  const calendarStatus = await calendar.status();
  return (
    <SettingsPage
      title="Integrations"
      description="External feeds that would replace the fixtures the app currently runs on."
      note={
        <>
          No external provider is connected and there are no credentials to store. The calendar
          adapter interface exists (<code>lib/integrations</code>) with a mock provider; a Google or
          Microsoft provider is Phase 8. Each row names what&rsquo;s standing in for that feed today so
          it&rsquo;s clear which screens are reading fixtures rather than live data.
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
        <Row label={`Calendar · ${calendar.label}`} description={calendarStatus.detail}>
          <Badge tone="neutral">{calendarStatus.connected ? "Connected" : "Mock"}</Badge>
        </Row>
      </Panel>
    </SettingsPage>
  );
}
