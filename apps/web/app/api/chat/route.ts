import Anthropic from "@anthropic-ai/sdk";
import { prisma } from "@meridian/db";
import { getClient, isConfigured, MODEL_ID } from "@/lib/ai/model";
import { SYSTEM_PROMPT } from "@/lib/ai/system-prompt";
import { buildContextDescriptor } from "@/lib/ai/context";
import { checkAssistantText } from "@/lib/ai/guardrails";
import { findTool, TOOL_DEFINITIONS, type Proposal } from "@/lib/ai/tools";
import { CURRENT_ADVISOR_NAME } from "@/lib/current-advisor";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** The assistant's turn, streamed as newline-delimited JSON. Text deltas go
 * out as they arrive; tool calls are announced before they run and again
 * when they finish, so the advisor watches the assistant read the record
 * rather than waiting on a spinner and taking the answer on faith — which
 * is the whole point of CLAUDE.md §9's grounding rules being visible.
 *
 * The tool loop runs server-side: tools touch Prisma, and neither the
 * model nor the browser ever sees a query. Proposals are the exception —
 * they deliberately stop here and go to the UI for confirmation. */

type ClientMessage = { role: "user" | "assistant"; text: string };

type StreamEvent =
  | { type: "conversation"; id: string }
  | { type: "text"; delta: string }
  | { type: "tool"; id: string; name: string; status: "running" | "done" | "error"; summary?: string }
  | { type: "proposal"; id: string; proposal: Proposal }
  | { type: "guardrail"; flags: { rule: string; explanation: string; excerpt: string }[] }
  | { type: "error"; message: string }
  | { type: "done" };

/** Turns before the loop is cut off. Every iteration is a model call, so
 * this is a real spend ceiling, not just a safety net. */
const MAX_TURNS = 6;

export async function POST(req: Request) {
  const body = (await req.json()) as {
    messages?: ClientMessage[];
    contextPath?: string | null;
    conversationId?: string | null;
  };
  // Empty assistant turns (a stopped or failed stream) would be rejected by
  // the API as empty text blocks, and carry nothing worth replaying anyway.
  const history = (Array.isArray(body.messages) ? body.messages : []).filter((m) => m.text?.trim());
  const latest = history.filter((m) => m.role === "user").at(-1);

  if (!latest) return jsonError("No message to answer.");
  if (!isConfigured()) {
    return jsonError(
      "The assistant isn't connected to a model: ANTHROPIC_API_KEY isn't set in this environment. Everything else in Meridian runs without it — see Settings → AI.",
    );
  }

  const encoder = new TextEncoder();
  const stream = new ReadableStream<Uint8Array>({
    async start(controller) {
      const send = (event: StreamEvent) =>
        controller.enqueue(encoder.encode(JSON.stringify(event) + "\n"));

      try {
        await runTurn(body, history, latest, send);
      } catch (error) {
        send({ type: "error", message: describeError(error) });
      } finally {
        send({ type: "done" });
        controller.close();
      }
    },
  });

  return new Response(stream, {
    headers: { "Content-Type": "application/x-ndjson; charset=utf-8", "Cache-Control": "no-store" },
  });
}

