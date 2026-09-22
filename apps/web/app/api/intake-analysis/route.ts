import Anthropic from "@anthropic-ai/sdk";
import { getClient, isConfigured, MODEL_ID } from "@/lib/ai/model";
import { checkAssistantText } from "@/lib/ai/guardrails";
import { INTAKE_ANALYSIS_SYSTEM, buildIntakeBlock, type IntakeAnalysisInput } from "@/lib/ai/intake-analysis";
import { readMarketSnapshot } from "@/lib/planning/market";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * The opening analysis, streamed.
 *
 * Two things make this different from the other AI surfaces. The
 * household does not exist yet, so there is nothing to fetch and the
 * whole picture arrives in the request — which is also why nothing here
 * writes to the database. And the model is allowed to stop and ask: if it
 * calls ask_clarifying_questions, the turn ends there, the questions go
 * to the advisor, and the next request carries their answers. A first
 * plan built on an unstated assumption is worse than one delayed by a
 * question.
 */

type StreamEvent =
  | { type: "text"; delta: string }
  | { type: "questions"; items: { question: string; why: string }[] }
  | { type: "guardrail"; flags: { rule: string; explanation: string; excerpt: string }[] }
  | { type: "error"; message: string }
  | { type: "done" };

const ASK_CLARIFYING: Anthropic.Tool = {
  name: "ask_clarifying_questions",
  description:
    "Put questions back to the advisor before writing the analysis. Use this when a conclusion would otherwise rest on something intake did not collect. Ask only what would change your advice, and never for something already in the intake block.",
  input_schema: {
    type: "object",
    properties: {
      questions: {
        type: "array",
        description: "Three or four at most.",
        items: {
          type: "object",
          properties: {
            question: { type: "string", description: "The question, in one line." },
            why: { type: "string", description: "One sentence on what the answer would change." },
          },
          required: ["question", "why"],
        },
      },
    },
    required: ["questions"],
  },
};

export async function POST(req: Request) {
  const body = (await req.json()) as {
    intake?: Omit<IntakeAnalysisInput, "market">;
  };

  if (!body.intake) return jsonError("Nothing to analyse.");
  if (!isConfigured()) {
    return jsonError(
      "The assistant isn't connected to a model: ANTHROPIC_API_KEY isn't set in this environment. You can still create the household without an analysis — see Settings → AI.",
    );
  }

  const encoder = new TextEncoder();
  const stream = new ReadableStream<Uint8Array>({
    async start(controller) {
      const send = (event: StreamEvent) =>
        controller.enqueue(encoder.encode(JSON.stringify(event) + "\n"));
      try {
        await run(body.intake!, send);
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

async function run(
  intake: Omit<IntakeAnalysisInput, "market">,
  send: (event: StreamEvent) => void,
) {
  const market = await readMarketSnapshot();
  const block = buildIntakeBlock({ ...intake, market });

  // One round of questions, and one only. Left to itself the model will
  // ask again after the answers — there is always another thing an intake
  // form didn't collect — and an advisor who answers four questions to be
  // handed four more has been given a worse tool than a blank page. Once
  // it has been answered, the tool is withdrawn and it writes with what
  // it has, saying what is still unknown under its own limits heading.
  const alreadyAsked = intake.clarifications.length > 0;

  const client = getClient();
  const messages: Anthropic.MessageParam[] = [
    { role: "user", content: "Analyse this household and draft an opening plan." },
    // The intake arrives as an operator message rather than as something
    // the advisor typed: it is assembled context, and a client's figures
    // must not read as user input.
    { role: "system", content: `INTAKE BLOCK\n\n${block}` },
  ];

  const stream = client.messages.stream({
    model: MODEL_ID,
    max_tokens: 4000,
    system: [{ type: "text", text: INTAKE_ANALYSIS_SYSTEM, cache_control: { type: "ephemeral" } }],
    tools: alreadyAsked ? [] : [ASK_CLARIFYING],
    messages,
  });

  let answer = "";
  for await (const event of stream) {
    if (event.type === "content_block_delta" && event.delta.type === "text_delta") {
      answer += event.delta.text;
      send({ type: "text", delta: event.delta.text });
    }
  }

  const response = await stream.finalMessage();

  // Questions end the turn. The advisor answers them and the next request
  // carries the answers in the block, so the model writes once — with the
  // answers in hand — rather than writing twice and contradicting itself.
  const asked = alreadyAsked
    ? undefined
    : response.content.find(
        (block): block is Anthropic.ToolUseBlock =>
          block.type === "tool_use" && block.name === "ask_clarifying_questions",
      );
  if (asked) {
    // A model's tool input is untrusted structure, not a typed object.
    // Taking it on trust cost a whole turn once: `questions` arrived as
    // something other than an array and `.filter` threw, which surfaced
    // to the advisor as "(g.input.questions ?? []).filter is not a
    // function" where a report should have been.
    const items = parseQuestions(asked.input);
    if (items.length > 0) {
      send({ type: "questions", items });
      return;
    }
  }

  // Nothing written and nothing asked: the turn went entirely into a tool
  // call that produced no usable questions. Say so plainly rather than
  // leaving an empty panel that looks like it is still thinking.
  if (!answer.trim()) {
    send({
      type: "error",
      message: "The assistant didn't return an analysis. Run it again — nothing was changed.",
    });
    return;
  }

  // Grounded in the supplied block, not in tool results, so the citation
  // rules don't apply (D-032's sibling case — see D-031).
  const flags = checkAssistantText(answer, {
    readToolsCalled: 0,
    refsIssued: new Set<string>(),
    refsUsed: [],
    grounding: "supplied",
  });
  if (flags.length > 0) send({ type: "guardrail", flags });
}

/** Pulls whatever usable questions are in a tool input, whatever shape it
 * arrived in. Anything that isn't a question with text is dropped. */
function parseQuestions(input: unknown): { question: string; why: string }[] {
  if (typeof input !== "object" || input === null) return [];
  const raw = (input as { questions?: unknown }).questions;
  if (!Array.isArray(raw)) return [];

  const items: { question: string; why: string }[] = [];
  for (const entry of raw) {
    if (typeof entry !== "object" || entry === null) continue;
    const { question, why } = entry as { question?: unknown; why?: unknown };
    if (typeof question !== "string" || !question.trim()) continue;
    items.push({ question: question.trim(), why: typeof why === "string" ? why.trim() : "" });
  }
  return items.slice(0, 5);
}

function jsonError(message: string) {
  return new Response(JSON.stringify({ type: "error", message }) + "\n", {
    status: 200,
    headers: { "Content-Type": "application/x-ndjson; charset=utf-8" },
  });
}

function describeError(error: unknown): string {
  if (error instanceof Anthropic.APIError) {
    return `The model call failed (${error.status ?? "no status"}). ${error.message}`;
  }
  return error instanceof Error ? error.message : "Something went wrong.";
}
