import { Badge } from "@/components/ui/badge";
import { Panel, Row, SettingsPage, Unset } from "@/components/settings/settings-panel";

/** The assistant isn't connected to a model in this build — the chat dock
 * replies with a fixed "not wired up" message (lib/chat-store.ts) and
 * lib/ai doesn't exist yet. So this page is the policy surface it can
 * honestly be: the grounding rules and tool families the assistant will be
 * held to, each marked with whether anything enforces it yet. */

const GROUNDING_RULES: string[] = [
  "Every claim about a client's finances comes from a tool result and links to the record. If tools return nothing, the assistant says so.",
  "Figures render from the tool payload through lib/format, not restated as prose numbers.",
  "Anything with an external effect — send, schedule, file, change a plan value — is a proposal the advisor confirms. The model never commits silently.",
  "No specific securities to buy or sell, and no tax or legal advice presented as authoritative.",
  "Every interaction is logged with the tools called and the records touched.",
];

const TOOL_FAMILIES: { name: string; purpose: string }[] = [
  { name: "household.*", purpose: "Search, get section, get holdings, get activity." },
  { name: "market.*", purpose: "Quote, series, cited news." },
  { name: "calendar.* / task.*", purpose: "Read, propose, create on confirmation." },
  { name: "doc.*", purpose: "Retrieve, summarize, extract fields." },
  { name: "report.*", purpose: "Assemble a draft." },
  { name: "nav.*", purpose: "Navigate the workspace to a record." },
];

export default function AiSettingsPage() {
  return (
    <SettingsPage
      title="AI"
      description="Which model the assistant uses, what it's allowed to do, and what's disclosed to clients."
      note={
        <>
          The assistant is not connected to a model: the chat dock is UI-only and{" "}
          <code>lib/ai</code> — prompt assembly, tool definitions, and guardrails — isn&rsquo;t built
          yet (Phase 3, see PROGRESS.md). The rules below are the contract from CLAUDE.md §9 that the
          implementation will be held to, shown here rather than left undocumented; none of them is
          enforced in code today because there is no model call to enforce them on.
        </>
      }
    >
      <Panel title="Model" subtitle="Streaming responses via the Anthropic Messages API, with tool calling.">
        <Row label="Provider">
          <div className="flex items-center gap-2">
            <span>Anthropic</span>
            <Badge tone="neutral">Not connected</Badge>
          </div>
        </Row>
        <Row label="Model" description="Selected per org once the assistant is wired up.">
          <Unset />
        </Row>
        <Row label="API key" description="Stored server-side; never exposed to the browser.">
          <Unset>Not configured</Unset>
        </Row>
        <Row label="Interaction log" description="Tools called and records touched, per CLAUDE.md §11.">
          <Unset>Not built</Unset>
        </Row>
      </Panel>

      <Panel title="Grounding rules" subtitle="CLAUDE.md §9. Ungrounded speculation is a bug, not a setting.">
        <ol className="list-decimal py-3.5 pl-5 text-sm marker:text-ink-muted">
          {GROUNDING_RULES.map((rule) => (
            <li key={rule} className="mb-2 pl-1 last:mb-0">
              {rule}
            </li>
          ))}
        </ol>
      </Panel>

      <Panel title="Tools" subtitle="The only way the model touches data — there is no free-form SQL.">
        {TOOL_FAMILIES.map((t) => (
          <Row key={t.name} label={t.name} description={t.purpose}>
            <Unset>Not built</Unset>
          </Row>
        ))}
      </Panel>

      <Panel
        title="Vendor disclosure"
        subtitle="Third-party model calls must be covered by the org's disclosed vendor list (CLAUDE.md §11)."
      >
        <Row label="Disclosed vendors" description="Requires an Org record to attach the list to.">
          <Unset>None on file</Unset>
        </Row>
        <Row label="Client-facing AI disclosure" description="Shown on reports and letters the assistant drafts.">
          <Unset>Not configured</Unset>
        </Row>
      </Panel>
    </SettingsPage>
  );
}
