"use client";

import { useState } from "react";
import { useChatContext } from "@/lib/chat-store";
import { ChatIcon, ChevronRightIcon, CloseIcon } from "@/components/ui/icons";

/**
 * The assistant isn't wired to the Anthropic API yet (that's Phase 3 —
 * streaming, tool-calling, grounded citations per CLAUDE.md §9). This is a
 * real, interactive shell: collapse state, a context chip, and a
 * composer — shared with the Today page's prompt zone via useChatContext
 * so a message submitted there streams into this same dock, per §5.
 */
export function ChatDock() {
  const [draft, setDraft] = useState("");
  const { label, href, clearContext, collapsed, messages, send } = useChatContext();

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

      <div className="flex-1 overflow-y-auto p-4">
        {messages.length === 0 ? (
          <div className="text-sm text-ink-muted">
            Ask about a household, draft something, or find what needs attention.
          </div>
        ) : (
          <div className="flex flex-col gap-3.5">
            {messages.map((m, i) => (
              <div
                key={i}
                className={
                  m.role === "user"
                    ? "max-w-[85%] self-end rounded-card bg-pine-tint px-3 py-2.5 text-sm"
                    : "max-w-[92%] text-sm leading-relaxed text-ink-muted"
                }
              >
                {m.text}
              </div>
            ))}
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
            placeholder="Ask a follow-up..."
            className="flex-1 bg-transparent text-sm outline-none placeholder:text-ink-muted"
          />
        </form>
      </div>
    </div>
  );
}
