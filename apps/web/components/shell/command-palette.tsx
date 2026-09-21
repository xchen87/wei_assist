"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { formatMoney } from "@/lib/format/money";

export type PaletteHousehold = { id: string; name: string; segment: string; aumCents: number };

type Command = { id: string; label: string; hint: string; href: string };

/** ⌘K (Phase 1). Two kinds of destination: the twelve top-level surfaces,
 * and every household by name — which is what an advisor is usually
 * reaching for, and today costs a trip through Clients and a search box.
 *
 * Hand-rolled rather than reaching for Radix: this needs an overlay, a
 * text input, and arrow keys, and D-014's rule is to add Radix when a
 * feature genuinely needs a Dialog/Popover primitive. If a second modal
 * ever appears, that's the moment to reconsider — not this one. */
const ROUTES: Command[] = [
  { id: "today", label: "Today", hint: "Go to", href: "/today" },
  { id: "schedule", label: "Schedule", hint: "Go to", href: "/schedule" },
  { id: "tasks", label: "Tasks", hint: "Go to", href: "/tasks" },
  { id: "clients", label: "Clients", hint: "Go to", href: "/clients" },
  { id: "prospects", label: "Prospects", hint: "Go to", href: "/prospects" },
  { id: "intake", label: "Intake", hint: "Go to", href: "/intake" },
  { id: "markets", label: "Markets", hint: "Go to", href: "/markets" },
  { id: "insights", label: "Insights", hint: "Go to", href: "/insights" },
  { id: "documents", label: "Documents", hint: "Go to", href: "/documents" },
  { id: "reports", label: "Reports", hint: "Go to", href: "/reports" },
  { id: "compliance", label: "Compliance", hint: "Go to", href: "/compliance" },
  { id: "settings", label: "Settings", hint: "Go to", href: "/settings" },
  { id: "needs-review", label: "Needs review", hint: "Saved view", href: "/clients?view=needs-review" },
  { id: "at-risk", label: "At risk", hint: "Saved view", href: "/clients?view=at-risk" },
];

/** Anything can open the palette by dispatching this — the nav's search row
 * does, since a shortcut nobody can see is a shortcut nobody uses. A custom
 * event rather than a shared store: one boolean crossing one component
 * boundary doesn't earn a store. */
export const OPEN_PALETTE_EVENT = "meridian:open-command-palette";

export function CommandPalette({ households }: { households: PaletteHousehold[] }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [active, setActive] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);

  const commands = useMemo<Command[]>(
    () => [
      ...ROUTES,
      ...households.map((h) => ({
        id: h.id,
        label: h.name,
        hint: `${h.segment} · ${formatMoney(h.aumCents, { compact: true })}`,
        href: `/clients/${h.id}`,
      })),
    ],
    [households],
  );

  const results = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return commands.slice(0, 8);
    // Rank names that start with the query above ones that merely contain
    // it, so typing "ram" puts Ramirez first rather than alphabetically.
    return commands
      .filter((c) => c.label.toLowerCase().includes(q))
      .sort((a, b) => {
        const aStarts = a.label.toLowerCase().startsWith(q) ? 0 : 1;
        const bStarts = b.label.toLowerCase().startsWith(q) ? 0 : 1;
        return aStarts - bStarts || a.label.localeCompare(b.label);
      })
      .slice(0, 8);
  }, [commands, query]);

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setOpen((v) => !v);
        setQuery("");
        setActive(0);
      }
      if (e.key === "Escape") setOpen(false);
    }
    function onOpen() {
      setOpen(true);
      setQuery("");
      setActive(0);
    }
    window.addEventListener("keydown", onKey);
    window.addEventListener(OPEN_PALETTE_EVENT, onOpen);
    return () => {
      window.removeEventListener("keydown", onKey);
      window.removeEventListener(OPEN_PALETTE_EVENT, onOpen);
    };
  }, []);

  useEffect(() => {
    if (open) inputRef.current?.focus();
  }, [open]);

  if (!open) return null;

  function go(command: Command | undefined) {
    if (!command) return;
    setOpen(false);
    router.push(command.href);
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-start justify-center bg-ink/20 pt-[12vh]"
      onClick={() => setOpen(false)}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-label="Command palette"
        onClick={(e) => e.stopPropagation()}
        className="w-[520px] max-w-[90vw] overflow-hidden rounded-card border border-rule bg-surface shadow-sm"
      >
        <input
          ref={inputRef}
          value={query}
          onChange={(e) => {
            setQuery(e.target.value);
            setActive(0);
          }}
          onKeyDown={(e) => {
            if (e.key === "ArrowDown") {
              e.preventDefault();
              setActive((i) => Math.min(i + 1, results.length - 1));
            } else if (e.key === "ArrowUp") {
              e.preventDefault();
              setActive((i) => Math.max(i - 1, 0));
            } else if (e.key === "Enter") {
              e.preventDefault();
              go(results[active]);
            }
          }}
          placeholder="Jump to a household or a page…"
          className="w-full border-b border-rule bg-transparent px-4 py-3 text-sm outline-none placeholder:text-ink-muted"
        />

        {results.length === 0 ? (
          <div className="px-4 py-3 text-sm text-ink-muted">Nothing matches &ldquo;{query}&rdquo;.</div>
        ) : (
          <ul className="max-h-[320px] overflow-y-auto py-1">
            {results.map((command, i) => (
              <li key={command.id}>
                <button
                  onMouseEnter={() => setActive(i)}
                  onClick={() => go(command)}
                  className={`flex w-full items-baseline justify-between gap-3 px-4 py-2 text-left ${
                    i === active ? "bg-pine-tint" : ""
                  }`}
                >
                  <span className={`truncate text-sm ${i === active ? "font-semibold text-pine" : ""}`}>
                    {command.label}
                  </span>
                  <span className="shrink-0 text-xs text-ink-muted">{command.hint}</span>
                </button>
              </li>
            ))}
          </ul>
        )}

        <div className="border-t border-rule px-4 py-2 text-xs text-ink-muted">
          ↑↓ to move · ↵ to open · esc to close
        </div>
      </div>
    </div>
  );
}
