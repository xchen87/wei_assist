"use client";

import { useEffect, useRef, useState } from "react";
import { useChatContext } from "@/lib/chat-store";
import { ChatIcon, ChevronRightIcon, CloseIcon } from "@/components/ui/icons";
import { CitedText, GuardrailNotice, ProposalCard, ToolRunList } from "./message-parts";

/**
 * The assistant, streaming against /api/chat with grounded tool calls
 * (CLAUDE.md §9). Every assistant turn shows three things beyond the prose:
 * which tools it ran and what they touched, any proposal waiting on the
 * advisor, and any guardrail flag on the reply itself. The context chip
 * above the thread is what the route handed it, and clearing it really does
 * drop that context from the next request.
 */
export function ChatDock() {
  const [draft, setDraft] = useState("");
  const { label, href, clearContext, collapsed, messages, streaming, send, stop, retry } = useChatContext();
  const threadRef = useRef<HTMLDivElement>(null);

  // Follow the stream, but only while the advisor is already at the bottom —
  // yanking the view down mid-read is worse than a missed line.
  useEffect(() => {
    const el = threadRef.current;
    if (!el) return;
    const nearBottom = el.scrollHeight - el.scrollTop - el.clientHeight < 120;
    if (nearBottom) el.scrollTop = el.scrollHeight;
  }, [messages]);

  if (collapsed) {
    return (
      <div className="flex h-full w-14 shrink-0 flex-col items-center border-l border-rule bg-surface pt-4">
        <button
          onClick={() => useChatContext.setState({ collapsed: false })}
          title="Open assistant"
          className="flex h-9 w-9 items-center justify-center rounded-control text-pine hover:bg-pine-tint"
        >
          <ChatIcon />
        </button>
      </div>
    );
  }

  return (
    <div className="flex h-full w-[380px] shrink-0 flex-col border-l border-rule bg-surface">
      <div className="border-b border-rule p-4">
        <div className="mb-2.5 flex items-center justify-between">
          <div className="text-sm font-semibold">Assistant</div>
          <button
            onClick={() => useChatContext.setState({ collapsed: true })}
            className="text-ink-muted"
            title="Collapse"
          >
            <ChevronRightIcon />
          </button>
        </div>
        {label ? (
          <button
            onClick={clearContext}
            className="inline-flex items-center gap-1.5 rounded-control bg-pine-tint px-2.5 py-1 text-xs font-semibold text-pine"
            title={href ?? undefined}
          >
            {label}
            <CloseIcon />
          </button>
        ) : null}
      </div>

      <div ref={threadRef} className="flex-1 overflow-y-auto p-4">
        {messages.length === 0 ? (
          <div className="text-sm text-ink-muted">
            Ask about a household, draft something, or find what needs attention.
          </div>
        ) : (
          <div className="flex flex-col gap-4">
            {messages.map((m, i) =>
              m.role === "user" ? (
                <div key={i} className="max-w-[85%] self-end rounded-card bg-pine-tint px-3 py-2.5 text-sm">
                  {m.text}
                </div>
              ) : (
                <div key={i} className="max-w-[92%]">
                  <ToolRunList tools={m.tools} />
                  {m.text ? (
                    <CitedText text={m.text} citations={m.citations} />
                  ) : m.error ? null : (
                    <div className="text-sm text-ink-muted">Thinking…</div>
                  )}
                  {m.proposals.map((p) => (
                    <ProposalCard key={p.id} record={p} messageIndex={i} />
                  ))}
                  <GuardrailNotice flags={m.guardrails} />
                  {m.error ? (
                    <div className="mt-2 rounded-card border border-rule p-3">
                      <div className="text-xs leading-relaxed text-ink-muted">{m.error}</div>
                      <button
                        onClick={retry}
                        className="mt-2 rounded-control border border-rule px-2.5 py-1 text-xs font-semibold"
                      >
                        Try again
                      </button>
                    </div>
                  ) : null}
                  {m.text && !streaming ? (
                    <button
                      onClick={() => void navigator.clipboard?.writeText(m.text)}
                      className="mt-1.5 text-xs text-ink-muted hover:text-ink"
                    >
                      Copy
                    </button>
                  ) : null}
                </div>
              ),
            )}
          </div>
        )}
      </div>

      <div className="border-t border-rule p-4">
        <form
          onSubmit={(e) => {
            e.preventDefault();
            send(draft);
            setDraft("");
          }}
          className="flex items-center gap-2 rounded-control border border-rule px-2.5 py-2"
        >
          <input
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            disabled={streaming}
            placeholder={streaming ? "Answering…" : "Ask a follow-up…"}
            className="flex-1 bg-transparent text-sm outline-none placeholder:text-ink-muted disabled:opacity-60"
          />
          {streaming ? (
            <button
              type="button"
              onClick={stop}
              className="rounded-control border border-rule px-2 py-0.5 text-xs font-semibold"
            >
              Stop
            </button>
          ) : null}
        </form>
      </div>
    </div>
  );
}
