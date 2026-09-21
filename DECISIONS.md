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

---

## D-014 — Implementation runs on SQLite, without tRPC/Radix/auth, until something needs them

2026-09-18 · Accepted

**Context** — CLAUDE.md §2 specifies PostgreSQL, tRPC, Radix primitives, and Auth.js as
the stack. This sandbox has no Postgres server, no Redis, and no way to run a real OAuth
flow — and the first implementation pass (app shell, Clients, six household-detail
sections, Prospects, Insights, top-level Compliance) turned out to need none of tRPC,
Radix, or auth to be built correctly: every page so far is a Server Component reading
Prisma directly, the one mutation (dismissing an Insight) is a plain Next.js Server
Action, and every interactive control so far (sort, search, saved views, bulk-select) is
either URL state or a handful of local `useState` — no Dialog, Popover, or Tabs primitive
has been needed yet.

**Decision** — Use SQLite locally in place of Postgres, with the schema
(`packages/db/prisma/schema.prisma`) deliberately avoiding Postgres-only features (native
`enum`, arrays) so returning to Postgres later is a datasource-and-migration change, not a
data-shape rewrite — enum-shaped fields (segment, reviewStatus, goal status, pipeline
stage) are plain `String`s constrained by TS union types at the call site instead. Skip
tRPC, Radix, and auth entirely for now rather than scaffolding them unused; every page
runs as a single hardcoded advisor (Dana Whitfield). Introduce each piece only when a
feature actually needs it — tRPC when a client component must call back into the server
after initial load (the chat dock, once wired to a model, is the likely first consumer),
Radix when a feature needs a real Dialog/Popover/Tooltip/Tabs (the chat dock's
confirmation-card pattern is the likely first), auth when the demo needs more than one
session to matter.

**Alternatives** — Scaffold the full stack up front (Docker Postgres, a tRPC router, Radix
primitives, Auth.js) before building any screen: closer to CLAUDE.md §2 on paper, but adds
infrastructure this sandbox can't run (Postgres, Redis) and defers visible progress on the
design record without buying correctness — a tRPC layer with nothing on the client that
needs it, or a Dialog primitive with nothing that opens one, is dead weight to review and
maintain until a real feature arrives.

**Consequences** — `packages/schemas` and `packages/integrations` also don't exist yet,
for the same reason (no form or API boundary to validate against, no integration built).
Every deviation is logged in PROGRESS.md's "Implementation notes and deviations" section,
which must be kept current as each piece gets introduced for real. Money stays integer
cents everywhere regardless (`lib/format/money.ts`, per D-007) — that part of the spec is
fully followed, not deviated from. Risk: deferring auth means nothing in this pass has
been tested under multi-user/session conditions; RBAC and the audit log (§11) remain
unbuilt and unverified until that work starts.

---

## D-015 — Display preferences live on the device, and accents get their own foreground token

2026-09-19 · Accepted

**Context** — Settings needed an Appearance section, and CLAUDE.md §7 specifies both a dark
theme (with a full inverted token set already sitting unused in `globals.css`) and two
density modes "set per user in Settings". Two things blocked making those real. There is no
`User` table and no auth (D-014), so there is nowhere per-user to store a preference. And
every primary button, badge, and chart label hardcoded `text-white` / `fill="#fff"` on a
pine, brass, or info fill — fine on the light theme's dark accents, but the dark theme
lightens those accents (`--pine` becomes `#3fa683`), where white text falls to roughly 2.3:1
and fails the AA floor §7 requires of both themes. A theme toggle shipped over that would
have been a switch that visibly breaks the app.

**Decision** — Add one token, `--on-accent` (white on light, `#0e1114` on dark), and route
every mark drawn on an accent fill through it; no call site hardcodes white any more. Store
theme and density in `localStorage` under `meridian.*` keys, applied as `data-theme` and
`data-density` attributes on `<html>` by a tiny inline script in `<head>` so a dark-theme
user never sees a flash of the light palette. Everything downstream — tokens, and one
`:root[data-density="compact"] :is(th, td)` rule that tightens all fourteen tables at once —
keys off those two attributes, so nothing needs a density prop threaded through it.

**Alternatives** — Ship the toggles disabled until there's a `User` table: consistent with
how other unwired controls are handled, but these two settings need no server at all, and a
dead switch on a page whose whole job is settings is worse than a working device-local one.
Keep `text-white` and accept the dark-theme contrast: cheaper, but knowingly ships an AA
failure §7 forbids. Per-component density props: explicit, but touches every table for a
preference that is genuinely global.

**Consequences** — Preferences don't follow a user to another device or another browser, and
they're invisible to the server, so nothing can be rendered density-aware server-side. Said
plainly on the page rather than implied to be an account setting. When auth lands, a
`UserPreference` row replaces the two `localStorage` calls in `lib/preferences.ts` without
touching anything that reads the attributes. Density deliberately affects table rows only;
cards, forms, and the nav keep their spacing in both modes, which is narrower than "two
density modes" might imply. Dark mode is now reachable by any user without ever having been
through a design pass — the token values come from §7, but no dark-mode mockup exists, so
individual surfaces may need adjustment as they're reviewed in it.

---

## D-016 — The five undesigned pages ship without a design pass; household Compliance closes them out

2026-09-19 · Accepted

