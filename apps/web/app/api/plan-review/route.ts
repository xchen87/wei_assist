import Anthropic from "@anthropic-ai/sdk";
import { prisma } from "@meridian/db";
import { getClient, isConfigured, MODEL_ID } from "@/lib/ai/model";
import { checkAssistantText } from "@/lib/ai/guardrails";
import {
  PLAN_CHAT_SYSTEM,
  PLAN_REVIEW_SYSTEM,
  buildComparisonBlock,
} from "@/lib/ai/plan-review";
import { applyScenario, buildBaseline, seedFor } from "@/lib/planning/baseline";
import { comparePlans } from "@/lib/planning/compare";
import { readMarketSnapshot } from "@/lib/planning/market";
import {
  LEVERS,
  formatLeverValue,
  resolveLever,
  type LeverSpec,
  type ProposedLever,
} from "@/lib/planning/adjustments";
import { CURRENT_ADVISOR_NAME } from "@/lib/current-advisor";
import type { HouseholdBaseline } from "@/lib/planning/baseline";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * The plan review, streamed.
 *
 * Same wire format as the chat dock, and deliberately a different shape
 * underneath: the comparison is computed here, from `lib/calc`, before
 * the model is asked anything. It is not a tool the model may or may not
 * call — a review of a plan cannot be allowed to proceed on figures the
 * model derived for itself.
 *
 * The same endpoint serves the first review and every follow-up. The
 * comparison block is rebuilt from the database each turn rather than
 * replayed from the client, so a question asked after the advisor edits
 * the scenario is answered about the scenario as it is now.
 */

type ClientMessage = { role: "user" | "assistant"; text: string };

/** A change the assistant wants to suggest. It reaches the advisor as a
 * card with an Apply button; nothing here writes to the plan (§9 rule 3).
 *
 * The levers are resolved against the plan's own catalogue before the
 * card is sent, so what the advisor sees is something that can actually
 * be applied. A proposal naming a lever that does not exist, or a person
 * who is not in this household, is returned to the model as an error
 * rather than shown as a card that would do nothing. */
export type Adjustment = {
  summary: string;
  rationale: string;
  levers: { key: string; memberName: string | null; label: string; from: string; to: string; value: number }[];
};

type StreamEvent =
  | { type: "text"; delta: string }
  | { type: "adjustment"; id: string; adjustment: Adjustment }
  | { type: "guardrail"; flags: { rule: string; explanation: string; excerpt: string }[] }
  | { type: "error"; message: string }
  | { type: "done" };

const PROPOSE_ADJUSTMENT: Anthropic.Tool = {
  name: "propose_adjustment",
  description:
    "Suggest a further change to the plan. Puts a card in front of the advisor with an Apply button. Use it when you can name a specific change worth testing — not for general observations. You never change the plan yourself.",
  input_schema: {
    type: "object",
    properties: {
      summary: { type: "string", description: "The change in one short line, e.g. \"Karen retires at 64 instead of 62\"." },
      rationale: { type: "string", description: "One or two sentences on why it is worth testing, grounded in the comparison block." },
      levers: {
        type: "array",
        description: "The specific levers to move. Only the keys listed are accepted.",
        items: {
          type: "object",
          properties: {
            key: { type: "string", enum: LEVERS.map((l) => l.key), description: "Which lever." },
            memberName: {
              type: "string",
              description:
                "The person, for a per-member lever (retirementAge, planToAge, ssClaimAge, ssMonthlyBenefitCents, annualSavingsCents, savingsGrowthPct, partTimeIncomeCents, partTimeThroughAge, pensionMonthlyCents, pensionStartAge). Their first name is enough. Omit for household levers.",
            },
            value: {
              type: "number",
              description:
                "The proposed value, in the unit an advisor would say out loud: an age as an age, a percent as a percent, money in whole dollars (not cents), a span in years.",
            },
          },
          required: ["key", "value"],
        },
      },
    },
    required: ["summary", "rationale", "levers"],
  },
};

