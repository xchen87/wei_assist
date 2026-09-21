import { describe, expect, it } from "vitest";
import { checkAssistantText } from "./guardrails";

const tools = (text: string, opts: Partial<Parameters<typeof checkAssistantText>[1]> = {}) =>
  checkAssistantText(text, {
    readToolsCalled: 1,
    refsIssued: new Set(["R1"]),
    refsUsed: ["R1"],
    ...opts,
  });

const rules = (text: string, opts: Parameters<typeof checkAssistantText>[1]) =>
  checkAssistantText(text, opts).map((f) => f.rule);

describe("checkAssistantText — citations", () => {
  it("passes a grounded, cited answer", () => {
    expect(tools("Cash is 9.2% against a 3.7% target [R1].")).toEqual([]);
  });

  it("flags a citation no tool issued", () => {
    expect(rules("Cash is 9.2% [R9].", { readToolsCalled: 1, refsIssued: new Set(["R1"]), refsUsed: ["R9"] })).toContain(
      "unknown_citation",
    );
  });

  it("flags figures quoted from records with nothing cited", () => {
    expect(rules("Cash is 9.2% against target.", { readToolsCalled: 1, refsIssued: new Set(["R1"]), refsUsed: [] })).toContain(
      "uncited_answer",
    );
  });

  it("flags a figure in an answer where no tool ran", () => {
    expect(rules("Households like this usually hold about 6% in cash.", { readToolsCalled: 0, refsIssued: new Set(), refsUsed: [] })).toContain(
      "ungrounded_figure",
    );
  });
});

/** The plan review hands the model every figure it may use before asking
 * it anything, so there are no records to cite. Running the citation
 * rules over it flags a correct answer either way — as ungrounded with a
 * tool count of zero, as uncited with one — and a warning that cries wolf
 * is worse than none. */
describe("checkAssistantText — supplied grounding", () => {
  const review =
    "## Key differences\n- Success rises to 92% from 78%, worth $18.63M at plan end.\n- The whole +14 pts is the plan's doing.";

  it("does not ask a supplied answer to cite records it never fetched", () => {
    expect(
      checkAssistantText(review, {
        readToolsCalled: 0,
        refsIssued: new Set(),
        refsUsed: [],
        grounding: "supplied",
      }),
    ).toEqual([]);
  });

  it("flags the same text under tool grounding, which is the default", () => {
    expect(rules(review, { readToolsCalled: 0, refsIssued: new Set(), refsUsed: [] })).toContain(
      "ungrounded_figure",
    );
  });

  it("still catches an invented citation", () => {
    expect(
      rules(`${review} [R3]`, {
        readToolsCalled: 0,
        refsIssued: new Set(),
        refsUsed: ["R3"],
        grounding: "supplied",
      }),
    ).toContain("unknown_citation");
  });

  it("still catches a security recommendation and a settled tax claim", () => {
    expect(
      rules("They should sell NPKE before year end.", {
        readToolsCalled: 0,
        refsIssued: new Set(),
        refsUsed: [],
        grounding: "supplied",
      }),
    ).toContain("security_recommendation");
  });
});
