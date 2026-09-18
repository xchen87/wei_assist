import { create } from "zustand";

export type ChatMessage = { role: "user" | "assistant"; text: string };

const NOT_WIRED_REPLY =
  "The assistant isn't connected to a model in this build yet — this dock is UI-only until Phase 3 wires up streaming and grounded tool calls.";

/** Chat dock state: context chip, collapse state, and the (currently
 * unwired — see NOT_WIRED_REPLY) message thread. One store per domain
 * slice, per CLAUDE.md §2. */
type ChatState = {
  label: string | null;
  href: string | null;
  collapsed: boolean;
  messages: ChatMessage[];
  setContext: (label: string, href: string) => void;
  clearContext: () => void;
  send: (text: string) => void;
};

export const useChatContext = create<ChatState>((set, get) => ({
  label: null,
  href: null,
  collapsed: false,
  messages: [],
  setContext: (label, href) => set({ label, href }),
  clearContext: () => set({ label: null, href: null }),
  send: (text) => {
    const trimmed = text.trim();
    if (!trimmed) return;
    set({
      collapsed: false,
      messages: [...get().messages, { role: "user", text: trimmed }, { role: "assistant", text: NOT_WIRED_REPLY }],
    });
  },
}));