**Context** — D-013 put a visual design pass ahead of implementation, and 22 screens were
mocked before Phase 0. Five surfaces never got one: Schedule, Tasks, Intake, Settings, and
the household-scoped Compliance section. PROGRESS.md listed the last of these as blocked —
"needs a design pass before it can be built, unlike the others above". Offered a design pass
for all five; the user chose instead to build them directly, one page at a time, reviewing
each before the next started. The first four shipped that way over 2026-09-18 and -19, and
this entry records the choice rather than leaving it implied by four changelog lines.

**Decision** — Build all five directly against CLAUDE.md's prose spec and the token/scaffold
discipline the designed screens established, rather than blocking on mockups. For the
household Compliance section specifically, two choices follow from having no design to copy.
Its primary visual is a review-attestation timeline, not another status bar — the Documents
section already breaks its vault down that way, and what makes a compliance record auditable
is the cadence: whether each periodic review happened, and whether it was signed off. A
review held but never attested is its own failure mode, distinct from one not yet due and
from one missed outright, and only the timeline shows that at a glance. And its completeness
ring is computed from the household's own compliance rows — items in force count fully, ones
needing attention count half, an unattested or missed review costs eight points — rather than
seeded to "vary plausibly" like the other eleven section rings, because here the record
itself is a good enough stand-in for the required-field manifest that doesn't exist yet.

**Alternatives** — Hold Compliance until a design pass: consistent with D-013, but the four
sibling pages had already shipped without one and the section was the last gap in a
fourteen-section record whose scaffold dictates most of the layout anyway. Reuse the
Documents status bar for the summary: cheaper and consistent, but it would have made two
adjacent sections look identical while hiding the one thing compliance is actually judged on.
Seed the completeness figure like the other sections: consistent, but needlessly less honest
when the underlying rows can answer the question directly.

**Consequences** — Five surfaces now exist with no design record behind them, so they were
never reviewed for token/type/radius discipline the way the 22 mocked screens were; any later
design pass will be reconciling against shipped code rather than leading it. The compliance
data model (`ComplianceItem`, `ReviewAttestation`) was invented here rather than derived from
a mockup, and item names are the artifacts an RIA keeps on file while every date and status is
a fixture — no filing deadline or rule text is asserted anywhere, per CLAUDE.md §13. The IPS
now appears in two sections at once (the document vault and the compliance item list); the
seed decides its status once so the two can't disagree, but any future writer has to keep that
single source intact. `complianceCompletenessPct` being computed while its eleven siblings are
seeded is a deliberate inconsistency, and should become the pattern — not the exception — once
the real per-section manifest in `packages/schemas/completeness.ts` exists.

---

## D-017 — The assistant ships with six grounded tools and no fabricating ones

2026-09-19 · Accepted

**Context** — Phase 3 wires the chat dock to a real model. CLAUDE.md §9 names six tool
families (`household.*`, `market.*`, `calendar.*`/`task.*`, `doc.*`, `report.*`, `nav.*`) and
five grounding rules, and §1 says ungrounded speculation is a bug. But the data model only
covers some of that surface: there is no Security, Quote, Meeting, or Task model, and no
report renderer. A `market.quote` tool over a hardcoded snapshot, or a `calendar.create` over
a table that doesn't exist, would return invented answers with the full authority of a tool
result — the exact failure §9 exists to prevent, made harder to spot because it arrives
wearing a citation.

**Decision** — Add `@anthropic-ai/sdk` (the only new dependency; it replaces nothing — the
app had no model client) and ship six tools, each backed by real rows: `search_households`,
`get_household_section`, `get_household_activity`, `get_open_insights`, plus two *proposal*
tools, `propose_navigation` and `propose_dismiss_insight`. Proposal tools never execute — the
runtime returns a descriptor the dock renders as a confirmation card, and only the advisor's
click calls the existing `dismissInsight` server action. The three unbuilt families are
listed as unbuilt on Settings → AI with the reason, rather than stubbed. Grounding is enforced
in three places, not one: the system prompt states the rules, tool payloads carry
lib/format-rendered strings and a link so the model quotes rather than computes, and
`lib/ai/guardrails.ts` checks the finished reply and flags it in the dock.

**Alternatives** — Stub the missing families with fixture data so the tool surface matches
§9: better-looking demo, but it teaches the model that fabricated market data is citable, and
every honest boundary elsewhere in this codebase would be undercut by it. Let the model write
its own numbers from raw payloads: simpler tools, but rounding and formatting then vary per
answer and contradict the pages they came from. Execute writes directly and offer an undo:
fewer clicks, but §9 rule 3 is explicit that the model never commits silently, and an audit
trail of AI-initiated writes with no confirmation step is exactly what §11 is guarding
against.

**Consequences** — The assistant can answer about households, sections, activity, and open
insights, and can propose two actions; it cannot answer about markets, schedule a meeting, or
assemble a report, and will say so. Conversation history replays as plain text, so prior tool
payloads are re-fetched rather than trusted from earlier turns — more calls, but no stale
figures. The guardrail checks are narrow string rules that run after generation: they catch
the obvious cases and will miss paraphrases, and they flag rather than block, because the
advisor is the one who decides. Every turn writes append-only `AiConversation` / `AiMessage` /
`AiToolCall` rows recording tool inputs and the ids of records touched — never the payloads,
which would put client figures in a second place. Without `ANTHROPIC_API_KEY` the dock says so
and the rest of the app is unaffected.

---

## D-018 — Records are cited by ref, not described in prose

2026-09-19 · Accepted