async function runTurn(
  body: { contextPath?: string | null; conversationId?: string | null },
  history: ClientMessage[],
  latest: ClientMessage,
  send: (event: StreamEvent) => void,
) {
  // One append-only conversation row per thread (CLAUDE.md §9 rule 5).
  const contextDescriptor = await buildContextDescriptor(body.contextPath ?? null);
  let conversationId = body.conversationId ?? null;
  if (!conversationId) {
    const conversation = await prisma.aiConversation.create({
      data: {
        advisorName: CURRENT_ADVISOR_NAME,
        contextPath: body.contextPath ?? null,
        contextLabel: contextDescriptor ? contextDescriptor.split("\n")[1]?.slice(0, 120) ?? null : null,
      },
    });
    conversationId = conversation.id;
  }
  send({ type: "conversation", id: conversationId });
  await prisma.aiMessage.create({ data: { conversationId, role: "user", text: latest.text } });

  // Prior turns replay as plain text: the client keeps the transcript, not
  // the tool blocks, so the model re-reads through tools rather than
  // trusting a stale payload from three questions ago.
  const messages: Anthropic.MessageParam[] = history.map((m) => ({ role: m.role, content: m.text }));
  if (contextDescriptor) {
    // A mid-conversation system message rather than an edit to the top-level
    // system prompt: the route context changes as the advisor moves around
    // the app, and folding it into the system block would invalidate the
    // cached prefix on every navigation. It also keeps operator instructions
    // on the operator channel, where a household name in the chip can't read
    // as something the user typed.
    messages.push({ role: "system", content: contextDescriptor });
  }

  const client = getClient();
  let answer = "";
  let readToolsCalled = 0;

  for (let turn = 0; turn < MAX_TURNS; turn++) {
    const stream = client.messages.stream({
      model: MODEL_ID,
      max_tokens: 8000,
      system: [{ type: "text", text: SYSTEM_PROMPT, cache_control: { type: "ephemeral" } }],
      tools: TOOL_DEFINITIONS,
      messages,
    });

    // Text the model writes before a tool call and text it writes after are
    // separate blocks in separate turns. Without a break between them they
    // arrive as one run-on line ("Checking the record.Cash is 6.1%...").
    let pendingBreak = turn > 0 && answer.length > 0;

    for await (const event of stream) {
      if (event.type === "content_block_delta" && event.delta.type === "text_delta") {
        const delta = pendingBreak ? `\n\n${event.delta.text}` : event.delta.text;
        pendingBreak = false;
        answer += delta;
        send({ type: "text", delta });
      }
    }

    const response = await stream.finalMessage();
    messages.push({ role: "assistant", content: response.content });

    if (response.stop_reason !== "tool_use") {
      if (response.stop_reason === "refusal") {
        send({ type: "error", message: "The model declined to answer that." });
      }
      break;
    }

    const toolUses = response.content.filter(
      (block): block is Anthropic.ToolUseBlock => block.type === "tool_use",
    );
    const results: Anthropic.ToolResultBlockParam[] = [];

    // Parallel tool calls come back in one assistant message and their
    // results must go back in one user message — splitting them teaches
    // the model to stop calling tools in parallel.
    for (const use of toolUses) {
      const tool = findTool(use.name);
      send({ type: "tool", id: use.id, name: use.name, status: "running" });
      const startedAt = Date.now();

      if (!tool) {
        send({ type: "tool", id: use.id, name: use.name, status: "error", summary: "Unknown tool" });
        results.push({ type: "tool_result", tool_use_id: use.id, is_error: true, content: "No such tool." });
        continue;
      }

      try {
        const outcome = await tool.run((use.input ?? {}) as Record<string, unknown>);
        if (tool.effect === "read") readToolsCalled += 1;
        if (outcome.proposal) send({ type: "proposal", id: use.id, proposal: outcome.proposal });

        await prisma.aiToolCall.create({
          data: {
            conversationId,
            toolName: tool.name,
            inputJson: JSON.stringify(use.input ?? {}),
            recordIds: outcome.recordIds.join(","),
            ok: true,
            durationMs: Date.now() - startedAt,
          },
        });
        send({
          type: "tool",
          id: use.id,
          name: use.name,
          status: "done",
          summary: summarize(tool.effect, outcome.recordIds.length),
        });
        results.push({ type: "tool_result", tool_use_id: use.id, content: JSON.stringify(outcome.payload) });
      } catch (error) {
        const message = describeError(error);
        await prisma.aiToolCall.create({
          data: {
            conversationId,
            toolName: tool.name,
            inputJson: JSON.stringify(use.input ?? {}),
            recordIds: "",
            ok: false,
            errorMessage: message,
            durationMs: Date.now() - startedAt,
          },
        });
        send({ type: "tool", id: use.id, name: use.name, status: "error", summary: message });
        results.push({ type: "tool_result", tool_use_id: use.id, is_error: true, content: message });
      }
    }

    messages.push({ role: "user", content: results });
  }

  const flags = checkAssistantText(answer, { readToolsCalled });
  if (flags.length > 0) send({ type: "guardrail", flags });

  await prisma.aiMessage.create({
    data: {
      conversationId,
      role: "assistant",
      text: answer,
      guardrailFlags: flags.length > 0 ? flags.map((f) => f.rule).join(",") : null,
    },
  });
}

function summarize(effect: "read" | "proposal", recordCount: number): string {
  if (effect === "proposal") return "Waiting on your confirmation";
  if (recordCount === 0) return "No matching records";
  return `${recordCount} record${recordCount === 1 ? "" : "s"} read`;
}

function describeError(error: unknown): string {
  if (error instanceof Anthropic.AuthenticationError) return "The configured Anthropic API key was rejected.";
  if (error instanceof Anthropic.RateLimitError) return "Rate limited by the Anthropic API — try again shortly.";
  if (error instanceof Anthropic.BadRequestError) return `The API rejected the request: ${error.message}`;
  if (error instanceof Anthropic.APIError) return `Anthropic API error ${error.status}: ${error.message}`;
  if (error instanceof Error) return error.message;
  return "Something went wrong.";
}

function jsonError(message: string): Response {
  const body = JSON.stringify({ type: "error", message }) + "\n" + JSON.stringify({ type: "done" }) + "\n";
  return new Response(body, {
    headers: { "Content-Type": "application/x-ndjson; charset=utf-8", "Cache-Control": "no-store" },
  });
}