/** One model call for the report, plus a short loop so a proposal can be
 * followed by the sentence explaining it. Every iteration is real spend. */
const MAX_TURNS = 4;

export async function POST(req: Request) {
  const body = (await req.json()) as {
    householdId?: string;
    scenarioId?: string;
    messages?: ClientMessage[];
  };

  if (!body.householdId || !body.scenarioId) return jsonError("No scenario to review.");
  if (!isConfigured()) {
    return jsonError(
      "The assistant isn't connected to a model: ANTHROPIC_API_KEY isn't set in this environment. The comparison above is computed locally and is unaffected — see Settings → AI.",
    );
  }

  const encoder = new TextEncoder();
  const stream = new ReadableStream<Uint8Array>({
    async start(controller) {
      const send = (event: StreamEvent) =>
        controller.enqueue(encoder.encode(JSON.stringify(event) + "\n"));
      try {
        await runReview(body, send);
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

async function runReview(
  body: { householdId?: string; scenarioId?: string; messages?: ClientMessage[] },
  send: (event: StreamEvent) => void,
) {
  const household = await prisma.household.findUnique({
    where: { id: body.householdId! },
    include: {
      members: true,
      goals: true,
      scenarios: { where: { id: body.scenarioId! }, include: { members: true, goals: true } },
    },
  });
  const scenarioRow = household?.scenarios[0];
  if (!household || !scenarioRow) {
    send({ type: "error", message: "That scenario is no longer on file." });
    return;
  }

  const baseline = buildBaseline(household);
  const scenario = applyScenario(baseline, scenarioRow);
  const seed = seedFor(household.id);
  const comparison = comparePlans(baseline, scenario, seed);
  const market = await readMarketSnapshot();

  const block = buildComparisonBlock({
    householdName: household.name,
    scenarioName: scenarioRow.name,
    baseline,
    comparison,
    market,
  });

  const history = (Array.isArray(body.messages) ? body.messages : []).filter((m) => m.text?.trim());
  const isFollowUp = history.length > 0;

  // One conversation row per review thread, like the dock (§9 rule 5).
  const conversation = await prisma.aiConversation.create({
    data: {
      advisorName: CURRENT_ADVISOR_NAME,
      contextPath: `/clients/${household.id}/planning/compare?scenario=${scenarioRow.id}`,
      contextLabel: `${household.name} · ${scenarioRow.name}`,
    },
  });

  const messages: Anthropic.MessageParam[] = [
    // The comparison arrives as an operator message, not as something the
    // advisor said: it is computed context, and a household's figures
    // must not read as user input.
    { role: "user", content: "Review this plan change." },
    { role: "system", content: `COMPARISON BLOCK\n\n${block}` },
  ];
  if (isFollowUp) {
    messages.length = 0;
    messages.push({ role: "user", content: "Review this plan change." });
    messages.push({ role: "system", content: `COMPARISON BLOCK\n\n${block}` });
    for (const message of history) messages.push({ role: message.role, content: message.text });
  }

  const latestUserText = isFollowUp ? history.filter((m) => m.role === "user").at(-1)?.text : "Review this plan change.";
  await prisma.aiMessage.create({
    data: { conversationId: conversation.id, role: "user", text: latestUserText ?? "" },
  });

  const client = getClient();
  let answer = "";

  for (let turn = 0; turn < MAX_TURNS; turn++) {
    const stream = client.messages.stream({
      model: MODEL_ID,
      max_tokens: 4000,
      system: [
        {
          type: "text",
          text: isFollowUp ? PLAN_CHAT_SYSTEM : PLAN_REVIEW_SYSTEM,
          cache_control: { type: "ephemeral" },
        },
      ],
      tools: [PROPOSE_ADJUSTMENT],
      messages,
    });

    // Text before a tool call and text after are separate blocks in
    // separate turns; without a break they arrive as one run-on line.
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
    if (response.stop_reason !== "tool_use") break;

    const results: Anthropic.ToolResultBlockParam[] = [];
    for (const block of response.content) {
      if (block.type !== "tool_use") continue;
      if (block.name === "propose_adjustment") {
        const raw = block.input as {
          summary?: string;
          rationale?: string;
          levers?: ProposedLever[];
        };
        const resolved: Adjustment["levers"] = [];
        const refusals: string[] = [];

        for (const proposed of raw.levers ?? []) {
          const outcome = resolveLever(proposed, household.members);
          if (!outcome.ok) {
            refusals.push(outcome.reason);
            continue;
          }
          const { spec, memberId, memberName, storedValue, display } = outcome.lever;
          const current = currentLeverValue(scenario, spec, memberId);
          resolved.push({
            key: spec.key,
            memberName,
            label: memberName ? `${memberName.split(" ")[0]} ${spec.label}` : spec.label,
            from: current === null ? "not set" : formatLeverValue(spec, spec.unit === "dollars" ? current / 100 : current),
            to: display,
            value: storedValue,
          });
        }

        if (resolved.length === 0) {
          results.push({
            type: "tool_result",
            tool_use_id: block.id,
            is_error: true,
            content:
              refusals.join(" ") ||
              "No lever in that proposal could be applied to this plan. Name one from the list, and a person for a per-member lever.",
          });
          continue;
        }

        const adjustment: Adjustment = {
          summary: raw.summary ?? "Suggested change",
          rationale: raw.rationale ?? "",
          levers: resolved,
        };
        send({ type: "adjustment", id: block.id, adjustment });
        await prisma.aiToolCall.create({
          data: {
            conversationId: conversation.id,
            toolName: block.name,
            inputJson: JSON.stringify(block.input ?? {}),
            recordIds: scenarioRow.id,
            ok: true,
            durationMs: 0,
          },
        });
        results.push({
          type: "tool_result",
          tool_use_id: block.id,
          content:
            "Shown to the advisor as a card with an Apply button. Not applied." +
            (refusals.length > 0 ? ` These parts were dropped: ${refusals.join(" ")}` : ""),
        });
      } else {
        results.push({
          type: "tool_result",
          tool_use_id: block.id,
          is_error: true,
          content: "No such tool here.",
        });
      }
    }
    messages.push({ role: "user", content: results });
  }

  await prisma.aiMessage.create({
    data: { conversationId: conversation.id, role: "assistant", text: answer },
  });

  // The prompt is the control; this is the smoke alarm (§9 rule 4). The
  // review is grounded in the comparison block rather than in tool
  // results, so the citation rules don't apply: there are no records to
  // cite, and the figures are grounded by construction. Everything else —
  // security recommendations, tax and legal claims stated as settled —
  // applies here exactly as it does in the dock.
  const flags = checkAssistantText(answer, {
    readToolsCalled: 0,
    refsIssued: new Set<string>(),
    refsUsed: [],
    grounding: "supplied",
  });
  if (flags.length > 0) send({ type: "guardrail", flags });
}

/** What the lever reads today, so the card can say "62 → 64" rather than
 * just naming a destination. */
function currentLeverValue(
  plan: HouseholdBaseline,
  spec: LeverSpec,
  memberId: string | null,
): number | null {
  if (spec.scope === "member") {
    const member = plan.members.find((m) => m.id === memberId);
    if (!member) return null;
    const value = (member as unknown as Record<string, unknown>)[spec.key];
    return typeof value === "number" ? value : null;
  }
  // The scenario record and the projection input disagree on one name:
  // the column is retirementSpendingCents, the field is annual spending.
  const key = spec.key === "retirementSpendingCents" ? "annualRetirementSpendingCents" : spec.key;
  const value = (plan as unknown as Record<string, unknown>)[key];
  return typeof value === "number" ? value : null;
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
