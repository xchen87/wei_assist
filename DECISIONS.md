# DECISIONS.md

Decision record for Meridian. Append new entries; never rewrite an accepted one. To
reverse a decision, add a new entry and mark the old one `Superseded by D-0XX`.

**Template**

```
## D-0XX — Title
Date · Status: Proposed | Accepted | Superseded by D-0YY
**Context** — what forced a choice
**Decision** — what we chose
**Alternatives** — what we rejected and why
**Consequences** — what this costs us
```

---

## D-001 — Next.js App Router over a SPA + separate API

2026-09-17 · Accepted

**Context** — The app is data-dense and read-heavy. Household pages pull from many tables.
We need fast first paint on large tables and a clean streaming path for AI responses.

**Decision** — Next.js App Router. Server components render the data-heavy shells, client
components handle interaction. tRPC for internal calls, a thin REST surface under
`/api/v1` for future partner integrations.

**Alternatives** — Vite SPA + standalone Node API: more moving parts, worse first paint on
tables, and we would rebuild streaming and route-level data loading ourselves. Remix:
comparable, smaller ecosystem for the AI streaming patterns we need.

**Consequences** — Server/client boundary discipline required. Some libraries need
client-only wrappers. Hosting is opinionated.

---

## D-002 — The household is the primary record, not the individual

2026-09-17 · Accepted

**Context** — Every existing tool in this category gets this wrong in one direction or the
other. Advisors plan for households: joint accounts, shared goals, survivor scenarios,
dependents. But compliance and KYC attach to individuals.

**Decision** — `Household` is the root entity for all planning, list views, and AI context.
`Member` records hang off it and carry individual identity, KYC, and employment.
Relationships between members are explicit rows, which lets us model second marriages,
dependents, and trusts without hacks.

**Alternatives** — Individual-primary with household as a tag: forces constant grouping
logic and breaks joint-goal modeling. Household-only: cannot satisfy per-person KYC.

**Consequences** — Some queries need a member→household hop. Worth it. The UI must never
say "client" where it means household; see the copy rules in CLAUDE.md §7.

---

## D-003 — Identical section structure for every household plan

2026-09-17 · Accepted

**Context** — Advisors move between households all day. Variable page structure imposes a
re-orientation cost on every switch and hides gaps: if a section disappears when empty,
nobody notices the estate plan was never started.

**Decision** — All 14 sections exist for every household, in the same order, rendered
through one `PlanSection` scaffold. Empty sections show what is missing and offer to start.
Only Business is conditional, and only when no business entity exists.

**Alternatives** — Show only populated sections: cleaner-looking, actively harmful.
Per-firm configurable section sets: defer; it fragments the AI's mental model of a plan and
makes cross-household analytics unreliable.

**Consequences** — More empty states to design well. Completeness scoring becomes load
bearing, so the per-section manifest needs real thought rather than a field count.

---

## D-004 — AI touches data only through typed tools

2026-09-17 · Accepted

**Context** — The failure mode that kills this product is a confident wrong number in front
of a client. Advisors carry fiduciary duty; a hallucinated figure is a liability event, not
an annoyance.

**Decision** — No raw data in the prompt beyond a compact route descriptor. The model calls
typed tools; tools enforce org scoping and RBAC and write audit events. Every financial
claim carries a link to the record. Figures render through UI components from the tool
payload, not as model-written prose.

**Alternatives** — RAG over a document store of plan exports: cheaper to build, staler, and
citations point at a snapshot rather than the live record. Large context dumps: expensive,
leaks PII into prompts, and still produces unsourced prose.

**Consequences** — Slower to add a capability, since each one needs a tool. Latency from
multi-turn tool use. Accept both.

---

## D-005 — Actions with external effects are proposals, never commits

2026-09-17 · Accepted

**Context** — Sending, scheduling, filing, or changing a plan value are consequential. An
assistant that acts autonomously in a regulated practice is not a feature.

**Decision** — Tools that mutate or send return a structured proposal rendered as a card
with the exact payload. The user confirms in the UI. The confirmation, not the model, is
what triggers the write.

**Alternatives** — Autonomy with undo: undo does not exist for a sent email or a filed
document. Per-tool autonomy settings: defer past beta, and never for client-facing sends.

**Consequences** — More clicks. That is the intended trade.

---

## D-006 — Visx for financial charts, Recharts for simple series

2026-09-17 · Accepted

**Context** — The catalog in CLAUDE.md §8 includes Sankey, waterfall, Monte Carlo fan,
sunburst, bracket-fill, and relationship graphs. General charting libraries do not cover
these well and fight customization.

**Decision** — Visx (D3 primitives with React rendering) for anything structural or custom.
Recharts for plain line, area, and bar where speed of authoring matters. One uniform prop
shape across both so consumers cannot tell which is underneath.

**Alternatives** — Recharts only: cannot express half the catalog. Raw D3: fights React
reconciliation. A commercial financial charting suite: licensing cost, heavy bundle, and a
visual identity we do not control.

**Consequences** — Two chart dependencies. Contained by the uniform prop shape and a
Storybook-coverage requirement before merge.

---

## D-007 — Money stored as integer minor units with explicit currency

2026-09-17 · Accepted

**Context** — Floats accumulate error across projections and aggregations. In a tool where
the output goes in front of a client, a rounding artifact reads as incompetence.

**Decision** — `{ amount: bigint, currency: string }` in the database and across the wire.
All arithmetic in `lib/calc` on integers. Formatting only at the render boundary through
`lib/format`.

**Alternatives** — Decimal library throughout: workable, adds a dependency to every layer
and still needs discipline at boundaries. Floats with rounding at display: defers the error,
does not remove it.

