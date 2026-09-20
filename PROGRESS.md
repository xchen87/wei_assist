# PROGRESS.md

Development plan and status for Meridian. Update this file whenever work starts,
completes, or gets reprioritized. Add a dated line to the changelog at the bottom.

**Status key:** `[ ]` not started · `[~]` in progress · `[x]` done · `[!]` blocked · `[-]` dropped

**Last updated:** 2026-09-19
**Current phase:** Phase 3 — the assistant is wired: streaming, six grounded tools,
confirmation cards, guardrails, and an append-only interaction log. Phase 5 is complete — all 13 household-detail sections are built on the
shared scaffold (Business is correctly hidden; no seeded household has an entity, D-003).
The five surfaces with no design mockup were built directly at the user's direction
(D-016). Next up is Phase 3, the assistant: the chat dock is UI-only until a model,
tool runtime, and confirmation flow exist.

---

## Milestones

| M | Name | Definition of done | Target |
| --- | --- | --- | --- |
| M1 | Shell walking skeleton | Three-column shell, nav, routing, auth, empty routes render | Week 3 |
| M2 | Household spine | Seeded data, Clients list with filters, 4 core sections | Week 7 |
| M3 | Assistant online | Chat dock streaming, 6 grounded tools, confirmation flow | Week 10 |
| M4 | Today configurable | Prompt zone + widget grid with persistence | Week 12 |
| M5 | Plan complete | All 14 household sections at parity with the scaffold | Week 17 |
| M6 | Pipeline to plan | Prospects + Intake producing a real household | Week 20 |
| M7 | Audit ready | Compliance, audit log, retention, RBAC verified | Week 23 |
| M8 | Private beta | 5 design-partner firms on real data | Week 26 |

---

## Design reference

A visual design pass is ahead of implementation: 22 screens covering the app
shell, Today, Clients (both sort directions), the chat dock, 13 of 14
household-detail sections, Prospects, Documents, Reports, Compliance,
Markets, and Insights. Every screen was reviewed twice for token/type/radius
discipline, chart correctness, and grounding-rule compliance (`CLAUDE.md` §9)
before being treated as final.

- **Source and full inventory:** `design/README.md` — screen-by-screen table
  mapping each mockup to the phase below, plus what's explicitly *not*
  designed yet (household-scoped Compliance, Schedule, Tasks, Intake,
  Settings, auth, empty/error/loading states, modals, dark mode, responsive
  breakpoints — see that file for the full list).
- **Live canvas:** https://claude.ai/artifact/7vF1chcTKQvfF6zjG2K1yP
- Treat the design as the visual spec for any Phase 1–7 UI work below. Where
  a phase checklist item below has a matching mockup, build to match it
  (tokens, copy, layout) rather than reinterpreting `CLAUDE.md`'s prose
  description from scratch.

---

---

## Local setup

`.env` and the SQLite file are gitignored, so a fresh clone needs four steps
before `pnpm dev` will serve anything:

```bash
pnpm install                                  # pnpm 12.x, Node 22.x
cp packages/db/.env.example packages/db/.env  # DATABASE_URL=file:./dev.db
pnpm --filter @meridian/db exec prisma generate
pnpm db:push && pnpm db:seed                  # creates packages/db/prisma/dev.db
pnpm dev                                      # http://localhost:3000
```

`packages/db/.env` is the only env file needed — Prisma Client loads it from
the schema directory, so `apps/web` needs no copy of `DATABASE_URL`. The
relative `file:./dev.db` resolves against `prisma/schema.prisma`, not the
process cwd, so it points at the same database from either workspace package.

The assistant needs one more, and only if you want it to answer: copy
`apps/web/.env.example` to `apps/web/.env.local` and set `ANTHROPIC_API_KEY`.
Without it the chat dock says exactly that and every other surface is
unaffected.

Checks: `pnpm typecheck`, `pnpm lint`, `pnpm build`.

## Implementation notes and deviations from the stack in CLAUDE.md §2

Read this before touching the code — several choices here depart from the
spec for reasons specific to this sandbox, not because the spec was wrong.

- **Database is SQLite, not PostgreSQL.** No Postgres server is available
  in this environment (see D-014). Schema in `packages/db/prisma/schema.prisma`
  deliberately avoids Postgres-only features (arrays, native `enum`) so the
  switch back is a datasource change plus a migration, not a data-shape
  rewrite. Segment/reviewStatus/goal-status/pipeline-stage are plain
  `String` fields, constrained by TS union types at the call site instead of
  a DB-level enum.
- **No tRPC yet.** Every page built so far is read-only display, fetched
  directly from Prisma in Server Components — the idiomatic App Router
  pattern, and simpler than a tRPC hop with nothing on the client that needs
  it. The one mutation that exists (dismissing an Insight) is a Next.js
  Server Action, not a tRPC call. Introduce tRPC when a client component
  actually needs to call back into the server after the initial load (the
  chat dock, once it's wired to a model, was the expected first real
  consumer) — not before. The chat dock has since been wired and still
  didn't need it: it streams from a plain App Router route handler
  (`app/api/chat/route.ts`) over `fetch`, because what it needs is a
  streaming response, which is the one thing tRPC's request/response shape
  is worst at.
- **No Radix yet.** Nothing built so far needs a Dialog, Popover, Tooltip,
  or interactive Tabs widget — saved views and sort are plain links/URL
  state, bulk-select is a handful of local `useState`. The chat dock's
  confirmation card — expected to be the first real Radix consumer — turned
  out to be an inline card in the message thread rather than a dialog, so it
  needed nothing. Add Radix when a feature actually needs a real
  Dialog/Popover/Tooltip/Tabs.
- **No auth.** Every page runs as a hardcoded advisor (Dana Whitfield).
  Auth.js, org-scoped sessions, and RBAC are all still `[ ]` below.
- **`packages/schemas` and `packages/integrations` don't exist yet.** Zod
  schemas are valuable once there's a form or an API boundary to validate;
  right now every write is a single Server Action with one argument.
  Integrations are Phase 8 and untouched.
- **Money is integer cents everywhere** (`lib/format/money.ts` is the only
  place that turns cents into a display string), per D-007 — this one
  *is* fully followed, not deviated from.
- **Ten households, not forty.** The seed script
  (`packages/db/prisma/seed.ts`) has eight households with figures pulled
  verbatim from `design/Clients.dc.html`, plus two new ones
  (Delacroix–Wu, Bergström) to reach ten. Section-level detail
  (Cashflow/Balance/Allocation/Goals) beyond what the design specified for
  Ramirez is generated by a pure `deriveFinancials()` function, seeded by
  household name, so numbers stay internally consistent (waterfalls
  reconcile, allocations sum to 100%) without ten sets of hand-typed figures
  that could quietly contradict each other. Ten prospects are seeded the
  same way from `design/Prospects.dc.html`, plus two new ones.
- **Several Today widgets are honestly static**, not fake-dynamic: Markets,
  Milestones, Recents, and Notes have no backing model (no Security/Quote,
  no DOB, no view-tracking, no persistence). They're labeled as such in
  their component files. Agenda, Tasks, Alerts, Pipeline, Book, and Reviews
  are all real queries against seeded data.
- **The assistant cites records by ref, never by describing them.** Every
  record a tool returns gets an `R1`-style ref (`lib/ai/refs.ts`) that the
  reply quotes and the dock renders as a link naming that record. A new
  tool has to decide its citable unit — one ref per row where rows can be
  confused with each other (activity events), one per section where they
  can't. Prose attribution is how a Sep 2 meeting and an Aug 9 note became
  one wrong citation (D-018).
- **The assistant only has tools for data that exists.** `lib/ai/tools.ts`
  has six tools, all backed by real rows. Market, calendar/task, and report
  tools from CLAUDE.md §9 are deliberately absent — a tool over fixture data
  returns invented answers wearing a citation, which is worse than no tool
  (D-017). If you add a tool, add the model behind it first.
