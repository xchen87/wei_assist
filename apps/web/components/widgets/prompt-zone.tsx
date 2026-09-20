"use client";

import { useState } from "react";
import { useChatContext } from "@/lib/chat-store";

export function PromptZone({
  advisorFirstName,
  chips,
}: {
  advisorFirstName: string;
  /** Computed from the book on the server (CLAUDE.md §5: chips are
   * generated from real state, not hardcoded) — a chip that names a
   * household the advisor doesn't have is worse than no chip. */
  chips: string[];
}) {
  const [draft, setDraft] = useState("");
  const send = useChatContext((s) => s.send);

  return (
    <div className="mb-11 text-center">
      <div className="mb-5 text-xl font-semibold tracking-tight">Good morning, {advisorFirstName}.</div>

      <form
        onSubmit={(e) => {
          e.preventDefault();
          send(draft);
          setDraft("");
        }}
        className="flex items-center gap-2.5 rounded-card border border-rule bg-surface px-3.5 py-3.5 shadow-sm"
      >
        <input
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          placeholder="Ask about a household, draft something, or find what needs attention…"
          className="flex-1 bg-transparent text-left text-md text-ink outline-none placeholder:text-ink-muted"
        />
        <button
          type="submit"
          className="flex h-[34px] w-[34px] shrink-0 items-center justify-center rounded-control bg-pine"
        >
          <svg width={16} height={16} viewBox="0 0 20 20" fill="none" stroke="var(--on-accent)" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round">
            <path d="M4 10h12M11 5l5 5-5 5" />
          </svg>
        </button>
      </form>

      <div className="mt-3.5 flex flex-wrap justify-center gap-2">
        {chips.map((chip) => (
          <button
            key={chip}
            onClick={() => send(chip)}
            className="rounded-control border border-rule bg-surface px-3 py-1.5 text-sm text-ink hover:bg-paper"
          >
            {chip}
          </button>
        ))}
      </div>
    </div>
  );
}
