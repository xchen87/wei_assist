import Anthropic from "@anthropic-ai/sdk";

/** CLAUDE.md §2 pins the assistant to the Anthropic Messages API. The model
 * id lives here so Settings → AI has one place to read it from and a future
 * per-org override has one place to write to.
 *
 * Sonnet rather than Opus by explicit choice: this workload is short,
 * heavily tool-mediated answers over a small book, where the cost per
 * conversation matters more than the last increment of reasoning. Revisit
 * if the assistant starts doing multi-step analysis across households. */
export const MODEL_ID = "claude-sonnet-5";

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
