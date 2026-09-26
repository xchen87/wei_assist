"use client";

import { useState, useTransition } from "react";
import { usePathname } from "next/navigation";
import { setTaskStatus } from "@/app/(app)/tasks/actions";
import { Badge } from "@/components/ui/badge";

export type TaskRowData = {
  id: string;
  title: string;
  detail: string | null;
  priority: string;
  status: string;
  source: string;
  due: { text: string; tone: "loss" | "brass" | "neutral" };
};

const SOURCE_LABEL: Record<string, string> = {
  assistant: "Proposed by the assistant",
  alert: "From a signal",
  insight: "From an insight",
  intake: "From intake",
};

/** One task. The circle marks it done through a server action, so it
 * persists and shows up on the household's timeline; a done task can be
 * reopened from the Done view the same way. */
export function TaskRow({ task }: { task: TaskRowData }) {
  const [gone, setGone] = useState(false);
  const [isPending, startTransition] = useTransition();
  const pathname = usePathname();
  if (gone) return null;

  const done = task.status === "done";
  function toggle() {
    startTransition(async () => {
      await setTaskStatus(task.id, done ? "open" : "done", pathname ?? undefined);
      setGone(true);
    });
  }

  const sourceLabel = SOURCE_LABEL[task.source];

  return (
    <div className="flex items-start gap-3 border-b border-rule py-2.5 last:border-b-0">
      <button
        type="button"
        onClick={toggle}
        disabled={isPending}
        aria-label={done ? "Reopen task" : "Mark task done"}
        title={done ? "Reopen" : "Mark done"}
        className={`mt-0.5 flex h-4 w-4 shrink-0 items-center justify-center rounded-full border transition-colors disabled:opacity-50 ${
          done ? "border-pine bg-pine text-on-accent" : "border-rule hover:border-pine"
        }`}
      >
        {done && (
          <svg width={10} height={10} viewBox="0 0 10 10" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round">
            <path d="M2 5.2l2 2 4-4.4" />
          </svg>
        )}
      </button>
      <div className="min-w-0 flex-1">
        <div className={`text-sm ${done ? "text-ink-muted line-through" : ""}`}>{task.title}</div>
        {task.detail && <div className="mt-0.5 text-xs text-ink-muted">{task.detail}</div>}
        {sourceLabel && <div className="mt-0.5 text-xs text-ink-muted">{sourceLabel}</div>}
      </div>
      <div className="flex shrink-0 items-center gap-2">
        {task.priority === "high" && !done && <Badge tone="brass">High</Badge>}
        {!done && <Badge tone={task.due.tone}>{task.due.text}</Badge>}
      </div>
    </div>
  );
}