**Consequences** — Serialization needs bigint handling. Multi-currency aggregation requires
an explicit FX step rather than naive addition, which is correct but more work.

---

## D-008 — Plan values are versioned via snapshots

2026-09-17 · Accepted

**Context** — "What changed since our last review" is one of the highest-value questions an
advisor asks, and it is unanswerable against mutable rows.

**Decision** — `PlanSnapshot` captures the full plan state at each review and at each
material change. The Activity timeline and the Overview "what changed" panel render a diff
between snapshots. Snapshots are immutable.

**Alternatives** — Field-level change log: finer grained, much harder to render as a
coherent "then vs now" view. Event sourcing the whole plan: correct and far too much
machinery for this stage.

**Consequences** — Storage growth. Mitigate with a retention policy on intermediate
snapshots, keeping all review-anchored ones.

---

## D-009 — Structure from rules and spacing, not from cards and shadows

2026-09-17 · Accepted

**Context** — The default dashboard aesthetic wraps every block in an identical rounded card
with the same soft shadow. It flattens hierarchy, wastes vertical space in a dense app, and
makes the product indistinguishable from every other SaaS tool an advisor already dislikes.

**Decision** — Hairline rules and deliberate spacing carry structure. Cards are reserved for
elements that genuinely detach from the page: dashboard widgets, modals, popovers. Two
radii, not one. Color is reserved for meaning (gain, loss, attention, action), never
decoration. Palette is ink, warm paper, pine, and brass; type is Public Sans with Source
Serif 4 restricted to long-form narrative.

**Alternatives** — A standard component-kit look: faster, generic. A dark "trading terminal"
aesthetic: wrong audience, advisors sit in client meetings with this on screen.

**Consequences** — More design judgment per screen, less copy-paste. Contributors need to
read CLAUDE.md §7 before adding UI.

---

## D-010 — Dashboard configurability is per user, with an org default

2026-09-17 · Accepted

**Context** — A solo advisor and an associate at a ten-person firm start their days looking
at different things. But a firm onboarding six people does not want six blank dashboards.

**Decision** — Admins publish an org default layout and may lock specific widgets.
Individuals customize freely on top of it and can reset to the default. Layouts persist per
user per breakpoint.

**Alternatives** — Fixed layout: simpler, fails the brief. Fully free with no default: bad
first-run experience for new team members.

**Consequences** — Layout migration logic needed when a widget is removed or renamed.
Widgets require stable ids from the start.

---

## D-011 — Positions are read-only; no portfolio accounting

2026-09-17 · Accepted

**Context** — Performance calculation, cost-basis tracking, and reconciliation are a
multi-year product on their own, and advisors already pay for them.

**Decision** — Meridian ingests positions, balances, and performance figures from the
custodian or portfolio accounting system and treats them as authoritative. We compute
allocation, drift, and concentration on top. We do not compute time-weighted returns or
maintain a tax lot ledger.

**Alternatives** — Build accounting: doubles the timeline and competes with entrenched
incumbents. Ignore performance entirely: advisors need it in the list view.

**Consequences** — Dependent on integration quality. Provenance display becomes essential
so users know which figures we derived and which we received.

---

## D-012 — CSV import ships before any custodian integration

2026-09-17 · Accepted

**Context** — Integration timelines depend on partners and are the single biggest schedule
risk to private beta.

**Decision** — A mapped CSV importer for households, members, accounts, and positions is
part of Phase 2, not Phase 8. Every integration is an additive path to the same ingestion
pipeline.

**Alternatives** — Wait for the first integration: puts M8 on a partner's calendar.

**Consequences** — Importer needs real column-mapping UI and validation, which is more work
than a throwaway script. It also becomes the migration path for every new firm, so the
investment returns.

---

## D-013 — A visual design pass precedes Phase 0 implementation

2026-09-17 · Accepted

**Context** — Several sections in the chart catalog (§8) list more than one candidate
visual for the same section (Goals: stacked area *or* bubble quadrant; Balance: treemap
*or* waterfall), and the household detail view has 14 sections that all share one scaffold
but need materially different primary visuals. Committing those choices in code, one PR at
a time, risked drifting from a coherent whole and re-litigating the same "which chart"
question 14 separate times.

**Decision** — Mock up the shell and every major surface — including all-but-one household
section — before writing application code, using Claude Design's canvas tool. Source files
live in `design/`, one `.dc.html` per screen plus a `canvas.json` layout manifest;
`design/README.md` is the index. Every screen went through two rounds of review (token/
type/radius discipline, chart-math correctness, §9 grounding-rule compliance, cross-screen
data consistency) before being treated as settled. Where the catalog offered multiple chart
options for one section, this pass made the call: Goals uses the bubble quadrant (funding
over time is carried by the Detail table instead), Balance uses the waterfall (composition
lives in Detail).

**Alternatives** — Design-in-code, screen by screen, as each Phase 1–7 item comes up: keeps
design and implementation in the same PR, but means the "which primary visual" and
cross-section-consistency questions get decided 14 times under implementation time
pressure instead of once, up front, and gives non-engineers (compliance, the design
partners) nothing concrete to react to before code exists.

**Consequences** — The mockups are static HTML, not living components — implementation
still has to build the real chart primitives from `CLAUDE.md` §8 and Storybook them per
§12. Fictional data in the mockups (household names, dollar figures, dates) is
deliberately cross-referenced between screens for demo coherence; none of it should be
carried into seed data verbatim, and tax/regulatory figures in particular were kept
non-realistic on purpose (see `design/README.md`) per the §13 rule against inventing
threshold figures. The design and the code can drift once implementation starts; nothing
enforces that they stay in sync beyond this decision record and code review.