- **Nothing the assistant does writes without a click.** `propose_*` tools
  return a descriptor; the runtime never executes them. Keep that property
  when adding tools — an action tool that runs itself breaks §9 rule 3 and
  the audit trail stops meaning anything.
- **The IPS has two homes and one source of truth.** It appears both in the
  household document vault (Documents section) and as a required item in
  Compliance. The seed decides its status and date once and both read that
  same value — two independent rolls would eventually have the vault calling
  it signed while Compliance called it due. Keep that intact when either
  section changes.
- **Compliance item names are real artifacts; every date and status is a
  fixture.** Form ADV, Form CRS, and the privacy notice are what an RIA
  actually keeps on file, but no filing deadline, cadence requirement, or
  rule text is asserted anywhere in the app (CLAUDE.md §13). Items come due
  on the household's own review cycle, and anything past its due date is
  flagged by one rule rather than per-item special cases.
- **Display preferences are device-local, not per user.** Theme and density
  (Settings → Appearance) persist in `localStorage` and apply as two
  attributes on `<html>`; there's no `User` table to store them on yet
  (D-015). Anything drawn on a pine/brass/info fill uses the `--on-accent`
  token rather than white — the dark theme lightens those accents, where
  white text would fail AA.
- **A real bug worth remembering:** date-only values (review dates, contact
  dates) were rendering one calendar day early throughout the app —
  `new Date("2026-10-03")` parses as UTC midnight, and this sandbox's
  server timezone is America/Denver, so every unpinned
  `toLocaleDateString` call quietly lost a day. Fixed by pinning
  `timeZone: "UTC"` in `lib/format/date.ts`. If dates ever look off by one
  again, check this first before suspecting the data.

---

## Phase 0 — Foundations

- [x] Repo scaffold: Next.js App Router, TypeScript strict, ESLint — configured; no
      Prettier config file written yet (installed as a dependency only)
- [~] Monorepo wiring — `apps/web` and `packages/db` exist and are wired via pnpm
      workspaces; `packages/schemas` and `packages/integrations` don't exist yet (see notes)
