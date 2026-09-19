/** Citation refs.
 *
 * The assistant used to have no way to point at a record, only to describe
 * one — and describing is where attribution breaks. Asked what to raise
 * with a household, it wrote "flagged in the Sep 2 check-in note: they'd
 * asked for a goals discussion", merging the date of one activity row with
 * the label of another. Both records were real and both mentioned goals,
 * so nothing in the text was checkable: a reader had to already know the
 * timeline to notice.
 *
 * So every record a tool hands back now gets a short ref. The model cites
 * `[R4]` instead of paraphrasing a date, the dock renders it as a chip
 * carrying that record's own label and a link to it, and the route checks
 * that every ref in the answer was actually issued this turn. A merge like
 * the one above becomes visible — the chip says what the record really is
 * — and an invented ref is caught outright. */

export type Citation = { ref: string; label: string; link: string };

export type RefRegistry = {
  /** Registers a record and returns the ref token to put in its payload. */
  issue: (label: string, link: string) => string;
  all: () => Citation[];
  /** Refs the registry actually handed out, for validating an answer. */
  issued: () => Set<string>;
};

export function createRefRegistry(): RefRegistry {
  const citations: Citation[] = [];
  return {
    issue(label, link) {
      const ref = `R${citations.length + 1}`;
      citations.push({ ref, label, link });
      return ref;
    },
    all: () => [...citations],
    issued: () => new Set(citations.map((c) => c.ref)),
  };
}

/** Matches the citation tokens in an assistant reply. */
export const REF_PATTERN = /\[(R\d+)\]/g;

export function refsUsedIn(text: string): string[] {
  return Array.from(text.matchAll(REF_PATTERN), (m) => m[1]!);
}