**Context** — The first real run of the assistant (D-017) produced an answer whose figures
all matched the database but whose attribution did not: asked what to raise with an overdue
household, it wrote "flagged in the Sep 2 check-in note: they'd asked for a goals
discussion", merging the date of one activity row (a Sep 2 meeting) with the substance of
another (an Aug 9 note). Both records were real, both mentioned goals, and the sentence read
perfectly — a reader would have to already know the timeline to catch it. None of the
existing guardrails could: there is no fabricated figure, no buy/sell language, and a tool
was called. The underlying cause was structural rather than a bad turn of phrase — tool
payloads gave the model no way to *point* at a record, so the only way to attribute anything
was to describe it, and describing is where two rows blur into one.

**Decision** — Every record a tool returns carries a ref (`R1`, `R2`, …) issued by a
per-request registry (`lib/ai/refs.ts`) and included in its payload. The system prompt
requires the model to cite the ref after a claim and explicitly forbids identifying a record
by restating its date or title. The chat dock renders each ref as a link carrying that
record's own label — "Note · Aug 9, 2026 · Household mentioned interest in a goals
discussion" — so a citation pointing at the wrong row is visible rather than plausible. The
route checks the finished answer against the refs actually issued: an invented ref is flagged
`unknown_citation`, and an answer that quotes figures while citing nothing is flagged
`uncited_answer`.

**Alternatives** — Tighten the system prompt alone ("be careful with dates"): free, but the
failure mode is a model quietly conflating two records, which is exactly what instructions
are worst at preventing and what nothing downstream could then detect. Return record ids and
let the model cite those: same mechanism, but raw cuids in prose are unreadable and the
advisor still can't tell what was cited without clicking. Have the model emit structured
citations as a separate tool call: more rigid, an extra round trip per answer, and it
separates the claim from its citation at exactly the moment they need to stay together.

**Consequences** — This makes wrong attribution *visible and checkable*; it does not make it
impossible. The checks are exact about refs that resolve to nothing and silent about a real
ref attached to the wrong claim — judging that needs to compare the claim against the record,
which these string checks cannot do. What changed is that the advisor can now see, without
leaving the sentence, which record each point came from. Ref numbering is per request, so
refs in an older message do not resolve against a newer turn; the dock keeps each message's
citations on the message itself for that reason. Adding a tool means deciding what its
citable unit is — the activity tool issues one ref per event rather than one for the
timeline, because rows within one timeline are the ones most easily conflated.

---

## D-019 — Dates of birth are shown in full, not masked

2026-09-19 · Accepted

**Context** — Adding a member's birthday to the Household section ran straight into
CLAUDE.md §11, which lists dates of birth alongside SSNs and account numbers as fields to
mask by default, revealing only through an explicit action that is logged — under a heading
that calls those constraints non-negotiable. Taken literally that means an advisor cannot
see their own client's birthday without clicking through a logged reveal, four times for a
four-person household.

**Decision** — Show the full date in the roster. The product owner's framing: every user of
this platform is a certified professional operating on records that are confidential in
their entirety, so masking one field from the advisor who owns that relationship is friction
with no threat model behind it — the whole page is already client data, and nothing about a
birthday is more sensitive than the net-worth figure two sections over. Alongside the date,
the roster shows a nudge — "turns 17 in 12 days" — only when the birthday is within sixty
days, which is the part an advisor acts on; past that it would just be the same date twice.

**Alternatives** — Mask by default with a one-click, logged reveal per household: what §11
says, and the version originally built (an `AuditEvent` model plus a reveal server action,
both backed out with this decision). It defends against shoulder-surfing, screenshots, and
bulk scraping, and it produces a trail — but it taxes every legitimate look to do it, and
this application has no untrusted reader to defend against. Show month and day only: keeps
the year out of the UI, but the age is displayed two characters earlier, so the year is
derivable anyway — privacy theatre rather than privacy.

**Consequences** — §11's masking rule is now unmet, deliberately, and this entry is the
record of that rather than a silent gap; the section's own provenance line says so on the
page too. What is *not* waived: dates of birth are still unencrypted at rest, which is a
separate §11 requirement and remains unbuilt (Phase 9), and there is still no audit log of
reads. If this platform ever gains a reader who is not a certified professional — a client
portal, a support seat, a read-only role for an outside auditor — this decision should be
revisited before that ships, because the reasoning above depends entirely on who is holding
the screen. `Member.birthDate` is nullable and seeded with fictional dates consistent with
each member's stated age at seed time; the two drift as real time passes, so `age` stays the
field everything except the roster reads.

---

## D-020 — react-grid-layout for the Today grid, with editing as a mode

2026-09-19 · Accepted

**Context** — Today's widgets were a fixed 12-column CSS grid with each widget hardcoding
its own span. CLAUDE.md §5 asks for the opposite: drag to move, drag an edge to resize, add
from a catalog, remove, reset to default, and a layout that persists. §2 names
`react-grid-layout` for exactly this, and §13 requires a decision entry before any new
dependency lands.

**Decision** — Add `react-grid-layout` (v2, which ships its own types — the `@types`
package is for v1 and was removed again). It replaces nothing; the app had no drag or
resize machinery, and hand-rolling pointer capture, collision resolution, compaction, and
resize handles would be several hundred lines of subtle code to maintain against a library
the spec already chose. Three choices around it are ours, not the library's:

*Editing is a mode.* Drag and resize are off until "Edit layout" is on. A dashboard whose
cards shift under the cursor while you are reading them is worse than one that doesn't move,
and an advisor opens Today far more often than they rearrange it.

*Widgets are server-rendered and handed to the grid as content.* The grid owns placement and
never fetches. §5's widget contract eventually wants each widget owning its own query so one
failure is one card; that refactor is still open, and coupling it to this one would have
meant rewriting all ten widgets to make any of them draggable.