- [x] Design tokens in CSS custom properties, Tailwind theme mapped to them
      (`apps/web/app/globals.css`, `apps/web/tailwind.config.ts` — exact values from
      CLAUDE.md §7, including the dark-mode set, which Settings → Appearance now
      switches between. One token is ours, not §7's: `--on-accent`, for text drawn on
      a pine/brass/info fill, which white can't serve in both themes (D-015)
- [x] Type setup: Public Sans + Source Serif 4 (`next/font/google`), `.tabular` utility
- [~] `components/ui` primitives — built: Button, Badge, EmptyState, ErrorState,
      RouteEmptyState, FilterSelect (URL-driven select, shared by Documents/Tasks),
      and the icon set. Not built: Field, Input, Select, Checkbox (a real one, not
      the table's inline one), Tabs, Sheet, Dialog, Popover, Tooltip — deferred until
      a feature needs them (see notes). Settings has its own local scaffold
      (`components/settings/settings-panel.tsx`) rather than generalised primitives
- [ ] Storybook with light/dark and density toggles
- [~] Prisma schema v1 — sixteen models, shaped around what's actually implemented
      (Advisor, Household, Member, Goal, Insight, Prospect, Policy, EstateAsset,
      EstateDocument, Document, ActivityEvent, ComplianceItem, ReviewAttestation, and
      the assistant's AiConversation/AiMessage/AiToolCall), not the
      Org/User/Role/Account/Position/Security model in CLAUDE.md §10 — see
      `packages/db/prisma/schema.prisma`'s header comment
- [x] Seed script — 10 households + 10 prospects (the requested demo scope; CLAUDE.md's
      "40 households" is aspirational for later, not done)
- [ ] Auth.js with org-scoped sessions, MFA stub
- [ ] RBAC middleware and a `requireOrgScope` query helper
- [~] Append-only `AuditEvent` writer + logger PII scrubber — the assistant has its
      own append-only log (`AiToolCall`, recording tool inputs and the ids of records
      touched), but there is no general `AuditEvent` covering ordinary reads and
      writes, and no PII scrubber in the logger
- [ ] CI: typecheck, lint, unit, build — all three commands run clean locally
      (`pnpm typecheck`, `pnpm lint`), just not wired into CI yet (no CI config exists)

## Phase 1 — Shell (M1)

- [~] Three-column layout — built and fixed-width; not resizable, no persistence
- [~] Nav rail — icon mode, groups, Settings pinned bottom all match the design exactly;
      no expand-on-hover/pin-to-expanded mode
- [x] Route stubs for all 12 top-level entries with proper empty states — every one
      has since been built out for real; no stub routes remain
- [ ] Responsive behavior: overlay chat < 1280px, bottom bar nav < 900px
- [ ] Command palette (⌘K)
- [~] Global search — Clients list has a working name search; nothing global yet
- [~] Keyboard map and visible focus states beyond browser defaults — a token-coloured
      `:focus-visible` ring is global (keyboard only, never on mouse clicks), with an
      inverted ring on pine fills where a pine ring would vanish. No keyboard map or
      shortcut layer yet
- [x] Theme switching, density switching — both real, in Settings → Appearance. Light /
      dark / system and comfortable / compact, applied as `data-theme` / `data-density` on
      `<html>` and persisted in localStorage (no User table to hang them on yet — D-015).
      Density tightens table rows only (40px → 32px), not cards or the nav

## Phase 2 — Clients spine (M2)

- [~] Household table, 12 columns, tabular figures — not virtualized (10 seeded rows
      don't need it; revisit once row count actually warrants it)
- [~] Sort — real, URL-driven (`?sort=&dir=`), all 12 columns. Show/hide, reorder, and
      pin-the-household-column are not built
- [~] Search — household name or any member's name; no email or tag search (neither is
      modelled). Matches the same two fields the assistant's `search_households` tool does
- [ ] Filter chips (region, income, investable assets, segment, goals, life stage, risk,
      completeness, last contact, review status, account types, tags, advisor)
- [x] Filter state in URL, shareable (sort, saved view, and search query all do this)
- [x] Saved views: My book, Needs review, At risk
- [~] Bulk select — real selection state and a bulk-action bar. Export is real: it
      writes a CSV of the selected rows with dollars as numbers and ISO dates, since
      the destination is a spreadsheet. Assign/Tag/Add to campaign/Schedule review stay
      disabled — each needs a model or integration that doesn't exist
- [x] "Analyze this cohort" handoff into chat — the Clients toolbar hands the assistant
      the household ids the table is actually showing, not the URL, since a saved view
      like "At risk" is a filter the assistant can't reproduce from query params. The
      chat chip names the cohort ("3 households · At risk") and clearing it really does
      drop those households from the next request
- [x] Household detail route with section nav and the `PlanSection` scaffold
- [ ] Completeness manifest engine + plan-health roll-up — `completenessPct` is a
      stored seed value, not computed from a per-field manifest
- [~] Provenance — every built section shows a provenance line; it's static text, not
      a structured source/last-verified/verify-action model
- [x] Sections: all thirteen build on the shared scaffold with real data and a real
      summary visual — Overview, Household, Cashflow, Balance, Allocation, Goals,
      Retirement, Tax, Protection, Estate, Documents, Activity, Compliance. Business
      is correctly hidden (no seeded household has an entity, D-003). See Phase 5

## Phase 3 — Assistant (M3)

- [x] Chat dock: collapse/expand, context chip wired to the section nav, composer,
      message thread — now streaming real answers from `/api/chat`
- [x] Streaming, stop/retry/copy — NDJSON stream off the Messages API, abortable
      mid-answer, retry drops the failed turn before re-asking
- [~] Tool runtime and tool-call renderers — six tools, all backed by real rows
      (`lib/ai/tools.ts`), each announced in the dock as it runs with what it touched.
      Three of CLAUDE.md §9's six families are deliberately unbuilt (market.*,
      calendar.*/task.*, report.*) because no data exists behind them — see D-017 and
      Settings → AI, which lists them as unbuilt rather than stubbing them
- [x] Confirmation flow for writes — `propose_*` tools never execute; the dock renders
      a confirmation card and the advisor's click calls the same `dismissInsight`
      server action the plan sections use
- [~] Guardrails — `lib/ai/guardrails.ts` checks every finished reply for security
      recommendations, authoritative tax/legal claims, figures asserted with no tool
      call, citations that resolve to no record, and answers that quote figures while
      citing nothing. Flagged in the dock and the audit log. Exercised by hand against
      both trip and look-alike cases; no automated test suite exists yet (no test
      runner in the repo at all — see Phase 0)
- [x] Citations — every record a tool returns carries a ref the reply must cite, which
      the dock renders as a link naming that record (D-018). Replaces prose attribution,
      which is what let two activity rows get merged into one wrong citation
- [x] Append-only interaction log — `AiConversation` / `AiMessage` / `AiToolCall`
      record the tools called and the ids of records touched (§9 rule 5, §11), never
      the tool result payloads
- [~] Conversation history / threading — every turn is persisted and a thread keeps
      one `conversationId` for its lifetime, but there's no UI to reopen a past
      conversation and the dock's thread is lost on reload
- [ ] Token and cost telemetry

## Phase 4 — Today (M4)

- [x] Prompt zone: greeting, composer, and three suggestion chips computed from the
      book (CLAUDE.md §5) — the household whose review is next, the most overdue one,
      the count that has actually drifted past the alert threshold, falling back to the
      weakest plan. A chip never names a household the advisor doesn't have
- [x] Submit streams into the dock without navigating (shared Zustand store)
- [ ] Widget grid drag/resize/add/remove/reset — grid is fixed, not customizable
- [ ] Per-user per-breakpoint layout persistence
- [ ] Org default layout + admin widget locking
- [x] Widgets: Agenda, Tasks, Alerts, Pipeline, Markets, Book, Reviews, Milestones,
      Recents, Notes — all ten present. Agenda/Tasks/Alerts/Pipeline/Book/Reviews are
      real queries against seeded data; Markets/Milestones/Recents/Notes are honestly
      static (no backing model — see notes above and each widget's file)
- [~] Widget error isolation and skeleton loading — there is now a route-level
      boundary: `(app)/error.tsx` keeps a failed page inside the shell with a retry,
      `(app)/not-found.tsx` does the same for a missing record, and `(app)/loading.tsx`
      provides the skeleton *and* the Suspense boundary that makes the error boundary
      work at all (without it a throwing server component took down the whole document,
      nav and chat dock included — verified against an unreachable database). Per-widget
      isolation is still not done: Today fetches all ten widgets' data in one block, so
      one failing query fails the page. That needs each widget to fetch its own data,
      which is the TanStack Query refactor CLAUDE.md §5 describes, not a wrapper.
      Trade-off worth knowing: streaming the shell means a missing record now returns
      200 with the not-found UI rather than a 404 — see `(app)/loading.tsx`

## Phase 5 — Remaining plan sections (M5)

- [x] Cashflow — real Sankey (`components/charts/cashflow-sankey.tsx`), data-driven
      node heights and ribbon geometry, not hardcoded pixels
- [x] Goals — bubble quadrant (the primary visual the design settled on over the
      stacked-area alternative), area-proportional bubble sizing, real Goal records
- [~] Household (members) — a members roster is real and data-backed; the force-free
      relationship graph from `design/HouseholdMembers.dc.html` isn't built (see that
      section's page for the exact gap)
- [x] Retirement — Monte Carlo-style fan chart (`lib/calc/retirement.ts`, a pure
      seeded simulation, not hardcoded percentile bands) + plan assumptions table
- [x] Tax — stepped bracket bar (`lib/calc/tax.ts`; bracket structure is illustrative
      per the design's own disclaimer, position within it is computed from real
      taxable income) + tax position table
- [x] Protection — diverging gap bars (`components/charts/protection-gap-bars.tsx`),
      one row per coverage type, real per-household gap magnitudes and directions
- [x] Estate — directed asset → beneficiary flow diagram
      (`components/charts/estate-flow-diagram.tsx`), missing-designation flag drives
      dashed-red vs. solid-pine per row
- [-] Business — correctly hidden; no seeded household has a business entity (D-003)
- [x] Documents (household-scoped vault) — status breakdown bar + document table,
      distinct from the top-level all-households Documents route (see Phase 7,
      now also real)
- [x] Activity (unified timeline) — real timeline of Meeting/Document/TaskCompleted/
      Note/PlanChange events, colored by kind; the plan-change *diff* itself is still
      seed text (see the `PlanSnapshot` item below), only the timeline is real
- [x] Compliance (household-scoped: IPS, suitability, attestations) — built directly
      without a design pass, per the same user direction as Schedule/Tasks/Intake/
      Settings (D-016). Two new models (`ComplianceItem`, `ReviewAttestation`) backing
      eight required items and a review history per household, all anchored to fields
      the rest of the app already renders — review cadence, next review date,
      last-contact gap, client-since year — so the section can't contradict the Clients
      list or the top-level Compliance queue. Summary visual is a review-attestation
      timeline (`components/charts/attestation-timeline.tsx`), which distinguishes a
      review held but never attested from one not yet due and one missed outright. Its
      completeness ring is computed from the record rather than seeded like the other
      eleven
- [ ] `PlanSnapshot` versioning + "what changed since last review" diff — the Overview
      page's "what changed" list and the Activity timeline's plan-change entries are
      static/seeded, not a real diff engine

## Phase 6 — Charts and reports

- [~] Chart primitives — twelve real, data-driven chart components exist
      (`components/charts/`: cashflow-sankey, net-worth-waterfall, allocation-rings,
      goals-bubble-quadrant, book-treemap, revenue-concentration-curve,
      pipeline-funnel, retirement-fan-chart, tax-bracket-bar, protection-gap-bars,
      estate-flow-diagram, attestation-timeline); no shared axis/legend/tooltip/
      table-toggle abstraction yet — each chart implements its own axes inline.
      Compliance is the one section that ships its chart's table equivalent
      (CLAUDE.md §8) as a real Review history table rather than a toggle
- [ ] Full catalog from CLAUDE.md §8 documented in Storybook (no Storybook at all yet)
- [ ] Accessibility pass
- [~] Reports — a real, per-household preview (executive summary text and net-worth
      composition chart both computed from that household's actual data, switchable
      via the household list in the settings panel) matching
      `design/Reports.dc.html`'s preview panel; the section-picker, branding, and
      delivery controls are real-looking but explicitly disabled — this pass makes
      no PDF-rendering or email-delivery decision, so there's nothing to wire them
      to yet; picking one is a follow-up, not done here
- [ ] Report authoring (drag-reorder sections, save drafts, PDF export)
- [ ] Scheduled report delivery

## Phase 7 — Pipeline and operations (M6)

- [x] Prospects: pipeline board, stage aging, conversion metrics, funnel — real, from
      10 seeded prospects; funnel is a proportionally-narrowing shape computed from
      actual counts, not hardcoded, and avg-days-in-stage is a real average
- [x] Documents (top-level, firm-wide) — real table across every household's
      Document rows, search + household + status filters all in the URL
      (`components/ui/filter-select.tsx`), per `design/Documents.dc.html`
- [x] Intake — built directly, no design pass (third of the five, after Schedule
      and Tasks). A real 5-step interactive wizard (`components/intake/
      intake-wizard.tsx`: Start → Household basics → Members → Goals → Review,
      real step state, real add/remove rows) that starts from an actual
      Agreement-stage Prospect when one exists (pre-fills name and advisor from
      real seeded data) or from scratch. "Create household" is deliberately
      disabled — a Household record has ~70 fields spanning every plan section,
      which this wizard never collects and which a brand-new household
      wouldn't have data for yet; wiring a real create means deciding a
      freshly-onboarded household's starting state across every section, a
      product decision this pass doesn't make. Explained in the component's own
      comment and in the disabled button's tooltip, not silently disabled.
- [x] Schedule — built directly without a design pass, per explicit user direction
      (offered a design-first pass matching D-013's process; user chose to build
      page by page instead, reviewing each before the next). A real month
      calendar (`components/schedule/month-calendar.tsx`, computed grid/dots,
      not hand-laid-out) plus an Overdue and month-grouped Upcoming reviews list,
      built from each household's real `nextReviewDate`/`reviewStatus`/
      `planHealthPct` — the same fields Today's Agenda widget already uses.
      Honestly scoped: there's no generic Meeting entity yet (CLAUDE.md §10),
      so this is "upcoming household reviews," not an arbitrary event calendar
      — stated in the page's own footer note, not implied otherwise
- [x] Tasks — built directly, no design pass (same user direction as Schedule).
      A real inbox of every open Insight across every household, grouped by
      household, with search + household + section filters (URL-driven, same
      `FilterSelect` pattern as Documents). Reuses `InsightCard`/`dismissInsight`
      unmodified — Dismiss/Accept here calls the exact same server action the
      household detail pages use, so it's a real, persisting mutation, not a
      "not wired up" placeholder. Honestly scoped: no due-date field exists on
      Insight, so "due and overdue" (CLAUDE.md §5) isn't literal — stated in the
      page's own header comment
- [x] Settings — built directly, no design pass (same user direction as Schedule and
      Tasks). Six subpages behind the same left-rail pattern household detail uses:
      Organization, Team, Appearance, Integrations, AI, Billing. Split deliberately by
      what's real. Team, the book rollup, and billing seat/household counts are live
      queries — advisor capacity, AUM per advisor, and prospect counts all come from the
      same records the Insights page reads, so the two can't disagree. Appearance is
      fully functional (see Phase 1). Everything else is shown unset with disabled
      controls rather than filled with an invented firm name, CRD number, plan price, or
      sync timestamp, and each page's footer note says exactly which of its rows are real
      and what's missing behind the rest. Integrations additionally names what's standing
      in for each unbuilt feed today, so it's clear which screens read fixtures
- [~] Markets — full layout from `design/Markets.dc.html` now built: Equities and
      Rates & economy snapshot grids, a computed Treasury yield curve
      (`components/charts/yield-curve.tsx`), a Tax & regulatory calendar, Watchlist,
      Movers, a candlestick chart (`components/charts/candlestick-chart.tsx`), and
      News. Index levels/rates/prices/news are still an honest static snapshot — no
      market-data integration (Phase 8) exists — but two things are real: the
      Watchlist's tickers and "held by" counts come from every household's actual
      `topHoldingTicker`, and the RMD calendar item's household count is a real
      query against member ages (`>= 73`), not the design's example "3 households"
      (0 in this seed data — no household happens to have a member that old).
      Sparkline/yield-curve/candlestick geometry is computed from value/OHLC
      arrays via new `components/charts/sparkline.tsx`, not hand-placed SVG pixel
      points — this session hit two real bugs earlier from exactly that pattern
      (Cashflow ribbons, Prospects funnel), so new chart code avoids it from the
      start

**Insights** (practice analytics, not phase-mapped in the original plan — see
`design/README.md`'s note on this) — **done with real data**, not stubbed: book
composition treemap, revenue concentration curve (a genuine Lorenz curve computed from
each household's AUM × expense ratio, not a hardcoded "top 10% = X%"), segment mix, and
advisor capacity, all queried live from the 10 seeded households.

## Phase 8 — Integrations

- [ ] Integration adapter interface + sandbox mock provider
- [ ] Custodian positions and balances sync
- [ ] Market data provider
- [ ] Calendar (Google, Microsoft)
- [ ] Email logging
- [ ] Document e-signature
- [~] Sync health surface in Settings with per-feed last-success and error detail — the
      panel exists on Settings → Integrations, honestly empty ("Not running", "No syncs
      yet"); there's nothing to report until an adapter exists

## Phase 9 — Compliance and hardening (M7)

- [~] Top-level Compliance page (org-wide) — real review-status table sorted by
      last-contact across all 10 households, sourced from live data, not the design's
      static mock. Not built: an actual audit log (no AuditEvent model exists — see
      Phase 0), retention config, encryption, masked PII, or the Compliance role
- [ ] Audit log viewer with export
- [ ] Retention policy configuration and enforcement job
- [ ] Field-level encryption for SSN, account numbers, DOB
- [ ] Masked-by-default PII with logged reveal
- [ ] Compliance role: read-everything, write-attestations-only
- [ ] Penetration test and remediation
- [ ] SOC 2 evidence collection started

## Phase 10 — Beta (M8)

- [ ] Onboarding and data import for a new firm
- [ ] In-app help and empty-state guidance
- [ ] Performance budget: household list < 1.5s to interactive on 400 rows
- [ ] Error monitoring and uptime alerting
- [ ] 5 design partners live, weekly feedback loop

---

## Open questions

| # | Question | Owner | Status |
| --- | --- | --- | --- |
| Q1 | Is "plan health" a single score or a set of flags? A score invites gaming and false precision. | Product | Open |
| Q2 | Do we support multi-currency households in v1, or USD only with the schema ready? | Eng | Open |
| Q3 | Does Intake need a client-facing portal, or is a share link enough for beta? | Product | Open |
| Q4 | Which custodian do we integrate first, based on design-partner mix? | Partnerships | Open |
| Q5 | Should AI drafts sent to clients require a second-person review in team plans? | Compliance | Open |

---

## Risks

| Risk | Impact | Mitigation |
| --- | --- | --- |
| AI produces a figure not backed by a record | Trust collapse, potential regulatory issue | Tool-only grounding, citation required, guardrail tests in CI |
| Custodian integrations slip | M8 blocked | Ship with CSV import and the mock provider; integrations are additive |
| Section scaffold too rigid for Tax and Estate | Rework late in Phase 5 | Prototype both against the scaffold during Phase 2 |
| Scope creep into portfolio accounting | Timeline doubles | Explicitly out of scope; positions are read-only |
| Chart catalog becomes a bespoke-component sprawl | Maintenance drag | Uniform prop shape, Storybook coverage required before merge |

---

## Changelog

- **2026-09-19** — A batch of small items, no new dependencies. Clients search now
  matches member names as well as household names (members are modelled, and the
  assistant's own search tool already matched them — the list was the odd one out);
  email and tag search stay unbuilt because neither is modelled. Export became the one
  real bulk action — it writes a CSV of the selected rows with dollars as plain numbers
  and ISO dates, since a spreadsheet is not a screen, with `toDollars` added to
  lib/format as the only new place cents stop being cents. Verified by capturing the
  actual blob in a browser: correct headers, only the selected rows, figures matching
  the table. Keyboard focus is now visible: one token-coloured `:focus-visible` ring,
  keyboard-only, inverted on pine fills — verified by tabbing for real, since
  programmatic focus doesn't trigger it. And the workspace column finally has error,
  not-found, and loading boundaries. That last one was the interesting find: `error.tsx`
  alone did nothing, because a server component that throws while the shell is still
  rendering takes down the whole document — proven by pointing the app at an unreachable
  database, which rendered Next's bare error page with no nav and no chat dock. Adding
  `loading.tsx` creates the Suspense boundary that lets the shell stream first; the same
  failure now renders inside the shell with a retry and a digest. The cost, deliberately
  taken: once the shell has streamed the status is already sent, so a missing household
  returns 200 with the not-found UI instead of a 404. Also made the skeleton's pulse the
  only ambient animation in the app, and disabled it under `prefers-reduced-motion`
  (CLAUDE.md §7).

- **2026-09-19** — Synced PROGRESS.md against the code and picked up two small spec'd
  items. The sync corrected seven stale claims: dark-mode tokens described as unswitchable
  (Settings → Appearance switches them), the `components/ui` inventory (RouteEmptyState
  and FilterSelect were missing), the Prisma model list (six models behind), `AuditEvent`
  as wholly unbuilt (the assistant's `AiToolCall` log exists and is append-only, the
  general one doesn't), "route stubs" for pages long since built for real, "6 of 14
  sections" when all thirteen are done, and both the tRPC and Radix notes, which named
  the chat dock as their likely first consumer — it arrived and needed neither, since a
  streaming route handler and an inline confirmation card cover it. Conversation
  threading moved to partial: turns persist, but nothing reopens a past conversation.
  Then built the two items: the "Analyze this cohort" handoff (CLAUDE.md §6), which hands
  the assistant the household ids the table is showing rather than a URL it can't
  interpret — verified by clicking it on the At risk view and asking which needs
  attention first, which answered about exactly those three with correct figures per
  household — and Today's suggestion chips, now computed from the book (§5) instead of
  the design's hardcoded examples, which named a household and a meeting that don't
  exist in this data.

- **2026-09-19** — Fixed the citation-attribution problem the first live run surfaced.
  The cause was structural, not a bad turn of phrase: tool payloads gave the model no way
  to point at a record, so attributing anything meant describing it, and two activity rows
  that both mentioned goals blurred into one citation. Every record a tool returns now
  carries a ref (`lib/ai/refs.ts`), the prompt requires citing the ref and forbids
  identifying a record by restating its date or title, the dock renders each ref as a link
  carrying that record's own label, and the route checks the answer against the refs
  actually issued — invented refs are flagged `unknown_citation`, a figure-quoting answer
  that cites nothing is flagged `uncited_answer` (D-018). Re-ran the exact question that
  failed: it now cites the Aug 9 note for the goals request and the Sep 2 meeting
  separately for the cash conversation, each chip linking to the right row, with every ref
  resolving. Guardrail rules verified directly against cited / invented-ref / uncited /
  clean cases. Also rendered the light markdown the model writes (bold, dash bullets),
  which was showing as literal asterisks in the dock now that answers are longer — same
  file, and leaving raw `**` in shipped UI beside the new citation chips wasn't defensible.
  What this does not do: it makes wrong attribution visible and checkable, not impossible
  — a real ref attached to the wrong claim still reads as fine to the string checks, and
  only the chip's own label gives it away.

- **2026-09-19** — Switched the assistant to `claude-sonnet-5` (from Opus) at the user's
  direction, to keep per-conversation cost down on a workload that is short,
  heavily tool-mediated answers over a ten-household book; one constant in
  `lib/ai/model.ts`, which Settings → AI reads rather than restates. Then ran the
  assistant against the real API for the first time, which is the only way the earlier
  stand-in verification could be confirmed. It held up: asked which households are past
  their review date, it called three tools and returned figures that match the database
  exactly (Alvarez overdue since Aug 1 / 61 days, Kim Aug 6 / 45 days, cash 9.2% against
  a 3.7% target, retirement 66% funded, the $451,417 LTC gap, 3 open tasks). Asked for
  an S&P 500 close it said plainly that it has no market data tool rather than inventing
  one, then answered the half it could ground — §9 rule 1 working as written. One real
  bug surfaced only under the real model: confirming a dismissal from the chat dock wrote
  to the database but left the card on screen, because the proposal revalidated
  `/clients/<id>` while the advisor was standing on `/clients/<id>/allocation`. Now
  revalidates the actual pathname, the way `InsightCard` already did. One soft spot worth
  knowing: in a long answer it attributed a goals request to the Sep 2 check-in note when
  the note is dated Aug 9 — both records are real and both mention goals, so it reads as
  loose attribution rather than fabrication, and nothing in the guardrails catches that
  class of error.

- **2026-09-19** — Wired the chat dock to a real model (Phase 3). The route
  (`app/api/chat/route.ts`) streams the Messages API as NDJSON, runs the tool loop
  server-side, and writes an append-only `AiConversation`/`AiMessage`/`AiToolCall` log of
  the tools called and the ids of records touched. Six tools, all over real rows; the
  three §9 families with no data behind them (market, calendar/task, report) are listed
  as unbuilt on Settings → AI rather than stubbed with fixtures, because a tool that
  invents its answer is worse than a missing one (D-017). Grounding is enforced in three
  places instead of one: the system prompt, tool payloads that carry lib/format-rendered
  strings plus a link so the model quotes rather than computes, and a post-hoc guardrail
  check that flags the reply in the dock. Writes go through confirmation cards — the
  `propose_*` tools never execute, and confirming a dismissal calls the same server
  action the plan sections use. Settings → AI now reads the real tool registry, model id,
  and log counts, so it can't drift from what's wired. No API key exists in this sandbox,
  so the whole path was verified against a local stand-in that speaks the real streaming
  protocol: multi-turn tool loop (search → section → proposal), audit rows written with
  the right record ids, the confirmation card actually dismissing a real insight and the
  page updating, and the guardrail banner firing on a deliberately rule-breaking reply
  while staying quiet on look-alike phrasing. That run caught a real bug — text written
  before and after a tool call arrived concatenated ("record.Cash is 6.1%"), now
  separated by a paragraph break. Without a key the dock says so plainly and the rest of
  the app is untouched, which was also tested.

- **2026-09-19** — Built the household-scoped Compliance section, the last of the
  fourteen and the last page with no design mockup (D-016). Needed a data model first:
  `ComplianceItem` (eight required items per household — IPS, suitability assessment,
  risk questionnaire, advisory agreement, fee acknowledgment, Form ADV, Form CRS,
  privacy notice) and `ReviewAttestation` (the review history), plus a
  `complianceCompletenessPct` computed from those rows rather than seeded like its
  eleven siblings. Everything is anchored to fields the app already renders — cadence
  from segment, dates from `nextReviewDate`, staleness from `lastContactDays`, history
  bounded by `clientSinceYear` — so Compliance can't tell a different story than the
  Clients list or the firm-wide review queue. Summary visual is a review-attestation
  timeline rather than another status bar: it distinguishes a review held but never
  attested (brass ring) from one not yet due (dashed) and one missed outright (red),
  which a status bar collapses. Seeding surfaced two real bugs, both found by auditing
  the generated rows rather than by looking at the page: items showed "effective Apr 3 /
  next due Apr 3" because the date format omitted the year, and an overdue household got
  an IPS whose next-due date fell *before* its own effective date. Fixed by carrying the
  year and by deriving each recurring item's due date from the first review after it took
  effect — plus one rule that flags anything past due, so an overdue household can no
  longer show a page of "in force". Verified: an automated audit of all 80 seeded items
  found no ordering or stale-status contradictions, all 10 household compliance pages
  return 200, insight cards appear on exactly the 6 households whose records warrant
  one, and two pages were screenshot-reviewed (table wrapping fixed as a result). Also
  added Compliance to the Reports page's section-completeness list, which had enumerated
  eleven sections and would otherwise have named the wrong weakest section.

- **2026-09-19** — Built Settings (fourth of the five no-design pages). Six subpages —
  Organization, Team, Appearance, Integrations, AI, Billing — on the same left-rail
  pattern as household detail, with a shared `SettingsPage`/`Panel`/`Row` scaffold so
  they read as one surface. The split that mattered was real vs. unset: Team, the book
  rollup, and billing seat counts are live queries (verified against the DB — Dana 6 of
  12 households / $55.87M, Maya 4 of 10 / $9.09M, $64.96M total AUM, 40 open insights),
  while the firm profile, retention, integrations, AI, and billing rows are shown
  explicitly unset with disabled controls, because an invented firm name, CRD number,
  plan price, or last-sync timestamp is exactly the kind of detail a reader takes at
  face value. Appearance is the exception to the usual "not wired up" pattern: theme
  (light/dark/system) and density (comfortable/compact) genuinely work and persist,
  since neither needs a server. Getting there required one cross-cutting fix — every
  mark on a pine/brass/info fill was hardcoded white, which fails AA on the dark theme's
  lightened accents, so all 16 of those call sites now go through a new `--on-accent`
  token, and the two white toggle knobs through `--surface` (D-015). Verified in headless Chrome, not just by reading the code: stored preferences
  survive a reload via the inline boot script (no flash of light palette), clicking
  Light/Comfortable updates both `<html>` and localStorage, measured table row height
  moves 41px → 33px between modes, and dark mode was eyeballed on Clients and Settings.
  Also verified: clean typecheck + lint, and 200s across all six subpages. Household-scoped
  Compliance is now the only no-design page left.

- **2026-09-19** — Verified the repo runs from a clean checkout on a new machine and
  documented what that takes. Dependencies were installed and matched the lockfile, but
  the Prisma client was still the ungenerated stub and there was no `.env` or `dev.db` —
  both gitignored, and no file in the repo said they were needed, so `pnpm dev` would
  have failed at the first Prisma query. Added `packages/db/.env.example` and a "Local
  setup" section above. Confirmed working: `prisma generate`, `db:push`, `db:seed` (10
  households, 10 prospects), clean `pnpm typecheck` and `pnpm lint`, successful
  `pnpm build` (27 routes), and a dev-server smoke test returning 200 with real seeded
  data on every route — all 13 household sections plus every top-level surface — with no
  errors in the server log. One env file (`packages/db/.env`) is enough for both
  packages; Prisma Client loads it from the schema directory.

- **2026-09-17** — Repo documentation established. CLAUDE.md, PROGRESS.md, DECISIONS.md
  created. Phase plan drafted through private beta. No code yet.
- **2026-09-17** — Design pass: 22 screens mocked and published (shell, Today, Clients ×2,
  chat dock, 13 of 14 household sections, Prospects, Documents, Reports, Compliance,
  Markets, Insights). Source files in `design/`, live canvas linked from
  `design/README.md`. See "Design reference" above. Household-scoped Compliance is the
  one PlanSection still undesigned; several top-level surfaces (Schedule, Tasks, Intake,
  Settings, auth) have no screens yet. No code written — this is visual spec only. See
  D-013 in DECISIONS.md.
- **2026-09-18** — First implementation pass. Next.js/TypeScript monorepo scaffolded
  (`apps/web`, `packages/db`), Tailwind theme mapped to CLAUDE.md §7 tokens, Prisma
  schema + seed script with 10 households and 10 prospects (SQLite locally — see
  D-014 and the "Implementation notes" section above for why, and for the tRPC/Radix/
  auth deviations). Built and passing typecheck + lint: the app shell, Today (real
  widgets where data supports it), Clients (real URL-driven sort, search, saved views,
  bulk-select UI), 6 of 14 household-detail sections with real charts (Overview,
  Household, Cashflow, Balance, Allocation, Goals — the other 7 are empty-state stubs
  per D-003, Business correctly hidden), Prospects, and Insights and the top-level
  Compliance page (both real, not stubbed). Fixed two real bugs caught by actually
  running the app rather than just typechecking it: a UTC-vs-local-timezone date
  off-by-one, and a waterfall-derivation formula that could produce negative
  "spending" values — see "Implementation notes" above for both. Design-quality
  review agents run per finished area; see DECISIONS.md for anything they turned up
  worth recording. Not started: auth, the assistant's model wiring, RBAC, audit log,
  integrations, Storybook, CI.
- **2026-09-18** — Fix pass on findings from six background design-quality review
  agents (one per finished area: Clients list, household detail, Today, Prospects,
  Insights, shell/chat). All files renamed from PascalCase to kebab-case
  (`components/**`), the systemic violation of CLAUDE.md §12; verified with a clean
  `tsc --noEmit` across both packages after the rename. Concrete bugs fixed:
  Clients-list sort highlight was hardcoded to the AUM column only (now dynamic per
  column); the drift-alert threshold was `>= 3` instead of `>= 4`, disagreeing with
  the page's own "At risk" filter; Cash/Drift cells used inline `.toFixed(1)` instead
  of `lib/format/percent.ts`; the Advisor column showed the full name instead of the
  design's abbreviated form (new `lib/format/name.ts`); the now-fully-dead
  `advisorInitials` field was removed from `ClientRow`. The pipeline funnel's
  "stalled" highlight was hardcoded to the Proposal stage — now derived from whether
  any prospect actually flagged `stalled` is sitting in that stage. Compliance's "Due
  within 30 days" stat checked `lastContactDays >= 30` (contact recency, not review
  timing) — now checks `daysUntil(nextReviewDate) <= 30` on non-overdue households;
  verified against real seed data (2, not 3). The book treemap's money labels used
  inline `${...toFixed(2)}M` instead of `formatMoney(..., { compact: true })`.
  Insights' advisor-capacity bar showed "of 8" with no backing figure — added a real
  `capacityTarget` field to the `Advisor` model (seeded 12 for Dana, 10 for Maya) so
  the number is grounded rather than invented; required a `db push --force-reset` +
  re-seed of the local SQLite database. `dismissInsight`'s `revalidatePath` only
  covered the Overview route, leaving a dismissed insight looking still-active on the
  section page it actually appeared on — it now also revalidates the calling page's
  own pathname. Legend/status dots in `allocation-rings.tsx` and `insights/page.tsx`
  used `rounded-cell` (square) instead of `rounded-full` (circle), breaking the
  carried-over convention that legend dots are circles. The nav rail's `mb-[22px]`
  arbitrary value is now a named `nav-logo` spacing token in `tailwind.config.ts`,
  preserving the exact value from `design/*.dc.html` without leaving a magic number
  in component code. Composer placeholders now use a true ellipsis character. Added
  D-014 to DECISIONS.md, formalizing the SQLite/no-tRPC/no-Radix/no-auth deviations
  that were previously only described in this file's "Implementation notes" section.
  Re-verified with a clean typecheck + lint and a dev-server smoke test (curl against
  `/clients`, `/prospects`, `/compliance`, `/insights`, `/today`, all 200; spot-checked
  rendered HTML for the advisor abbreviation, the corrected capacity figure, and the
  corrected "Due within 30 days" count).
- **2026-09-18** — Two more chart bugs, caught by user report and confirmed by
  inspecting real rendered SVG paths, not just re-reading the code (the code looked
  structurally right on a first read; only the actual coordinates gave it away).
  Cashflow's Sankey ribbons were rendering as flat rectangular blocks instead of
  tapered ribbons: the Taxes/Net-income and Spending/Savings node pairs were stacked
  with zero gap, so a connecting ribbon's bezier curve had identical y-coordinates on
  both sides and drew a straight line — added a `NODE_GAP` between stacked nodes in
  `cashflow-sankey.tsx`, matching the gap `design/Cashflow.dc.html` uses for the same
  reason. The Prospects funnel had two independent bugs compounding into "mostly
  square, only the brass segment tapers": `pipeline-funnel.tsx`'s boundary-height
  array duplicated the first stage's height as an artificial "before" boundary,
  which made the first segment always render flat regardless of data, and the
  segment fill color was hardcoded to index 2 (`i === 2`) instead of driven by
  `stalledStages` like the label text already was — fixed both, and rebalanced the
  seed prospects' stage distribution (`packages/db/prisma/seed.ts`) from 3/3/2/2 to
  a strictly-decreasing 4/3/2/1 so the funnel actually narrows at every stage
  instead of plateauing on coincidentally-equal adjacent counts. Verified by parsing
  the real rendered polygon points and ribbon path coordinates via curl, not just by
  eyeballing the math. A full design-vs-implementation audit of every built page
  against its `design/*.dc.html` reference found two more real gaps: Today's Alerts
  widget still used a `driftPct >= 3` threshold instead of the `>= 4` every other
  surface was corrected to in the prior pass (fixed), and every household-detail
  section's completeness ring except Overview was a hardcoded constant reused
  identically across every household (`completenessPct={100}` on four pages,
  `{90}` on one) rather than computed per household — flagged as systemic, fixed
  below alongside the new sections that needed the same per-section completeness
  concept anyway.
- **2026-09-18** — Built the six remaining household-detail sections (Retirement,
  Tax, Protection, Estate, household-scoped Documents, Activity), bringing 12 of
  13 sections to real data (only Compliance remains a stub — no design reference
  exists for it per D-013, so it needs a design pass before it can be built).
  Extended `packages/db/prisma/schema.prisma` with the new models (`Policy`,
  `EstateAsset`, `EstateDocument`, `Document`, `ActivityEvent`) and per-section
  `Household` fields, and extended `deriveFinancials()` in `seed.ts` to generate
  all of it — internally consistent per household (e.g. a household's real
  taxable income drives which of the six illustrative tax brackets it falls in,
  not a hardcoded bracket). Two new pure `lib/calc` modules do the real math
  rather than storing pre-derived output that could drift out of sync:
  `lib/calc/retirement.ts` runs a simplified seeded Monte Carlo projection (many
  simulated paths, percentile bands at checkpoint ages, a real success-probability
  count) for the Retirement fan chart, and `lib/calc/tax.ts` computes bracket
  position from taxable income against a shared illustrative bracket table (the
  design's own copy disclaims these as illustrative, not real IRS figures, so the
  code carries the same disclaimer rather than presenting them as authoritative
  per CLAUDE.md §13). Four new chart components follow CLAUDE.md §8's catalog
  entries for these sections: `retirement-fan-chart.tsx`, `tax-bracket-bar.tsx`,
  `protection-gap-bars.tsx` (diverging bars), `estate-flow-diagram.tsx` (directed
  flow); Activity's timeline and Documents' vault-status bar are simple enough to
  not need a dedicated chart component per the catalog. Also fixed, while wiring
  per-section completeness for the new sections, the exact hardcoded-completeness
  bug the audit above flagged: `household/cashflow/balance/allocation/goals`
  pages now read `household.<section>CompletenessPct` (seeded to vary per
  household) instead of a literal constant. Added `formatTime()` to
  `lib/format/date.ts` for the one place in the app that needed to show a real
  time-of-day (activity timestamps), rather than formatting it inline. Verified:
  clean typecheck + lint on both packages; every one of the 10×6 = 60
  household/section combinations smoke-tested via curl (all 200, after
  discovering — twice — that a long-running `next dev` process holds a stale
  Prisma Client in memory across a `db push`/reseed and needs a restart, not a
  code fix, to pick up new fields); spot-checked real rendered output for
  completeness-ring variation, tax-bracket variation, and the two "sometimes
  present" conditional branches (LTC "no policy on file", Estate "no beneficiary
  on file") actually firing for some households and not others rather than being
  always-on or always-off. Three design-quality review agents dispatched, one per
  natural grouping (Retirement+Tax, Protection+Estate, Documents+Activity);
  findings recorded in a follow-up entry once they report back.
- **2026-09-18** — Fix pass on the three review agents' findings from the entry
  above. Real, non-cosmetic bug: `monthlySpendingNeedCents` was derived from
  *current* income-relative spending, which clustered every household under a
  ~2% implied retirement withdrawal rate regardless of net worth — running the
  actual `projectRetirement()` simulation against all 10 households' real
  stored inputs confirmed every single one returned exactly 100% success
  probability, making the section structurally unable to ever demonstrate the
  risk detection the product thesis is about. Fixed by deriving retirement
  spending need from portfolio size at a randomized 3.5%–7% withdrawal rate
  instead; re-verified via the same method and now sees a realistic 64%–100%
  spread across the 10 households. Protection and Estate never generated any
  Insight rows for either section (the derivation code computed obviously
  insight-worthy conditions — a deeply negative life-insurance gap, a missing
  estate beneficiary, no LTC policy on file — without ever pushing them);
  added conditional insight generation for both, plus Documents and Activity
  for the same reason once the pattern was in front of me. Document vault rows
  mostly showed vague placeholder text ("Recent", "On file", "Due soon")
  instead of the real formatted dates the schema comment promised and the
  design shows for every row; now computed from real offsets. Two smaller
  regressions: the household Documents page's legend dots used `rounded-cell`
  (square) instead of the `rounded-full` convention this session established
  everywhere else, and it had no empty-state guard for a household with zero
  documents (currently unreachable — every seeded household gets a fixed
  document set — but latent, and inconsistent with the sibling Activity page's
  guard). An exact-zero Protection coverage gap rendered green ("overinsured")
  instead of the neutral "At target" treatment the null case already got.
  Also cleaned up four orphaned `next dev` processes the three review agents
  had each started on their own without cleanup; a reminder for future review
  prompts to be explicit about killing any dev server they start themselves.
  Re-verified with a clean typecheck + lint on both packages and a full
  10-household × 12-route smoke test (all 200/308) after every fix.
- **2026-09-18** — Two more user-reported layout bugs, both real and both found
  by inspecting actual rendered pixel geometry rather than re-reading the
  math. Prospects' funnel captions were positioned with a `10fr 1fr 10fr 1fr
  10fr 1fr 10fr` CSS grid that only approximates the SVG polygons' real
  200:20 segment:gap ratio (and had no margin column for the SVG's own 40px
  right margin) — close enough to look right at a glance, visibly drifting
  out of alignment toward the right edge. Rewrote `pipeline-funnel.tsx` so
  the caption row is an absolutely-positioned overlay computed from the exact
  same `xs`/`SEG_WIDTH`/`GAP` numbers the polygons use, expressed as
  percentages of the shared viewBox width — the two are now driven by one
  source of truth instead of two independently-tuned unit systems, so they
  can't drift regardless of container width. Today's Pipeline widget had a
  hardcoded `h-16` (64px) flex container sized to fit only the tallest bar
  (44px) — it never accounted for the count-number and stage-label text
  stacked around that bar within the same column (~88px total for the
  tallest column). Flex containers don't clip overflow, so once a real
  household's data made Inquiry the tallest stage (after the earlier funnel
  fix's 4/3/2/1 rebalance), that column's count number overflowed upward
  past the container's 64px boundary and collided with the "Pipeline" title
  above it. Fixed by dropping the hardcoded height entirely — a flex row's
  cross-size is naturally the tallest item's real height, which can never
  be wrong by construction. Verified both by parsing the actual rendered
  percentage/pixel values via curl, not by eyeballing the CSS.
- **2026-09-18** — Built the top-level Documents and Reports pages, the two
  remaining top-level routes with a design reference (`design/Documents.dc.html`,
  `design/Reports.dc.html`); Intake/Schedule/Tasks stay stubs since no design
  mockup for any of them exists (see the Phase 7 note above — same reasoning
  as household-scoped Compliance). Documents is a real, firm-wide table over
  every household's `Document` row (the same model the household-scoped vault
  already used), with search/household/status filters all reflected in the
  URL via a new generic `components/ui/filter-select.tsx` client component.
  Reports renders a real per-household preview — executive summary paragraph
  and net-worth-composition chart both composed from that household's actual
  data (return, cash drift, weakest section by completeness), switchable via
  a real household list in the settings panel — rather than either faking the
  design's full drag-reorder/PDF-export/email-delivery authoring flow (no
  rendering or delivery infrastructure has been chosen yet) or blocking the
  whole page on that decision; the picker/branding/delivery controls render
  real-looking but are explicitly disabled, the same pattern already used for
  other not-yet-wired affordances elsewhere in the app. Caught and fixed one
  wording bug of my own before it shipped: the executive-summary template
  literally hardcoded the word "documents" after the weakest-section name,
  copied from the design's one specific Ramirez example ("estate documents")
  — read correctly for that one household and nonsensically for the other
  nine ("cashflow documents", "balance documents"); generalized to name the
  section directly. Verified: clean typecheck + lint, full smoke test across
  every route including all 10 households on both new pages, and the
  executive-summary text spot-checked across several households to confirm
  it reads coherently and varies with real data rather than being a template
  with one number swapped in.
- **2026-09-18** — The Prospects funnel caption fix from the previous entry
  turned out to be incomplete — user report: "Inquiry" still wasn't sitting
  under its own block. Root cause was different from (and more subtle than)
  the grid-ratio mismatch already fixed: `pipeline-funnel.tsx`'s `<svg>` has
  `viewBox="0 0 900 200"` but renders at a fluid width with a *fixed* 160px
  height, so its rendered aspect ratio essentially never matches the
  viewBox's 4.5:1. The browser's default `preserveAspectRatio="xMidYMid
  meet"` handles that mismatch by scaling the content to fit and *centering*
  it — inset from the container's edges with empty space on the sides. The
  caption row below is a plain CSS-percentage overlay that assumes the SVG
  content spans edge to edge with no inset, so the two were drifting apart
  by exactly that pillarboxing amount — invisible from reading the JSX,
  only visible by actually reasoning about SVG scaling semantics. Fixed by
  adding `preserveAspectRatio="none"`, which stretches the SVG to fill its
  box exactly in both dimensions with no inset, matching the caption
  overlay's assumption. Also moved the stage-to-stage conversion percentage
  from a narrow column in the gap between segments to directly above each
  destination stage's own caption (per user request), dropping the now-
  unused separate gap-column elements; the first stage (Inquiry) correctly
  shows no percentage since nothing converts into the top of the funnel.
  Verified via curl: `preserveAspectRatio="none"` present in the rendered
  markup, and each stage's conversion percentage (75%/67%/50% for the
  current seed data) sits in the same caption block as that stage's name,
  not a separate positioned element.
- **2026-09-18** — Built out the Markets page to match `design/Markets.dc.html`'s
  full layout: Equities and Rates & economy snapshot grids (with sparklines),
  a Treasury yield curve, a tax & regulatory calendar, Watchlist, Movers, a
  30-day candlestick chart, and News — the previous version only had the
  4-card equities snapshot and an explicit "not connected" note. Added three
  new chart primitives (`sparkline.tsx`, `yield-curve.tsx`,
  `candlestick-chart.tsx`), each computing its geometry from a real value/OHLC
  array rather than hand-placed SVG pixel points, learning directly from the
  two funnel/sankey bugs fixed earlier this session that were both caused by
  exactly that anti-pattern. Two pieces of the page are grounded in real seed
  data instead of copied from the design: the Watchlist's ticker list and
  "held by N households" counts come from every household's actual
  `topHoldingTicker`/`topHoldingName` (dropping the design's one ticker, QUIL,
  that isn't any household's holding), and the RMD calendar item's household
  count is a real query against member ages (`>= 73`) rather than the
  design's illustrative "3 households" — it's honestly 0 in this seed data,
  since no seeded member happens to be that old, rather than a fabricated
  non-zero figure copied for looks. Movers is computed by sorting the real
  watchlist by change%, not a separately hardcoded list — it correctly shows
  only 1 loser (not padded to match the design's 2) since only one watchlist
  ticker is actually down. Index levels, rates, prices, and news remain an
  honest static snapshot with no live feed, same as before, now said
  explicitly in an updated footer note. Verified: clean typecheck + lint, a
  full route smoke test, and curl-inspection confirming the watchlist tickers
  match real household holdings, the RMD badge reflects the real query
  result, and the candlestick's household attribution lists the actual
  households holding that ticker.
- **2026-09-18** — Offered a `/design` pass for the five remaining no-mockup
  pages (Intake, Schedule, Tasks, Settings, household-scoped Compliance) to
  keep D-013's design-first process intact; user chose instead to build them
  directly, one page at a time, reviewing each before the next starts. Built
  Schedule first: a real month calendar grid (new
  `components/schedule/month-calendar.tsx`) plus Overdue and month-grouped
  Upcoming sections, all driven by each household's real `nextReviewDate` /
  `reviewStatus` / `planHealthPct` — the same fields Today's Agenda widget
  already uses, so the two surfaces can't disagree about what's coming up.
  Deliberately scoped honestly rather than implying more than the data
  supports: there's no generic Meeting entity yet, so this reads as
  "upcoming household reviews" (stated in the page's own footer), not an
  arbitrary calendar. Verified: clean typecheck + lint, month navigation
  smoke-tested across 8 months including a year boundary (Dec→Jan), and
  curl-inspection confirming a household appears as both a calendar dot and
  a list row only in the month its real review date falls in (checked against
  both the current month and a month with an overdue household). Paused here
  per the user's page-by-page review request — Tasks/Intake/Settings/
  household-Compliance not started yet.
- **2026-09-18** — Built Tasks (second of the five no-design pages, after
  user review of Schedule). An inbox of every open Insight across every
  household — the same real signal Today's Tasks widget already stood in
  with — grouped by household, with search/household/section filters, all
  URL-driven via the same `FilterSelect` component Documents/Tasks now
  share. Reuses `InsightCard`/`dismissInsight` unmodified rather than
  building a parallel "not wired up" version: Dismiss/Accept on this page
  is a real, persisting server-action call, identical to the one on every
  household detail page. Caught and fixed one filter bug before it shipped
  (found by reasoning through the query, not by testing): the Section
  dropdown's own option list was being computed from the already-filtered
  insight set, so picking a section would collapse the dropdown down to
  just that one option on the next render — split into an independent
  unfiltered query so both filters always show their full option list
  regardless of what the other one is set to. Verified: clean typecheck +
  lint, header count (38 open across 10 households) matches a direct DB
  query exactly, and curl-inspection confirming the Section dropdown still
  lists all sections (not just the selected one) after filtering.
- **2026-09-18** — User feedback on Tasks: "why do all tasks only have
  Dismiss or Accept? some tasks need to be handled in more detail." Checked
  `actions.ts` and confirmed something already true but easy to miss:
  Accept and Dismiss have called the identical `dismissInsight` mutation
  since the day this pattern was built (documented in that file's own
  comment) — there's no follow-up-task model to make Accept do anything
  more, so the two buttons were never actually different. Rather than build
  a real task-management system to fix that (out of scope for this pass),
  added the thing that actually answers "handle it in more detail": a
  "View in {section}" link on every `InsightCard` that deep-links to the
  real section the insight is about (Allocation, Goals, Protection, ...) —
  real navigation to where the underlying record can actually be reviewed
  or changed, per CLAUDE.md's `nav.*` tool concept. `InsightCardData` grew
  two optional fields (`householdId`, `section`); Overview and Tasks (the
  two places that show insights from more than one section at a time) now
  pass them through — a small sed-assisted update across all 11 section
  pages that build a `household.insights.map(...)` call for `PlanSection`,
  since each already had `i.householdId`/`i.section` on hand from its own
  query. Section-scoped pages (Goals, Allocation, ...) correctly suppress
  the link for insights already native to that exact page — comparing the
  computed section URL against the current pathname — since it would just
  point at the page you're already on. Verified: clean typecheck + lint
  across all touched files, full smoke test (every household × every
  section, all 200/308), and curl-inspection confirming Overview shows
  "View in {section}" for all 4 of one household's cross-section insights
  while the Goals page shows none for that same household's Goals-sourced
  insight (correctly suppressed as redundant).
- **2026-09-18** — Built Intake (third of the five no-design pages). A real
  5-step interactive wizard — Start, Household basics, Members, Goals,
  Review — with genuine client-side step state and add/remove rows, not a
  static mockup, since this is application code rather than a design
  artifact. The Start step lists real Agreement-stage Prospects (currently
  just Ferreira Household) and pre-fills the household name and advisor
  from that real record when picked, or lets the flow start from scratch.
  "Create household" on the Review step is deliberately disabled with an
  explained tooltip: a Household record has roughly 70 fields spanning
  every plan section (cashflow, balance, allocation, retirement, tax, ...),
  none of which this wizard collects, and a freshly-onboarded household
  wouldn't have plan data yet regardless — wiring a real create means
  deciding what that starting state looks like across every section, a
  product decision out of scope here. Cleaned up one inconsistency before
  it shipped: initially used a `<style jsx>` block for form-control
  styling, the only place in the codebase that would have used styled-jsx
  instead of the Tailwind utilities used everywhere else — replaced with a
  shared class-name constant. Verified: clean typecheck + lint, full route
  smoke test, and curl-inspection confirming Ferreira Household's real
  advisor (Dana Whitfield) and estimated value render correctly in the
  Start step.
