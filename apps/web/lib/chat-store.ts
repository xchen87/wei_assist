import { create } from "zustand";

/** Chat dock state: route context chip, collapse state, and the message
 * thread, which is now a real streamed conversation against /api/chat
 * (CLAUDE.md §9). One store per domain slice, per §2.
 *
 * Everything the assistant does that the advisor needs to audit lives on
 * the message it belongs to — which tools ran, what they touched, what it
 * proposed, and whether the guardrails flagged the reply — rather than in
 * a separate panel, so the answer and its provenance can't get separated. */

export type ToolRun = {
  id: string;
  name: string;
  status: "running" | "done" | "error";
  summary?: string;
};

export type Proposal =
  | { kind: "navigate"; path: string; label: string }
  | { kind: "dismissInsight"; insightId: string; text: string; householdId: string };

export type ProposalRecord = {
  id: string;
  proposal: Proposal;
  state: "pending" | "confirmed" | "declined";
};

export type GuardrailFlag = { rule: string; explanation: string; excerpt: string };

export type ChatMessage = {
  role: "user" | "assistant";
  text: string;
  tools: ToolRun[];
  proposals: ProposalRecord[];
  guardrails: GuardrailFlag[];
  error?: string;
};

type ChatState = {
  label: string | null;
  href: string | null;
  collapsed: boolean;
  messages: ChatMessage[];
  streaming: boolean;
  conversationId: string | null;
  setContext: (label: string, href: string) => void;
  clearContext: () => void;
  send: (text: string) => void;
  stop: () => void;
  retry: () => void;
  resolveProposal: (messageIndex: number, proposalId: string, state: "confirmed" | "declined") => void;
};

let controller: AbortController | null = null;

function emptyAssistant(): ChatMessage {
  return { role: "assistant", text: "", tools: [], proposals: [], guardrails: [] };
}

export const useChatContext = create<ChatState>((set, get) => ({
  label: null,
  href: null,
  collapsed: false,
  messages: [],
  streaming: false,
  conversationId: null,

  setContext: (label, href) => set({ label, href }),
  clearContext: () => set({ label: null, href: null }),

  stop: () => {
    controller?.abort();
    controller = null;
    set({ streaming: false });
  },

  retry: () => {
    const messages = get().messages;
    const lastUser = [...messages].reverse().find((m) => m.role === "user");
    if (!lastUser || get().streaming) return;
    // Drop the failed assistant turn before asking again, so the thread
    // doesn't accumulate half-answers.
    const trimmed = messages.slice(0, messages.lastIndexOf(lastUser));
    set({ messages: trimmed });
    get().send(lastUser.text);
  },

  send: (text) => {
    const trimmed = text.trim();
    if (!trimmed || get().streaming) return;

    const history = [
      ...get().messages,
      { role: "user" as const, text: trimmed, tools: [], proposals: [], guardrails: [] },
    ];
    set({ collapsed: false, streaming: true, messages: [...history, emptyAssistant()] });

    const index = history.length; // the assistant message being filled in
    const patch = (fn: (m: ChatMessage) => ChatMessage) =>
      set((s) => ({ messages: s.messages.map((m, i) => (i === index ? fn(m) : m)) }));

    controller = new AbortController();

    void (async () => {
      try {
        const response = await fetch("/api/chat", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          signal: controller.signal,
          body: JSON.stringify({
            messages: history.map((m) => ({ role: m.role, text: m.text })),
            contextPath: get().href,
            conversationId: get().conversationId,
          }),
        });
        if (!response.body) throw new Error("The assistant returned no response body.");

        const reader = response.body.getReader();
        const decoder = new TextDecoder();
        let buffer = "";

        for (;;) {
          const { done, value } = await reader.read();
          if (done) break;
          buffer += decoder.decode(value, { stream: true });

          // Newline-delimited JSON: the last chunk is usually a partial line.
          const lines = buffer.split("\n");
          buffer = lines.pop() ?? "";
          for (const line of lines) {
            if (!line.trim()) continue;
            applyEvent(JSON.parse(line), patch, set);
          }
        }
      } catch (error) {
        if (error instanceof DOMException && error.name === "AbortError") {
          patch((m) => ({ ...m, text: m.text || "Stopped." }));
        } else {
          patch((m) => ({ ...m, error: error instanceof Error ? error.message : "Something went wrong." }));
        }
      } finally {
        controller = null;
        set({ streaming: false });
      }
    })();
  },

  resolveProposal: (messageIndex, proposalId, state) =>
    set((s) => ({
      messages: s.messages.map((m, i) =>
        i === messageIndex
          ? { ...m, proposals: m.proposals.map((p) => (p.id === proposalId ? { ...p, state } : p)) }
          : m,
      ),
    })),
}));

type StreamEvent =
  | { type: "conversation"; id: string }
  | { type: "text"; delta: string }
  | { type: "tool"; id: string; name: string; status: ToolRun["status"]; summary?: string }
  | { type: "proposal"; id: string; proposal: Proposal }
  | { type: "guardrail"; flags: GuardrailFlag[] }
  | { type: "error"; message: string }
  | { type: "done" };

function applyEvent(
  event: StreamEvent,
  patch: (fn: (m: ChatMessage) => ChatMessage) => void,
  set: (partial: Partial<ChatState>) => void,
) {
  switch (event.type) {
    case "conversation":
      set({ conversationId: event.id });
      return;
    case "text":
      patch((m) => ({ ...m, text: m.text + event.delta }));
      return;
    case "tool":
      patch((m) => ({
        ...m,
        tools: m.tools.some((t) => t.id === event.id)
          ? m.tools.map((t) =>
              t.id === event.id ? { ...t, status: event.status, summary: event.summary ?? t.summary } : t,
            )
          : [...m.tools, { id: event.id, name: event.name, status: event.status, summary: event.summary }],
      }));
      return;
    case "proposal":
      patch((m) => ({
        ...m,
        proposals: [...m.proposals, { id: event.id, proposal: event.proposal, state: "pending" }],
      }));
      return;
    case "guardrail":
      patch((m) => ({ ...m, guardrails: event.flags }));
      return;
    case "error":
      patch((m) => ({ ...m, error: event.message }));
      return;
    case "done":
      return;
  }
}