*A layout equal to the default is stored as no row at all.* "Reset" deletes the row rather
than writing the default into it, so an advisor who resets keeps following the default if it
ever changes. This is also what caught a real bug: reset deleted the row and the resulting
layout change wrote it straight back, until the default was made collision-free —
react-grid-layout compacts anything that overlaps, so a default with overlapping cells can
never compare equal to what actually renders.

**Alternatives** — Hand-rolled drag and resize: no dependency, but it is the kind of code
that looks done and then fails on touch, on scroll-during-drag, on collision. CSS grid with
an order-only preference (no resize): much simpler and covers "rearrange", but §5 asks for
resize and a widget catalog specifically. Persisting to localStorage like theme and density
(D-015): no schema change, but a dashboard arrangement is worth more than a per-device
convenience, and `Advisor` already exists to key it to.

**Consequences** — `DashboardLayout` stores the whole layout as JSON keyed by advisor: it is
written and read whole and never queried by its parts, so a normalised table would cost a
transaction per drop and buy nothing. Two things §5 asks for are still missing and are
marked as such: a layout per breakpoint (the app has one breakpoint — responsive behaviour
is unbuilt), and an org default that an admin publishes with specific widgets locked (no Org,
no roles — D-014). The default layout now lives in `components/widgets/catalog.ts` as the
constant an org-published default would eventually replace. Widget sizes moved there too, so
`WidgetCard` no longer carries a `span` — a widget that decided its own width would fight
the layout the advisor dragged.

---

## D-021 — Money stays in Int cents for now, with a documented $21.47M ceiling

2026-09-20 · Accepted

**Context** — Expanding the demo book from ten households to forty (M-demo item 2) failed
on the first generated household above about $21.5M: *"Value 2555305500 does not fit in an
INT column."* Money is integer minor units per D-007, and Prisma's `Int` is 32-bit, so the
largest value any single money column can hold is 2,147,483,647 cents — **$21,474,836.47**.
That is a per-field ceiling, not a per-book one, and it applies to `netWorthCents`,
`aumCents`, goal targets, and everything else denominated in cents.

**Decision** — Keep `Int` and cap the generated demo book beneath the ceiling, with a guard
in `centsFrom()` that throws a sentence naming the household and the limit rather than
letting Prisma fail with a column-type error. The forty-household book tops out at $14.75M
per household and $232M across the firm, which sits inside CLAUDE.md §1's $50M–$800M
practice and exercises every part of the app — so the ceiling costs the demo nothing today.

**Alternatives** — Migrate every money column to `BigInt` now: correct, and the right
eventual answer, but it turns every money read in the app into `bigint` — `formatMoney`,
every `reduce` that sums cents, every ratio a chart computes — which is a broad mechanical
refactor across roughly forty files, and doing it in the middle of the demo milestone would
have delayed the thing actually being built. Store dollars as `Float` instead: smaller
change, but it abandons exact arithmetic on money, which D-007 exists to prevent and which
a financial product cannot afford. Silently cap the data and say nothing: cheapest, and the
reason this entry exists — a $25M household is not exotic for a Founding-tier client, and
finding this ceiling from a production write would be far worse than finding it from a seed.

**Consequences** — A single household over $21.47M cannot be stored, and neither can a goal
with a target above it. For a demo book that is invisible; for a real firm with an
ultra-high-net-worth client it is a hard failure, so **this must be fixed before any real
data lands** — ahead of M8, and probably alongside the first custodian integration, since
that is where large balances arrive. The guard in `centsFrom()` means the next person to
hit it gets told what the problem is. Sums across the book are computed in JavaScript
numbers, which are exact to 2^53 cents (~$90 trillion), so firm-level aggregates are not at
risk — only individual stored fields.

---

## D-022 — The signals engine watches simulated indicators and explains every match

2026-09-20 · Accepted

**Context** — M-demo item 3: advisors watch indicators — rates, market conditions, tax and
policy scenarios — and want to know which households a change touches and what to do about
it. Nothing else in the demo does something their current stack can't, so this is the piece
the demo turns on. Two things had to be decided before writing a rule: what the indicator
feed is, and what an alert is allowed to say.

**Decision** — The feed is **simulated and labelled as such on every surface**. CLAUDE.md §13
forbids inventing tax thresholds or regulatory rules, and the audience for this demo spots an
invented bracket instantly; an engine demoed on a wrong number is worse than no demo. So
every `Indicator` carries `sourceLabel: "Simulated feed · demo fixture"`, the Signals page
says so in its footer, and the assistant's `get_open_alerts` tool repeats it in every payload.
Where a rule needs a threshold, the threshold comes from the scenario's own indicator value,
never from a constant in the rules file — no rule asserts what any real rule says.

An **alert must explain itself**. `Alert.rationale` is required and is built from that
household's own figures ("14.0% in cash against a 3.8% target — $664K, 10.2 points above
where the plan puts it"), not a template with a name dropped in. An alert that can't say why
this household matched is indistinguishable from a guess, and one of those costs the advisor's
trust in the whole feed. Suggested actions are prompts to review — "worth confirming with
them", "worth raising with their estate attorney" — never instructions, per §9 rule 4.

Rules live in `lib/calc/signals.ts`, pure and free of Prisma; the runner that writes alerts
lives in `lib/signals/run.ts`; and the same runner is reachable from a "Run now" button and
from `pnpm --filter @meridian/web signals`, which is what a cron would call. No BullMQ —
there is no Redis here (D-014), and a script is more demoable anyway: you can fire it
mid-sentence.

