"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { bookProposedMeeting } from "@/app/(app)/schedule/actions";
import { addProposedTask } from "@/app/(app)/tasks/actions";
import { LOCATIONS, PRIORITIES, type MeetingProposal, type TaskProposal } from "@/lib/ai/proposals";
import { useChatContext } from "@/lib/chat-store";
import { formatDate, formatTime } from "@/lib/format/date";

/** The two scheduling cards (M-assist item 4). Editable before confirming:
 * the assistant's proposal is a starting point, and an advisor who has to
 * decline and re-ask to move a meeting by half an hour will stop asking.
 * Confirming calls the server action, which validates again and writes
 * the row; declining writes nothing anywhere. */

const FIELD = "w-full rounded-control border border-rule bg-surface px-2 py-1 text-xs text-ink";
const LABEL = "mb-0.5 block text-[11px] font-semibold text-ink-muted";

/** datetime-local works in the browser's local zone; the app's times are
 * UTC-as-local (D-034). Convert on the way in and out so what the advisor
 * sees is what gets stored. */
function toLocalInput(iso: string): string {
  return iso.slice(0, 16);
}
function fromLocalInput(value: string): string {
  return `${value}:00.000Z`;
}

export function MeetingProposalCard({
  proposal,
  onResolved,
}: {
  proposal: MeetingProposal;
  onResolved: (state: "confirmed" | "declined") => void;
}) {
  const router = useRouter();
  const conversationId = useChatContext((s) => s.conversationId);
  const [isPending, startTransition] = useTransition();
  const [startsAt, setStartsAt] = useState(toLocalInput(proposal.startsAt));
  const initialDuration = Math.round((new Date(proposal.endsAt).getTime() - new Date(proposal.startsAt).getTime()) / 60_000);
  const [durationMin, setDurationMin] = useState(initialDuration);
  const [location, setLocation] = useState<string>(proposal.location ?? "");
  const [note, setNote] = useState(proposal.note ?? "");
  const [error, setError] = useState<string | null>(null);

  return (
    <div className="mt-2 rounded-card border border-brass bg-brass-tint p-3">
      <div className="mb-0.5 text-xs font-semibold">Book this meeting?</div>
      <div className="mb-2 text-xs text-ink">{proposal.title}</div>
      <div className="mb-2.5 text-xs leading-relaxed text-ink-muted">{proposal.reason}</div>

      <div className="mb-2 grid grid-cols-2 gap-2">
        <label className="col-span-2">
          <span className={LABEL}>When</span>
          <input type="datetime-local" value={startsAt} onChange={(e) => setStartsAt(e.target.value)} className={FIELD} step={900} />
        </label>
        <label>
          <span className={LABEL}>Length</span>
          <select value={durationMin} onChange={(e) => setDurationMin(Number(e.target.value))} className={FIELD}>
            {[30, 45, 60, 90].includes(durationMin) ? null : <option value={durationMin}>{durationMin} min</option>}
            {[30, 45, 60, 90].map((m) => (
              <option key={m} value={m}>
                {m} min
              </option>
            ))}
          </select>
        </label>
        <label>
          <span className={LABEL}>Where</span>
          <select value={location} onChange={(e) => setLocation(e.target.value)} className={FIELD}>
            <option value="">Not set</option>
            {LOCATIONS.map((l) => (
              <option key={l} value={l}>
                {l}
              </option>
            ))}
          </select>
        </label>
        {(proposal.note !== null || note) && (
          <label className="col-span-2">
            <span className={LABEL}>Draft note to the household — filed, not sent</span>
            <textarea value={note} onChange={(e) => setNote(e.target.value)} rows={4} className={`${FIELD} leading-relaxed`} />
          </label>
        )}
      </div>

      {error && <div className="mb-2 text-xs text-loss">{error}</div>}

      <div className="flex items-center gap-2">
        <button
          disabled={isPending}
          onClick={() => onResolved("declined")}
          className="rounded-control border border-rule bg-surface px-2.5 py-1 text-xs disabled:opacity-50"
        >
          Not now
        </button>
        <button
          disabled={isPending || !startsAt}
          onClick={() =>
            startTransition(async () => {
              setError(null);
              const result = await bookProposedMeeting(
                proposal,
                { startsAt: fromLocalInput(startsAt), durationMin, location: location || null, note: note.trim() || null },
                conversationId,
              );
              if (!result.ok) {
                setError(result.error);
                return;
              }
              onResolved("confirmed");
              router.refresh();
            })
          }
          className="rounded-control bg-pine px-2.5 py-1 text-xs font-semibold text-on-accent disabled:opacity-50"
        >
          Book it
        </button>
        <span className="ml-auto text-[11px] text-ink-muted">
          {startsAt ? `${formatDate(fromLocalInput(startsAt))} ${formatTime(fromLocalInput(startsAt))}` : ""}
        </span>
      </div>
    </div>
  );
}

export function TaskProposalCard({
  proposal,
  onResolved,
}: {
  proposal: TaskProposal;
  onResolved: (state: "confirmed" | "declined") => void;
}) {
  const router = useRouter();
  const conversationId = useChatContext((s) => s.conversationId);
  const [isPending, startTransition] = useTransition();
  const [title, setTitle] = useState(proposal.title);
  const [dueAt, setDueAt] = useState(proposal.dueAt ?? "");
  const [priority, setPriority] = useState<string>(proposal.priority);
  const [error, setError] = useState<string | null>(null);

  return (
    <div className="mt-2 rounded-card border border-brass bg-brass-tint p-3">
      <div className="mb-0.5 text-xs font-semibold">Add this task?</div>
      {proposal.subject && <div className="mb-1 text-xs text-ink">{proposal.subject.name}</div>}
      <div className="mb-2.5 text-xs leading-relaxed text-ink-muted">{proposal.reason}</div>

      <div className="mb-2 grid grid-cols-2 gap-2">
        <label className="col-span-2">
          <span className={LABEL}>Task</span>
          <input type="text" value={title} onChange={(e) => setTitle(e.target.value)} className={FIELD} maxLength={140} />
        </label>
        {proposal.detail && <div className="col-span-2 text-xs text-ink-muted">{proposal.detail}</div>}
        <label>
          <span className={LABEL}>Due</span>
          <input type="date" value={dueAt} onChange={(e) => setDueAt(e.target.value)} className={FIELD} />
        </label>
        <label>
          <span className={LABEL}>Priority</span>
          <select value={priority} onChange={(e) => setPriority(e.target.value)} className={FIELD}>
            {PRIORITIES.map((p) => (
              <option key={p} value={p}>
                {p[0]!.toUpperCase() + p.slice(1)}
              </option>
            ))}
          </select>
        </label>
      </div>

      {error && <div className="mb-2 text-xs text-loss">{error}</div>}

      <div className="flex gap-2">
        <button
          disabled={isPending}
          onClick={() => onResolved("declined")}
          className="rounded-control border border-rule bg-surface px-2.5 py-1 text-xs disabled:opacity-50"
        >
          Not now
        </button>
        <button
          disabled={isPending || !title.trim()}
          onClick={() =>
            startTransition(async () => {
              setError(null);
              const result = await addProposedTask(proposal, { title: title.trim(), dueAt: dueAt || null, priority }, conversationId);
              if (!result.ok) {
                setError(result.error);
                return;
              }
              onResolved("confirmed");
              router.refresh();
            })
          }
          className="rounded-control bg-pine px-2.5 py-1 text-xs font-semibold text-on-accent disabled:opacity-50"
        >
          Add task
        </button>
      </div>
    </div>
  );
}
