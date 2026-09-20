"use client";

import { useEffect } from "react";
import { ErrorState } from "@/components/ui/error-state";

/** Until now a thrown error anywhere in the workspace fell through to
 * Next's default error page, losing the nav, the chat dock, and any way
 * back. This keeps the failure inside the shell and offers the one action
 * that helps — CLAUDE.md §7: errors say what happened and what to do, and
 * they don't apologise. */
export default function WorkspaceError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    // No client PII in logs (§11) — the digest identifies the server-side
    // error without carrying anything from the record that failed.
    console.error("Workspace route failed", error.digest ?? "(no digest)");
  }, [error]);

  return (
    <div className="px-8 py-7">
      <h1 className="mb-4 text-lg font-semibold">Something didn&rsquo;t load</h1>
      <ErrorState title="This page couldn't be loaded. Nothing was changed." onRetry={reset} />
      <p className="mt-3 text-xs text-ink-muted">
        If it keeps happening, the server log has the detail
        {error.digest ? ` under digest ${error.digest}` : ""}. Other pages are unaffected.
      </p>
    </div>
  );
}