**Alternatives** — Use real published rates and thresholds so the demo looks authentic: it
would look authentic right up until an advisor checked one, and §13 rules it out. Let the
assistant run the engine on request: tempting, but running a scenario writes alerts against
every household, and §9 rule 3 keeps effects behind a human click. Score every household
every night regardless of whether anything moved: simpler scheduling, but an alert with no
change behind it has nothing to explain itself with.

**Consequences** — Rule thresholds are tuned against this seeded book and are visibly
arbitrary; every one of them is a judgement that a real deployment would re-tune per firm.
Tuning them was most of the work and the numbers show why: at the first thresholds, a 14%
drawdown flagged 32 of 40 households and a harvesting rule fired on 31 — which is not a
signal, it is a description of the book. The gates now sit where they select rather than
describe (24 of 40 on that scenario; 8 on harvesting). Alerts accumulate per change and are
replaced on a re-run rather than duplicated. Severity is a string, so it must be sorted
through `bySeverity()` — ordering the column ascending sorts alphabetically and quietly
buries every medium alert beneath the low ones, which is exactly what happened until the
assistant's summary of a run made it visible.

---

## D-023 — Money columns are BigInt; cents convert to number at the boundary

2026-09-20 · Accepted · Supersedes the deferral in D-021

**Context** — D-021 recorded a $21,474,836.47 ceiling on every money field: cents in a
32-bit `Int` column. It was deferred because the demo book fit underneath and the migration
touched 268 references across 37 files. The deferral came with an explicit trigger — fix it
before real data — and it is cheaper to do now, with a seeded book, than after a custodian
feed has written balances into it.

**Decision** — Every `*Cents` column becomes `BigInt` (25 of them across Household, Goal and
Prospect). That makes the ceiling about $92 quadrillion, which is not a number anyone needs
to think about again.

The cost BigInt imposes is one rule, and the whole migration is that rule applied
consistently: **cents are `bigint` in the database layer and in server-side money
arithmetic, and become `number` at the boundary where they are serialised or handed to a
client component.** `bigint` cannot be JSON-serialised, so React throws when one crosses
into a client component, and `JSON.stringify` throws in the assistant's tool payloads.
`lib/format/money.ts` owns the conversions: every formatter accepts `number | bigint`, and
`centsToNumber`, `toCents` and `absCents` are the explicit crossings. `lib/calc` stays on
plain numbers — its functions multiply cents by fractions, which bigint cannot do — so the
signals runner and the retirement and tax pages convert on the way in.

**Alternatives** — Keep `Int` and cap the data, as D-021 did: free, and wrong the moment a
Founding-tier client is onboarded. Store dollars as `Float`: smaller diff, but it abandons
exact money arithmetic, which D-007 exists to prevent. Store cents as a string and parse at
use: no ceiling and no bigint, but every comparison and sum becomes a parse, and sorting in
SQL stops working.

**Consequences** — The seed derives figures in numbers and converts at the write through
`big()`, because `deriveFinancials()` multiplies by fractions throughout. Prisma accepts
`number | bigint` as BigInt input, so that boundary is forgiving; reads are always `bigint`,
so the reading side is not. Anyone adding a money field now has to know the rule — it is in
the schema header, in `lib/format/money.ts`, and in PROGRESS's implementation notes. The
archetype ranges capped under the old ceiling are restored: the book's largest household is
now $25.6M in net worth and the firm total is $255.6M, both of which the previous schema
could not represent. Verified by storing a $97M net worth household, reading it back exactly,
rendering all thirteen of its sections, listing it in the client-component Clients table, and
asking the assistant about it — that last one exercising the `JSON.stringify` path that
bigint would have broken.

---

## D-024 — Planning is a section that contains four disciplines, and scenarios are per member

2026-09-20 · Accepted

**Context** — CLAUDE.md §6 lists Retirement, Tax, Protection and Estate as four sibling
sections of the household record, and the app built them that way. What was missing is the
thing an advisor actually does with them: ask what happens to the plan if something changes.
MoneyGuide and eMoney both organise around that question — a probability of success, levers
that move it, and saved scenarios compared side by side — and the four disciplines are the
places the answer shows up rather than four separate destinations.

**Decision** — Add **Planning** to the household nav after Goals, and move Retirement, Tax,
Protection and Estate inside it as tabs, with a scenario explorer as the first tab. That is a
deviation from §6's flat fourteen-section list, recorded here rather than silently made: the
four are still complete sections with their own scaffolding, completeness rings and
insights — they moved, they were not merged.

Scenarios are **per member**, not per household. Two people in one household retire in
different years, claim Social Security in different years and stop saving in different years,
and the household's outcome is the interaction of those three pairs of dates — "she goes at
62, he works to 67" is the first question any couple asks, and a single household-level
retirement age cannot express it. `PlanScenario` holds household levers, `PlanScenarioMember`
holds per-person ones, and both store **only what the scenario changes**: null means inherit
from the record, so a saved scenario stays meaningful after the underlying plan is updated
and a comparison row can say "Karen retires at 64" rather than restating the whole plan.

The projection (`lib/calc/planning.ts`) recomputes in the browser on every lever move. A
planning conversation is a sequence of "what if", and an advisor who has to press Calculate
stops asking the third question; it is a few hundred pure-arithmetic paths, so a round trip
per keystroke would buy nothing.

