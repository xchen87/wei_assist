import Anthropic from "@anthropic-ai/sdk";

/** CLAUDE.md §2 pins the assistant to the Anthropic Messages API. The model
 * id lives here so Settings → AI has one place to read it from and a future
 * per-org override has one place to write to. */
export const MODEL_ID = "claude-opus-5";

/** The assistant is optional infrastructure: the rest of the app runs, and
 * demos, without a key. Callers check this and degrade to an honest "not
 * configured" reply rather than throwing a 500 into the chat dock. */
export function isConfigured(): boolean {
  return Boolean(process.env.ANTHROPIC_API_KEY);
}

let client: Anthropic | null = null;

export function getClient(): Anthropic {
  if (!client) client = new Anthropic();
  return client;
}
