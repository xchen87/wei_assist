"use client";

import { useChatContext } from "@/lib/chat-store";

/** CLAUDE.md §6: an "Analyze" affordance sends the current filtered set to
 * chat as context, so the advisor can ask about the cohort in front of them
 * rather than the whole book. It hands over the household ids the table is
 * actually showing — not the URL — because a saved view like "At risk" is a
 * filter the assistant has no way to reproduce from query params alone. */
export function AnalyzeButton({
  label,
  path,
  householdIds,
}: {
  label: string;
  path: string;
  householdIds: string[];
}) {
  const setContext = useChatContext((s) => s.setContext);

  if (householdIds.length === 0) return null;

  return (
    <button
      onClick={() => {
        setContext(label, path, householdIds);
        useChatContext.setState({ collapsed: false });
      }}
      title="Ask the assistant about the households currently listed"
      className="rounded-control border border-rule px-3 py-1.5 text-sm text-ink hover:bg-paper"
    >
      Analyze
    </button>
  );
}