**Alternatives** — Add Planning as a fifth sibling section: no nav churn, but then the
scenario explorer sits beside the four views it drives instead of above them, and the
household record grows to fifteen entries. Keep one household-level retirement age: far
simpler, and wrong for every couple. Recompute on the server per change: keeps one
implementation, but adds latency to the interaction the feature exists for.

**Consequences** — Four URLs moved, which is why `lib/sections.ts` now exists: the slugs were
repeated in the section nav, the insight card, the AI tools, the signals rules and the
Overview ring, and four of those would have kept pointing at the old paths. Social Security is
an **input**, not a calculation — a benefit depends on an earnings record this app does not
hold, and deriving one would be inventing a financial figure (§13) — so it defaults to zero
with the gap stated on each member's card. Per-member savings splits the household's recorded
savings evenly across working members until intake's per-member figures reach the seeded
households; that is stated on the page. The projection remains illustrative in the same terms
as the existing one: no mortality table, no tax-aware withdrawal ordering, no inflation path.

---

## D-025 — Scenario levers are the advisor's assumptions, and every one of them starts neutral

2026-09-21 · Accepted

**Context** — D-024 shipped the scenario explorer with six levers: retirement age, Social
Security claim age, SSA estimate and annual savings per member, plus household spending and
a real return. That is enough to demonstrate the idea and not enough to plan with. The
questions an advisor actually brings to a review — she goes to three days a week at 62, his
pension has no COLA, what if we assume long-term care from 85, what does the tax drag on
withdrawals do, what if the practice sells for a million in five years, do they still leave
the house to the kids — have no lever to pull. So the model gained eleven more, and the six
that existed gained a professional context to sit in.

**Decision** — Seventeen levers, split by who owns the decision. Per member: retirement age,
plan-to age, part-time income and through-age, Social Security claim age and SSA estimate,
pension amount, start age and COLA flag, annual savings and a real step-up rate. Per
household: retirement spending, a spending shift of ±N% from a stated age, survivor
spending, long-term-care cost from a stated age, real return, volatility, inflation, an
effective tax rate on withdrawals, a one-time inflow with a label and a year, a legacy
target, and the plan horizon.

**Every new lever defaults to a value that changes nothing.** No pension, no part-time work,
no tax drag, no survivor reduction, no care cost, no legacy target, zero inflation. This is
the load-bearing rule, not a convenience: a default that moved the projection would be the
application inventing a financial assumption on the advisor's behalf (§13), and — worse — the
advisor would have no way to tell which figures were theirs. The check for it is concrete:
the Whitaker plan of record reads 69% before and after this change.

Three modelling choices follow from keeping everything in today's dollars. **Inflation
erodes level income only** — a pension without a COLA, and nothing else, since the portfolio
return is already real; Social Security is treated as keeping pace because its COLA is
statutory rather than an assumption. **Longevity is a stated plan-to age per member**, not a
mortality table, and when one member passes theirs the household spends the survivor
percentage of joint spending. **Tax is one effective rate** grossed up on portfolio
withdrawals so the household nets its spending; guaranteed income is taken as stated net,
because its treatment depends on facts this app does not hold.

A legacy target changes what counts as success — ending at or above it, rather than merely
not running out — which is the only lever here that moves the probability without moving a
single dollar of the projection.

**Alternatives** — A JSON blob column for levers: one migration instead of eighteen nullable
columns, but null-means-inherit stops being expressible in the schema and every read needs a
parse and a cast. Nominal-dollar modelling with a full inflation path: more conventional, and
it would have made every existing figure on the page mean something different. Named risk
profiles (conservative/balanced/aggressive) instead of a return-and-volatility pair: friendlier,
but the mapping from a name to a return is exactly the invented benchmark §13 rules out.

**Consequences** — Seventeen levers do not fit in a column beside a chart, so the explorer
became a four-tab workbench (People, Spending, Markets & tax, Events) with the outcome panel
sticky beside it; each tab carries a count of what has been moved inside it and the chips
under the chart spell out every active change, so grouping hides nothing. `lib/planning/
describe.ts` writes those chips *and* the summary column of the saved-scenario table from one
baseline-vs-current comparison — the previous version read the scenario record field by field,
and every lever added here would have been silently missing from the saved rows.

`pnpm --filter @meridian/web check:planning` asserts the direction each lever moves the
projection and that the plan of record is unmoved. It belongs in Vitest and will move there
when the runner is wired up; it asserts on direction rather than values because it reads a
seeded household, so reseeding cannot break it.

> Superseded by **D-026**: the runner was wired up the next day and the script is gone. Its
> content is now `lib/calc/planning.test.ts` and `lib/planning/baseline.test.ts`, run by
> `pnpm test` against a fixture household rather than a seeded database.

---

## D-026 — Vitest, and the tests it was wired up to hold

2026-09-21 · Accepted

**Context** — CLAUDE.md §2 has listed Vitest as the unit-test runner since the repository
started and §12 has asked for `lib/calc` to be covered "with unit tests covering edge cases"
for just as long, but neither was wired up. D-025 left a `check:planning` script standing in:
a tsx entry point that read a seeded household out of the database and printed a table of
directions for a human to read. It worked, and it was the wrong shape — it needed a seeded
database, it reported rather than asserted, and nothing ran it but a person remembering to.

**Decision** — Vitest, `lib/**/*.test.ts`, `node` environment, `pnpm test` at the root.
`check:planning` is deleted and its content is now four suites that assert instead of print:
`lib/calc/planning.test.ts`, `lib/planning/baseline.test.ts`, `lib/planning/describe.test.ts`
and `lib/charts/treemap.test.ts`, plus `lib/format/name.test.ts`. 101 tests, about a second,
no database.

