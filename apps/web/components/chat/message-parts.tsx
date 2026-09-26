"use client";

import { usePathname, useRouter } from "next/navigation";
import { useTransition } from "react";
import { dismissInsight } from "@/app/(app)/clients/[id]/actions";
import Link from "next/link";
import { useChatContext, type ChatMessage, type Citation, type Proposal, type ProposalRecord } from "@/lib/chat-store";
import { MeetingProposalCard, TaskProposalCard } from "./proposal-cards";

const TOOL_LABELS: Record<string, string> = {
  search_households: "Searched the book",
  get_household_section: "Read a plan section",
  get_household_activity: "Read recent activity",
  get_open_insights: "Read open insights",
  get_open_alerts: "Read open signals",
  get_agenda: "Read the daily brief",
  find_meeting_slots: "Checked the calendar",
  propose_navigation: "Offered a link",
  propose_dismiss_insight: "Proposed a dismissal",
  propose_meeting: "Proposed a meeting",
  propose_task: "Proposed a task",
};

const RESOLVED_LABEL: Record<Proposal["kind"], { confirmed: string; declined: string }> = {
  navigate: { confirmed: "Opened.", declined: "Left alone." },
  dismissInsight: { confirmed: "Dismissed.", declined: "Left alone." },
  meeting: { confirmed: "Booked. It is on Schedule and the household's timeline.", declined: "Not booked." },
  task: { confirmed: "Added to Tasks.", declined: "Not added." },
};

/** What the assistant read, shown inline as it happens. CLAUDE.md §9 rule 1
 * says every claim has to come from a tool result — this is where the
 * advisor can see that it did, without taking the answer on faith. */
export function ToolRunList({ tools }: { tools: ChatMessage["tools"] }) {
  if (tools.length === 0) return null;
  return (
    <div className="mb-2 flex flex-col gap-1">
      {tools.map((t) => (
        <div key={t.id} className="flex items-center gap-1.5 text-xs text-ink-muted">
          <span
            className={`h-1.5 w-1.5 shrink-0 rounded-full ${
              t.status === "error" ? "bg-loss" : t.status === "done" ? "bg-pine" : "animate-pulse bg-brass"
            }`}
          />
          <span>{TOOL_LABELS[t.name] ?? t.name}</span>
          {t.summary ? <span className="truncate">· {t.summary}</span> : null}
        </div>
      ))}
    </div>
  );
}

/** Nothing with an effect outside the conversation happens without this
 * card (§9 rule 3). The model can only ever get as far as asking. */
