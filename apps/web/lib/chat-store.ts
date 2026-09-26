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

/** Mirrors the server's union — a type-only import, so the tool module's
 * Prisma dependency never reaches the client bundle. */
export type Proposal = import("@/lib/ai/tools").Proposal;

export type ProposalRecord = {
  id: string;
  proposal: Proposal;
  state: "pending" | "confirmed" | "declined";
};

export type GuardrailFlag = { rule: string; explanation: string; excerpt: string };

/** A record a tool returned, keyed by the ref the model cites it with. */
export type Citation = { ref: string; label: string; link: string };

export type ChatMessage = {
  role: "user" | "assistant";
  text: string;
  tools: ToolRun[];
  proposals: ProposalRecord[];
  guardrails: GuardrailFlag[];
  citations: Citation[];
  error?: string;
};

type ChatState = {
  label: string | null;
  href: string | null;
  /** Ids of the records the chip stands for, when it stands for a set — the
   * Clients list hands over the cohort it is actually showing rather than
   * making the assistant re-derive it from a URL it cannot interpret. */
  contextIds: string[];
  collapsed: boolean;
  messages: ChatMessage[];
  streaming: boolean;
  conversationId: string | null;
  setContext: (label: string, href: string, ids?: string[]) => void;
  /** Called once from the dock on mount — the store is created during SSR,
   * where sessionStorage doesn't exist. */
  restore: () => void;
  clearContext: () => void;
  send: (text: string) => void;
  stop: () => void;
  retry: () => void;
  resolveProposal: (messageIndex: number, proposalId: string, state: "confirmed" | "declined") => void;
};

let controller: AbortController | null = null;

/** The thread survives a reload, per tab. sessionStorage rather than
 * localStorage on purpose: a conversation belongs to the sitting the
 * advisor is in, and a second tab opening onto someone else's half-finished
 * thread about a different household would be worse than starting clean.
 *
 * What's stored is the transcript the advisor can already see — messages,
 * the tool calls and citations attached to them, the context chip — plus
 * the conversation id, so a resumed thread keeps writing to the same
 * append-only log rather than starting a second one. */
const SESSION_KEY = "meridian.chat";

type PersistedChat = Pick<
  ChatState,
  "messages" | "conversationId" | "label" | "href" | "contextIds"
>;

function persistSession(state: ChatState) {
  if (typeof window === "undefined") return;
  try {
    const snapshot: PersistedChat = {
      messages: state.messages,
      conversationId: state.conversationId,
      label: state.label,
      href: state.href,
      contextIds: state.contextIds,
    };
    sessionStorage.setItem(SESSION_KEY, JSON.stringify(snapshot));
  } catch {
    // Storage blocked or full: the thread just won't survive a reload.
  }
}

function emptyAssistant(): ChatMessage {
  return { role: "assistant", text: "", tools: [], proposals: [], guardrails: [], citations: [] };
}

export const useChatContext = create<ChatState>((set, get) => ({
  label: null,
  href: null,
  contextIds: [],
  collapsed: false,
  messages: [],
  streaming: false,
  conversationId: null,

  restore: () => {
    if (typeof window === "undefined") return;
    try {
      const raw = sessionStorage.getItem(SESSION_KEY);
      if (!raw) return;
      const saved = JSON.parse(raw) as Partial<PersistedChat>;
      if (!Array.isArray(saved.messages) || saved.messages.length === 0) return;
      set({
        messages: saved.messages,
        conversationId: saved.conversationId ?? null,
        // A route that sets its own context (a household page) wins over the
        // stored chip, so resuming never claims to be looking at a record
        // the advisor has since navigated away from.
        label: get().label ?? saved.label ?? null,
        href: get().href ?? saved.href ?? null,
        contextIds: get().contextIds.length > 0 ? get().contextIds : (saved.contextIds ?? []),
      });
    } catch {
      // A corrupt snapshot shouldn't cost the advisor the dock.
    }
  },

  setContext: (label, href, ids = []) => set({ label, href, contextIds: ids }),
  clearContext: () => set({ label: null, href: null, contextIds: [] }),

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
      { role: "user" as const, text: trimmed, tools: [], proposals: [], guardrails: [], citations: [] },
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
            contextIds: get().contextIds,
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
  | { type: "citations"; items: Citation[] }
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
    case "citations":
      patch((m) => ({ ...m, citations: [...m.citations, ...event.items] }));
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

// Every state change the advisor can see is worth keeping; streaming deltas
// land here too, so an interrupted answer survives a reload as far as it got.
if (typeof window !== "undefined") {
  useChatContext.subscribe(persistSession);
}
