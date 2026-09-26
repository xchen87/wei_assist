"use client";

import { useChatContext } from "@/lib/chat-store";

/** Sends a prompt to the chat dock. The dock opens and streams there, so
 * the dashboard stays visible (CLAUDE.md §5). */
export function AskButton({ prompt, children, className = "" }: { prompt: string; children: React.ReactNode; className?: string }) {
  const send = useChatContext((s) => s.send);
  return (
    <button type="button" onClick={() => send(prompt)} className={className}>
      {children}
    </button>
  );
}
