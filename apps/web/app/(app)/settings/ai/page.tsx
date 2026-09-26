import { prisma } from "@meridian/db";
import { Badge } from "@/components/ui/badge";
import { Panel, Row, SettingsPage, Unset } from "@/components/settings/settings-panel";
import { isConfigured, MODEL_ID } from "@/lib/ai/model";
import { TOOLS } from "@/lib/ai/tools";
import { CURRENT_ADVISOR_NAME } from "@/lib/current-advisor";
import { loadPatterns } from "@/lib/patterns";
import { hourLabel, WEEKDAY_NAMES } from "@/lib/calc/patterns";
import { AlertRuleControl, HoursControl, RecomputeButton, ResetLink, WeekdaysControl } from "@/components/settings/pattern-controls";
import { formatShortDate } from "@/lib/format/date";

export const dynamic = "force-dynamic";

/** Reads the assistant's own modules rather than restating them, so this
 * page can't drift from what's actually wired: the tool list is the real
 * registry from lib/ai/tools, the model id is the one the route sends, and
 * the log counts are real rows. */

const GROUNDING_RULES: { text: string; enforcement: string }[] = [
  {
    text: "Every claim about a household's finances comes from a tool result and links to the record. If tools return nothing, the assistant says so.",
    enforcement:
      "System prompt · every record returned carries a citation ref the reply must quote, rendered in the dock as a link to that record · flagged when a figure appears with no tool call, when an answer cites nothing, or when a ref resolves to no record",
  },
  {
    text: "Figures are quoted from the tool payload, already rendered through lib/format — not restated or recomputed by the model.",
    enforcement: "System prompt · tools return display strings, not raw numbers",
  },
  {
    text: "Anything with an external effect is a proposal the advisor confirms. The model never commits silently.",
    enforcement: "Enforced in code: propose_* tools return a confirmation card and never execute",
  },
  {
    text: "No specific securities to buy or sell, and no tax or legal advice presented as authoritative.",
    enforcement: "System prompt · checked after the fact by lib/ai/guardrails, which flags the reply in the dock",
  },
  {
    text: "Every interaction is logged with the tools called and the records touched.",
    enforcement: "Append-only AiConversation / AiMessage / AiToolCall rows",
  },
];

/** CLAUDE.md §9 names six tool families. These two have no data behind
 * them yet, and a tool that invents its own answer is worse than no tool.
 * calendar.* and task.* are built (M-assist): find_meeting_slots,
 * propose_meeting and propose_task below. */
const UNBUILT_FAMILIES: { name: string; why: string }[] = [
  { name: "market.*", why: "No Security or Quote model — the Markets page is a static snapshot, so a quote tool would fabricate. The signals engine's watched indicators are a different thing: simulated fixtures the assistant can read through get_open_alerts." },
  { name: "report.*", why: "The report builder has no renderer or delivery path yet (Phase 8)." },
];

