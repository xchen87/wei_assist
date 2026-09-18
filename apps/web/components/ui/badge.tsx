import type { ReactNode } from "react";

type Tone = "pine" | "brass" | "loss" | "neutral";

const TONE_CLASSES: Record<Tone, string> = {
  pine: "bg-pine-tint text-pine",
  brass: "bg-brass-tint text-brass",
  loss: "border border-loss text-loss bg-surface",
  neutral: "border border-rule text-ink-muted bg-surface",
};

export function Badge({ tone = "neutral", children }: { tone?: Tone; children: ReactNode }) {
  return (
    <span
      className={`inline-flex items-center rounded-control px-2 py-0.5 text-xs font-medium ${TONE_CLASSES[tone]}`}
    >
      {children}
    </span>
  );
}