The database dependency is replaced by `lib/planning/fixtures.ts` — a fictional household,
marked as a fixture (§13), whose *shape* is the part under test: a couple whose primary is
the younger of the two, retiring and claiming at different ages, with one dependent, one
costed goal and one uncosted one. That shape is chosen deliberately. Ordering members by age
rather than by role is the bug D-024 found in the Whitakers, and this fixture reproduces the
conditions for it, so `assigns retirement and claim ages by role, never by position or age`
fails if it ever comes back.

Scope is unit tests only, and that is a real limit rather than an oversight: everything under
test is pure, so the suite needs no database, server or browser. Component and end-to-end
coverage are Storybook's and Playwright's jobs (§2) and remain unwired, which means the
browser is still where UI behaviour gets verified in this repository.

**Alternatives** — Keep the script and add a `--ci` flag that exits non-zero: cheaper, but it
still needs a seeded database and still tests one household rather than a stated shape.
Integration tests against the seeded database under Vitest: they would catch seed drift, and
they would also fail for reasons that have nothing to do with the code under test.

**Consequences** — Direction is asserted, never a value, wherever a number depends on the
random draw. One case needed its own treatment and is worth recording: extending the plan
horizon lowers the probability of success while *raising* the median ending value, because
that value is measured at the end of a longer plan. Both are correct and they are not
comparable, which is why the saved-scenario table's column is now labelled "Median at plan
end" rather than implying a shared yardstick. `ending values are only comparable within one
horizon` keeps that from being rediscovered as a bug.

---

## D-027 — Book composition is a squarified treemap, and labels are measured before they are drawn

2026-09-21 · Accepted

**Context** — The Insights book-composition chart called itself a treemap and was two flex
rows: the top three households across the top, the other thirty-seven in a single row
beneath. At forty households that second row is thirty-seven seventeen-pixel columns. No name
survived truncation, and the value line had no truncation at all, so forty money figures
overflowed their cells and overprinted each other into an illegible smear along the bottom
edge. It was the worst-looking thing in the application.

**Decision** — A real squarified treemap (Bruls, Huizing & van Wijk), as `lib/charts/
treemap.ts`: pure geometry, no React, no DOM, unit-tested for proportional area, exact fill,
no overlap, and aspect ratios under 5:1. The smallest of forty cells is now about 13 × 25
units instead of a 17-pixel sliver.

Labels are **measured against the cell before they are drawn**, which is the half that
actually fixes the appearance and the reason the layout is computed in viewBox units rather
than percentages: a cell draws a name only if the name fits, and a value only if there is a
second line's room for it. Nothing is ever clipped mid-word or spilled across a neighbour.
Three rules make the result read as deliberate rather than arbitrary:

- **The distinguishing word, not the first N characters.** Every household name here carries
  a generic tail, so "Achebe" beats "Achebe Househ…" — shorter *and* it keeps the half that
  tells households apart. `householdKeyword` drops a leading article first, or "The
  Whitakers" shortens to "The", which names nobody.
- **A five-character floor on a truncated label.** "Ab…" and "Va…" are debris. Five rather
  than six because the stricter figure made labelling depend on how long a name is rather
  than how big its cell is — "Duarte" labelled, the identically sized "Kowalski" beside it
  blank, which to a reader is arbitrary.
- **An estimate that errs toward cutting early.** The character-width constant must sit at or
  above the widest average the face really produces. It was 0.55 em and the browser measures
  0.665 for digits and the ellipsis, so two labels overflowed their cells; it is 0.68 now, and
  a test pins it against the measured values.

Every cell keeps a `<title>` whatever its size, so the eighteen too small to label are still
identifiable on hover.

**Alternatives** — Measure the container with a ResizeObserver and lay out in real pixels:
exact, and it makes the only chart in the repository a client component. `preserveAspectRatio
="none"` to fill the column: preserves relative areas but distorts the cells and stretches the
type. Show only the top ten households and total the rest as "other": legible, and it throws
away the long tail that the chart exists to show the shape of.

**Consequences** — The viewBox is 560 × 210 rather than square, chosen to sit close to the
half-width column it renders in; a squarer one letterboxes, which on a chart made of
rectangles reads as a bug rather than as margin. Type sizes are in viewBox units and scale
with the container, like every other chart here, so 11 and 10 units land at roughly 11px and
10px at that width. Nineteen of forty cells carry a name and value; the rest rely on hover.
Click-through and keyboard navigation followed in D-028; the table equivalent §8 asks for is
still missing.

---

## D-028 — Treemap cells are links, and the arrow keys move between them spatially

2026-09-21 · Accepted

**Context** — D-027 made the book-composition treemap legible and left the rest of §8's chart
contract unmet: "every chart is interactive (hover detail, click to filter or drill through),
keyboard navigable, and has a table equivalent behind a toggle". A chart of forty households
that cannot be opened is a picture of the book rather than a way into it, and the natural
next move after spotting a large cell is to go and look at that household.

**Decision** — Every cell is an SVG `<a href="/clients/{id}">`. A real link rather than a
`<div onClick>`: middle-click, open-in-new-tab, copy-link and the status-bar URL preview all
work because the browser already knows how to do them, Enter activates it without any key
handling of ours, and it appears in the accessibility tree as a link with a name. The click
handler intercepts only a plain left click, to route without a page load, and returns early
on any modifier so the browser keeps the cases it handles better.

**Keyboard navigation is a roving tabindex, not forty tab stops.** Forty stops in the middle
of a page is hostile to anyone tabbing past the chart to reach something else; the chart is
one stop, and the arrows move within it. They move **spatially**, which is the part that
needed real code: → from a tall cell has to reach whatever is beside it, not whatever is next
in value order, so `neighbour` in `lib/charts/treemap.ts` picks by geometry. A candidate that
overlaps the source's span on the other axis always wins — a cell you can draw a straight line
to is the one a viewer means — and one that overlaps nothing must sit within 45° of the
direction asked for. That cone is not decoration: without it the top-left cell answered ↑ with
the cell to its right, whose centre was a fraction higher, which is true and is not what
anybody pressing ↑ meant. Home and End jump to the largest and smallest household.

Both the interactive layer and this component are built to be verified rather than asserted.
The geometry is unit-tested, including that all forty cells stay reachable by arrow keys from
any starting point; the behaviour was driven in a real browser.

This makes the chart the only client component in `components/charts`. §12 allows it —
interaction requires it — and nothing in the page around it changed.

**Alternatives** — A `<div>` grid overlaid on the SVG: easier focus styling, and it gives up
real links and duplicates the layout in a second coordinate system. Forty native tab stops
with no arrow handling: less code, and it puts forty stops between the chart and whatever
follows it. Arrow keys stepping through value order: trivial, and it does not match what is
on screen, which is the whole point of a treemap. An `onSelect` callback per §8's uniform
prop shape: the Insights page is a server component and cannot pass a function, and a URL is
the better answer here anyway.

**Consequences** — The focus ring is drawn rather than left to the browser, because an SVG
element's default focus outline is not dependable; it is painted last so it sits over the
neighbouring fills, and uses `--on-accent`, so it follows the label colour into dark mode.
Hover and focus share one highlight. Verified in the accessibility tree: a `group` named for
the chart, described by the keyboard hint, containing forty `link` children each named
"{household}, {segment}, {AUM} under management". The table equivalent §8 asks for is still
not built.

---

## D-029 — Allocation holds real positions, and every figure about them is derived from them

2026-09-21 · Accepted

**Context** — The Allocation section could say a household was 62% equities and could not say
what the equities *were*. CLAUDE.md §6 lists "holdings, concentration" as part of the section
and §10 puts `Position` and `Security` in the data model; neither existed. What existed
instead was four stored columns — `topHoldingName`, `topHoldingTicker`, `topHoldingPct`,
`distinctHoldings`, `blendedExpenseRatioPct` — seeded as independent random numbers. A
"distinct holdings: 41" that answers to nothing is harmless only while there is no table under
it; the moment there is, it is a page contradicting itself.

**Decision** — `Security` and `Position`, with every figure the section states about holdings
computed from the positions rather than stored beside them. The seed builds a household's
positions *from* its allocation percentages — the sleeves are sized off `equityActualPct` and
`fixedIncomeActualPct` with cash taking the remainder, and the remainder trick means the parts
add to the whole exactly — so re-deriving the mix off the positions reproduces the stored
percentages to 0.000 points across all forty households. The blended expense ratio, the
distinct-holdings count and the largest position are likewise rolled up, which took
`distinctHoldings` from an invented 18–48 to a true 7–13.

`Account` is **not** included, though §10 puts one between Household and Position. Taxable
versus IRA versus Roth genuinely matters — it drives withdrawal ordering and §6 wants an
"account types held" filter — but nothing in the app needs it today, and an empty table
modelling a distinction no surface makes is worse than a later migration. Position hangs off
Household and the account layer is deferred.

**Concentration is measured on single names only.** Across the seeded book the largest *fund*
is a median 24% of the portfolio and the largest *single stock* a median 8%; a threshold that
catches the second flags all forty households on the first. A broad index fund at a quarter of
the portfolio is diversification. One company at a quarter is the conversation. At 10% of the
portfolio the rule selects seventeen of forty, which is a finding rather than a description of
the book — the same tuning lesson as D-022's signal rules.

**Alternatives** — Keep the stored columns and add positions beside them: no migration of the
seed, and two sources of truth that disagree the first time either changes. Store the
positions and keep the percentages authoritative: the percentages are what the advisor set in
the IPS, so this is nearly right, but then the holdings table is decorative and cannot be
edited. Model `Account` now: correct per §10 and unused by anything, so it would be seeded
fiction in a shape no page reads.

**Consequences** — The rings became SVG arcs (`lib/charts/donut.ts`). A `conic-gradient` draws
the right picture and gives you nothing to hold — a gradient has no segments, so a slice
cannot be hovered, clicked, or named — and "select equities to see what is in it" is not
possible over one. The legend rows are the accessible control, a radio group with one tab stop
and arrow keys, since choosing one of three classes is exactly what a radio group is; the ring
segments click through to the same selection as a pointer-only affordance.

Two scales meet in the holdings chart and mixing them is a live trap. Bars inside a class are
drawn as shares *of that class*; the concentration limit is a share *of the portfolio*. Drawn
against each other the marker sat far left of where it belonged — a 10% portfolio limit is
16.7% of a class that is 60% of the book — and holdings nowhere near the limit appeared to
cross it. `thresholdWithinClass` does the conversion and is tested. The marker is also drawn
only on single-name rows: across a fund's bar it is a line the bar visibly crosses, which
reads as a breach whatever the caption says.

The assistant's `allocation` section reader now returns the positions too, rolled up through
the same function the page uses, so what it says and what the page shows come from one place.
Securities are shared across the book, which is what keeps the Markets watchlist grouping by
ticker meaningful — thirteen distinct top holdings across forty households.