export default async function AiSettingsPage() {
  const connected = isConfigured();
  const advisor = await prisma.advisor.findFirst({ where: { name: CURRENT_ADVISOR_NAME }, select: { id: true } });
  const [conversations, toolCalls, flagged, patterns] = await Promise.all([
    prisma.aiConversation.count(),
    prisma.aiToolCall.count(),
    prisma.aiMessage.count({ where: { guardrailFlags: { not: null } } }),
    advisor ? loadPatterns(advisor.id) : Promise.resolve(null),
  ]);

  return (
    <SettingsPage
      title="AI"
      description="Which model the assistant uses, what it's allowed to do, and what's recorded."
      note={
        <>
          The assistant is wired to the Anthropic Messages API with streaming and tool calling. It reads
          only through the tools listed below — there is no free-form SQL — and every call is written to
          an append-only log. {connected ? null : <>No <code>ANTHROPIC_API_KEY</code> is set in this
          environment, so the chat dock answers with that fact instead of a model response; everything
          else in Meridian runs without it. </>}
          Two of CLAUDE.md §9&rsquo;s six tool families aren&rsquo;t built, because the data behind them
          doesn&rsquo;t exist yet — listed below rather than stubbed with invented answers.
        </>
      }
    >
      <Panel title="Model" subtitle="Streaming responses via the Anthropic Messages API, with tool calling.">
        <Row label="Provider">
          <div className="flex items-center gap-2">
            <span>Anthropic</span>
            <Badge tone={connected ? "pine" : "neutral"}>{connected ? "Connected" : "No key set"}</Badge>
          </div>
        </Row>
        <Row label="Model" description="Sent on every request from lib/ai/model.ts.">
          <span className="tabular">{MODEL_ID}</span>
        </Row>
        <Row label="API key" description="Read from the server environment; never exposed to the browser.">
          {connected ? <span>Configured</span> : <Unset>Not configured</Unset>}
        </Row>
      </Panel>

      <Panel
        title="Interaction log"
        subtitle="Append-only, per CLAUDE.md §11. Records tool inputs and the ids of records touched — never tool result payloads."
      >
        <Row label="Conversations">
          <span className="tabular">{conversations}</span>
        </Row>
        <Row label="Tool calls logged" description="With duration, success, and the records each one touched.">
          <span className="tabular">{toolCalls}</span>
        </Row>
        <Row label="Replies flagged by guardrails">
          <span className={`tabular ${flagged > 0 ? "text-brass" : ""}`}>{flagged}</span>
        </Row>
      </Panel>

      <Panel
        title="Working patterns"
        subtitle="What the assistant has noticed about how you work, from your own records. Used only to order and phrase suggestions — never to hide one. Correct anything here and inference leaves it alone."
        action={<RecomputeButton />}
      >
        {!patterns || patterns.all.length === 0 ? (
          <Row label="No patterns yet" description="Book a few meetings, or act on or dismiss a few signals, and this fills in.">
            <Unset>Nothing inferred</Unset>
          </Row>
        ) : (
          patterns.all.map((p) => (
            <div key={p.key} className="flex items-start justify-between gap-6 border-b border-rule py-3 last:border-b-0">
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <span className="text-sm font-semibold">{p.label}</span>
                  <Badge tone={p.source === "advisor" ? "pine" : "neutral"}>{p.source === "advisor" ? "Set by you" : "Inferred"}</Badge>
                  {p.value.kind === "alert-rule" && p.value.muted && <Badge tone="brass">Ordered lower</Badge>}
                </div>
                <div className="mt-0.5 text-xs text-ink-muted">
                  {p.evidence}
                  {p.source === "inferred" && ` · computed ${formatShortDate(p.computedAt)}`}
                </div>
                <div className="mt-1.5 text-sm">{describePattern(p.value)}</div>
                <div className="mt-2 flex items-center gap-3">
                  {p.value.kind === "weekdays" && <WeekdaysControl value={p.value} />}
                  {p.value.kind === "hours" && <HoursControl value={p.value} />}
                  {p.value.kind === "alert-rule" && <AlertRuleControl value={p.value} />}
                  {p.source === "advisor" && <ResetLink patternKey={p.key} />}
                </div>
              </div>
            </div>
          ))
        )}
      </Panel>

      <Panel title="Grounding rules" subtitle="CLAUDE.md §9. Ungrounded speculation is a bug, not a setting.">
        {GROUNDING_RULES.map((rule, i) => (
          <div key={rule.text} className="border-b border-rule py-3 last:border-b-0">
            <div className="flex gap-2 text-sm">
              <span className="text-ink-muted">{i + 1}.</span>
              <span>{rule.text}</span>
            </div>
            <div className="mt-1 pl-5 text-xs text-ink-muted">{rule.enforcement}</div>
          </div>
        ))}
      </Panel>

      <Panel title="Tools" subtitle="The only way the model touches data. Read tools run immediately; proposals wait on you.">
        {TOOLS.map((tool) => (
          <Row key={tool.name} label={tool.name} description={tool.definition.description}>
            <Badge tone={tool.effect === "proposal" ? "brass" : "pine"}>
              {tool.effect === "proposal" ? "Needs confirmation" : "Read-only"}
            </Badge>
          </Row>
        ))}
      </Panel>

      <Panel title="Not built" subtitle="Tool families from CLAUDE.md §9 with no data behind them yet.">
        {UNBUILT_FAMILIES.map((f) => (
          <Row key={f.name} label={f.name} description={f.why}>
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

function describePattern(value: import("@/lib/calc/patterns").PatternValue): string {
  switch (value.kind) {
    case "weekdays":
      return value.days.length === 0 ? "No day stands out." : `Mostly ${value.days.map((d) => WEEKDAY_NAMES[d]).join(", ")}. Free slots on these days are offered first.`;
    case "hours":
      return value.startHours.length === 0 ? "No start time stands out." : `Usually ${value.startHours.map(hourLabel).join(", ")}. Slots at these times are offered first.`;
    case "cadence":
      return `${value.onTimePct}% of ${value.households} households. Measured, not a preference — the brief lists every due review regardless.`;
    case "alert-rule":
      return value.tendency === "acts"
        ? "You act on this rule. Its lines keep their place in the brief."
        : value.tendency === "dismisses"
          ? "You usually dismiss this rule. Its medium and low lines are ordered a little lower in the brief; high-severity lines are never moved."
          : value.tendency === "mixed"
            ? "Mixed. No effect on ordering."
            : "Not enough history yet. No effect on ordering.";
  }
}