export function ProposalCard({
  record,
  messageIndex,
}: {
  record: ProposalRecord;
  messageIndex: number;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const [isPending, startTransition] = useTransition();
  const resolveProposal = useChatContext((s) => s.resolveProposal);

  const { proposal, state } = record;

  if (state !== "pending") {
    return (
      <div className="mt-2 rounded-card border border-rule px-3 py-2 text-xs text-ink-muted">
        {RESOLVED_LABEL[proposal.kind][state]}
      </div>
    );
  }

  if (proposal.kind === "meeting") {
    return <MeetingProposalCard proposal={proposal} onResolved={(s) => resolveProposal(messageIndex, record.id, s)} />;
  }
  if (proposal.kind === "task") {
    return <TaskProposalCard proposal={proposal} onResolved={(s) => resolveProposal(messageIndex, record.id, s)} />;
  }

  if (proposal.kind === "navigate") {
    return (
      <div className="mt-2 rounded-card border border-rule p-3">
        <button
          onClick={() => {
            resolveProposal(messageIndex, record.id, "confirmed");
            router.push(proposal.path);
          }}
          className="rounded-control bg-pine px-2.5 py-1 text-xs font-semibold text-on-accent"
        >
          {proposal.label}
        </button>
      </div>
    );
  }

  return (
    <div className="mt-2 rounded-card border border-brass bg-brass-tint p-3">
      <div className="mb-1 text-xs font-semibold">Dismiss this insight?</div>
      <div className="mb-2.5 text-xs leading-relaxed text-ink">{proposal.text}</div>
      <div className="flex gap-2">
        <button
          disabled={isPending}
          onClick={() => resolveProposal(messageIndex, record.id, "declined")}
          className="rounded-control border border-rule bg-surface px-2.5 py-1 text-xs disabled:opacity-50"
        >
          No
        </button>
        <button
          disabled={isPending}
          onClick={() =>
            startTransition(async () => {
              // The same insight renders on the household Overview and on
              // its own section page, and the advisor may be standing on
              // either — or on Tasks. Revalidate the page actually being
              // looked at, the way InsightCard does, or the card the
              // assistant just dismissed stays on screen.
              await dismissInsight(proposal.insightId, pathname ?? `/clients/${proposal.householdId}`);
              resolveProposal(messageIndex, record.id, "confirmed");
              router.refresh();
            })
          }
          className="rounded-control bg-pine px-2.5 py-1 text-xs font-semibold text-on-accent disabled:opacity-50"
        >
          Dismiss it
        </button>
      </div>
    </div>
  );
}

/** A reply that tripped lib/ai/guardrails is shown with the reason
 * attached rather than quietly suppressed — the advisor is the one who
 * decides what to do with it (§9 rule 4). */
export function GuardrailNotice({ flags }: { flags: ChatMessage["guardrails"] }) {
  if (flags.length === 0) return null;
  return (
    <div className="mt-2 rounded-card border border-loss bg-loss-tint p-3">
      <div className="mb-1 text-xs font-semibold text-loss">Flagged before you act on this</div>
      {flags.map((f) => (
        <div key={f.rule} className="mt-1 text-xs leading-relaxed text-ink">
          {f.explanation}
        </div>
      ))}
    </div>
  );
}


/** Renders an assistant reply: citation tokens become links carrying each
 * record's own name — so a claim attributed to the wrong row shows it,
 * instead of reading as plausible prose — and the light markdown the model
 * writes (bold, dash bullets) is rendered rather than shown raw. A token
 * with no matching record renders struck through rather than silently
 * dropped; the guardrails flag the same case. */
export function CitedText({ text, citations }: { text: string; citations: Citation[] }) {
  const byRef = new Map(citations.map((c) => [c.ref, c]));
  const lines = text.split("\n");

  return (
    <div className="flex flex-col gap-1.5 text-sm leading-relaxed">
      {lines.map((line, i) => {
        const bullet = /^\s*[-*]\s+(.*)$/.exec(line);
        if (bullet) {
          return (
            <div key={i} className="flex gap-2 pl-0.5">
              <span className="select-none text-ink-muted">·</span>
              <span>{renderInline(bullet[1]!, byRef)}</span>
            </div>
          );
        }
        if (!line.trim()) return null;
        return <div key={i}>{renderInline(line, byRef)}</div>;
      })}
    </div>
  );
}

/** Splits a line into citation chips, bold runs, and plain text. Kept to
 * the two markdown forms the assistant actually produces — this is a chat
 * column, not a document renderer. */
function renderInline(line: string, byRef: Map<string, Citation>) {
  const parts = line.split(/(\[R\d+\]|\*\*[^*]+\*\*)/g);

  return parts.map((part, i) => {
    const bold = /^\*\*([^*]+)\*\*$/.exec(part);
    if (bold) return <span key={i} className="font-semibold">{bold[1]}</span>;

    const ref = /^\[(R\d+)\]$/.exec(part);
    if (!ref) return <span key={i}>{part}</span>;

    const citation = byRef.get(ref[1]!);
    if (!citation) {
      return (
        <span key={i} className="text-xs text-loss line-through" title="No record was returned for this citation">
          {part}
        </span>
      );
    }
    return (
      <Link
        key={i}
        href={citation.link}
        title={citation.label}
        className="mx-0.5 whitespace-nowrap rounded-control bg-pine-tint px-1.5 py-0.5 text-xs font-semibold text-pine hover:underline"
      >
        {citation.label.length > 40 ? `${citation.label.slice(0, 39)}…` : citation.label}
      </Link>
    );
  });
}
