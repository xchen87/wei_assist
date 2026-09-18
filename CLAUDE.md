# CLAUDE.md

Context file for AI coding agents working in this repository. Read this first, then
`PROGRESS.md` for what is built and what is next, and `DECISIONS.md` for why things are
the way they are.

---

## 1. What this is

**Meridian** is an AI-native workspace for independent financial advisors and small RIA
teams. It consolidates the work an advisor does across five or six disconnected tools
(CRM, planning software, portfolio reporting, calendar, market data, compliance notes)
into one interface, with an assistant that can read and act on that data.

The product thesis: an advisor should be able to ask "what changed in the Ramirez
household since our last review, and what should I raise on Thursday?" and get a grounded
answer with links into the underlying records, instead of opening four tabs.

### What it is not

- Not a custodian, broker, or execution venue. Meridian reads positions, it does not trade.
- Not a robo-advisor. The advisor is the decision maker; the AI drafts and surfaces.
- Not a general chatbot with a finance skin. Every AI response is grounded in the
  household record or in a cited market source. Ungrounded speculation is a bug.

### Primary user and jobs

A solo-to-ten-person advisory practice, 60–400 households, $50M–$800M AUM.

| Job | Where it lives |
| --- | --- |
| Start the day, see what needs attention | Today |
| Prepare for a client meeting | Clients → household → Overview + Activity |
| Answer an ad-hoc client question | Chat dock, anywhere |
| Move a prospect toward a signed agreement | Prospects, Intake |
| Keep plans current and complete | Household sections, completeness indicators |
| Survive an audit | Compliance, Documents, audit log |

---

## 2. Stack

| Layer | Choice |
| --- | --- |
| Framework | Next.js (App Router), React, TypeScript strict |
| Styling | Tailwind + CSS custom properties for tokens |
| Primitives | Radix UI, wrapped in local `components/ui` |
| Tables | TanStack Table (headless) + virtualized rows |
| Charts | Visx for custom/financial visuals, Recharts for simple series |
| Dashboard grid | react-grid-layout |
| Server state | TanStack Query |
| Client state | Zustand, one store per domain slice |
| Forms | React Hook Form + Zod, schema shared with API |
| API | tRPC (internal), REST under `/api/v1` (integrations) |
| Database | PostgreSQL + Prisma |
| Jobs | BullMQ + Redis (market sync, nightly recalcs, digests) |
| AI | Anthropic Messages API, streaming, tool-calling |
| Auth | Auth.js, org-scoped sessions, RBAC |
| Tests | Vitest (unit), Playwright (e2e), Storybook (visual) |

See `DECISIONS.md` D-001 through D-006 for the reasoning.

---

## 3. Repo layout

```
apps/
  web/                    Next.js app
    app/
      (auth)/             sign-in, MFA, org selection
      (app)/
        today/            default landing surface
        clients/          household list + household detail sections
        prospects/        pipeline
        intake/           new client onboarding flow
        markets/          watchlists, movers, research
        schedule/         calendar
        tasks/            task inbox
        documents/        document vault
        reports/          report builder + delivery
        compliance/       reviews, attestations, audit trail
        insights/         book-of-business analytics
        settings/         org, team, integrations, AI, billing
    components/
      ui/                 primitives (Button, Field, Sheet, Table...)
      charts/             the visualization catalog (see §8)
      widgets/            Today dashboard widgets
      chat/               chat dock, message parts, tool-call renderers
      plan/               shared household-section scaffolding
    lib/
      ai/                 prompt assembly, tool defs, guardrails
      calc/               pure financial math, no I/O
      format/             money, percent, date formatters
packages/
  db/                     Prisma schema, migrations, seeds
  schemas/                Zod schemas shared client/server
  integrations/           custodian, market data, calendar, email adapters
docs/
  CLAUDE.md PROGRESS.md DECISIONS.md
```

Rules: `lib/calc` is pure and unit-tested and must never import React or Prisma. Anything
that touches money goes through `lib/format` so rounding and locale behave consistently.

---

## 4. The application shell

Three columns, persistent across every route.

```
┌──────────┬────────────────────────────────────┬──────────────────┐
│ NAV      │ WORKSPACE                          │ CHAT             │
│ 72px     │ fluid, min 560px                   │ 380px            │
│ ←→ 232px │                                    │ ←→ 560px         │
│          │  route content renders here        │  collapsible     │
│          │                                    │                  │
│ settings │                                    │  composer        │
└──────────┴────────────────────────────────────┴──────────────────┘
```

**Left — Nav.** Icon rail by default, expands to labels on hover or pin. Grouped, with
group labels visible only in the expanded state. Settings pinned to the bottom, separated
by a rule. Every top-level entry is a single word.

| Group | Entries |
| --- | --- |
| Work | Today, Schedule, Tasks |
| Relationships | Clients, Prospects, Intake |
| Intelligence | Markets, Insights |
| Records | Documents, Reports, Compliance |
| — | Settings |

Naming notes: "Clients" covers what a CRM would call customer profiles; the unit inside is
the **household**, not the individual. "Intake" is the guided onboarding flow, distinct
from "Prospects" which is the pipeline before a signed agreement. "Insights" is
practice-level analytics (revenue concentration, segment drift, capacity), not
client-level.

**Center — Workspace.** Owns the route. Never renders a second scroll container inside
another scroll container; the page scrolls, not the shell.

**Right — Chat.** Always available, context-aware. It receives the current route's context
descriptor (household id, selected section, current filter set) and shows a chip naming
what it is looking at, which the user can clear. Collapses to a rail button; state persists
per user. On viewports under 1280px it becomes an overlay sheet; under 900px the nav
collapses to a bottom bar and chat becomes a full-height sheet.

---

## 5. Today (default surface after login)

Two zones, stacked.

**Zone 1 — Prompt.** A centered greeting, the user's name, and a full-width composer with
suggestion chips. This is deliberately close to a familiar assistant home: the composer is
the widest, highest-contrast element on the page, and the first focusable element. Chips
are generated from real state, not hardcoded (e.g. "Prep me for the 2pm with the Whitakers",
"Which households drifted past 5% this week?", "Draft the Q3 note for retirees").

Submitting a prompt does not navigate away. It opens the chat dock and streams there, so
the dashboard stays visible.

**Zone 2 — Widget grid.** A 12-column responsive grid, user-configurable: drag to move,
drag edge to resize, add from a widget catalog, remove, and reset to the org default.
Layout persists per user per breakpoint (`DashboardLayout` table). Admins can publish a
default layout for the org and optionally lock specific widgets.

Ship with these widgets:

| Widget | Content |
| --- | --- |
| Agenda | Today and tomorrow's meetings, with a prep-readiness dot per meeting |
| Tasks | Due and overdue, grouped by household |
| Alerts | Drift breaches, cash thresholds, RMD deadlines, held-away changes, doc expirations |
| Pipeline | Prospect funnel with counts and stalled-stage flags |
| Markets | Watchlist snapshot, index sparklines, one headline mover |
| Book | AUM, net flows MTD, revenue run rate, sparkline |
| Reviews | Households past their review cadence |
| Milestones | Birthdays, anniversaries, age-based triggers (59½, 65, 73) |
| Recents | Recently opened households |
| Notes | Freeform scratchpad |

Widget contract: each exports `{ id, title, defaultSize, minSize, Component, Settings? }`
and fetches its own data through TanStack Query with a shared `staleTime`. A widget that
fails renders an inline error card with a retry, and never takes down the grid.

---

## 6. Clients

### List view

One household per row, one key stat per column. Virtualized table, 200+ rows without
pagination.

Default columns: Household, Segment, AUM, Net worth, Held-away, YTD return, Cash %,
Drift, Plan health, Last contact, Next review, Advisor.

Column behavior: user can show/hide, reorder, sort, and pin the Household column. All
numeric columns use tabular figures and right alignment. Gains and losses carry a sign and
a color, never color alone.

**Search** is a single input matching household name, member names, email, and tags.

**Filters** are chips above the table, combinable, reflected in the URL so a view is
shareable:

- Region / office
- Household income band
- Investable assets band
- Net worth band
- Segment or service tier
- Goals present (retirement, education, business exit, legacy, property)
- Life stage (accumulating, pre-retirement, retired, wealth transfer)
- Risk profile and current drift
- Plan completeness (`< 60%`, `60–89%`, `90%+`)
- Last contact (> 30 / 60 / 90 days)
- Review status (due, overdue, scheduled)
- Account types held (401k, IRA, Roth, taxable, trust, 529, annuity)
- Tags (freeform)
- Assigned advisor

Saved views persist filter set, column config, and sort. Ship three: "My book",
"Needs review", "At risk".

Selecting rows enables bulk actions: assign, tag, add to campaign, schedule review, export.

An "Analyze" affordance sends the current filtered set to chat as context, so the user can
ask questions about the visible cohort rather than the whole book.

### Household detail

Left-hand section nav inside the workspace column, one subpage per section. **Every
household has the same section list in the same order**, whether or not it has data. An
empty section shows what is missing and offers to start it; it is never hidden.

| # | Section | Contents |
| --- | --- | --- |
| 1 | Overview | Rollup dashboard, plan health, open items, what changed since last visit |
| 2 | Household | Members, relationships, dependents, contact info, KYC, employment |
| 3 | Cashflow | Income sources, expenses, savings rate, surplus/deficit by year |
| 4 | Balance | Assets, liabilities, net worth history and composition |
| 5 | Allocation | Target vs actual, drift, holdings, concentration, fees |
| 6 | Goals | Funded status per goal, priority, tradeoffs |
| 7 | Retirement | Projection, Monte Carlo, withdrawal sequencing, Social Security timing |
| 8 | Tax | Bracket position, realized/unrealized gains, loss harvesting, Roth conversion room, withdrawal order |
| 9 | Protection | Life, disability, LTC, P&C, liability gaps |
| 10 | Estate | Documents in force, beneficiaries, titling, trusts, transfer projection |
| 11 | Business | Entity, valuation, succession, key-person (hidden only if household has no business entity) |
| 12 | Documents | Household-scoped vault |
| 13 | Activity | Meetings, notes, emails, tasks, plan-change timeline |
| 14 | Compliance | IPS, suitability, disclosures, review attestations |

**Shared section scaffold.** Every section is built from the same `PlanSection` component
so the pages feel identical in structure:

1. Header: title, completeness ring, last-updated with source, section actions.
2. Summary: the section's one primary visual (see §8).
3. Detail: editable tables or forms, inline validation.
4. Insights: AI-generated observations for this section, each with a citation to the
   underlying record and an accept/dismiss control. Dismissals are remembered.
5. Provenance: every figure shows where it came from (custodian feed, manual entry,
   client-provided) and when it was last verified.

Completeness is computed from a per-section required-field manifest in
`packages/schemas/completeness.ts`. Plan health on the list view is the weighted roll-up of
section completeness plus open alerts.

---

## 7. Design system

The look should read as a professional instrument: dense, quiet, legible at a glance,
with color reserved for meaning. Avoid the generic dashboard-kit look of identical rounded
cards with soft grey shadows.

### Tokens

```css
--ink:        #14181D;   /* primary text */
--ink-muted:  #5C6672;   /* secondary text */
--paper:      #FBFBF9;   /* app background, faintly warm */
--surface:    #FFFFFF;
--rule:       #E4E5E0;   /* hairlines; structure comes from rules, not shadows */
--pine:       #12503F;   /* primary action */
--brass:      #B8892B;   /* accent, attention, "needs review" */
--gain:       #1F7A4D;
--loss:       #B03A2B;
--info:       #2A5F8F;
```

Dark mode inverts to `--ink-base: #0E1114`, `--surface: #171B1F`, with pine and brass
lightened for contrast. Both themes must pass WCAG AA on text and non-text UI.

### Type

- **Public Sans** for all interface and data. Tabular lining figures enabled globally on
  numeric cells (`font-variant-numeric: tabular-nums`).
- **Source Serif 4** only for long-form narrative: plan summaries, AI-drafted client
  letters, report body copy. Nowhere else.
- Scale: 12 / 13 / 14 / 16 / 20 / 26 / 34. Body 14/1.5. Serif body 16/1.65.
- Sentence case everywhere. No tracked-out all-caps labels.

### Layout and surfaces

- Structure comes from hairline rules and spacing, not from wrapping everything in a card.
  Cards are for things that genuinely detach: dashboard widgets, modals, popovers.
- 4px spacing base. Two density modes, comfortable (40px rows) and compact (32px rows),
  set per user in Settings.
- Border radius: 6px on controls, 10px on cards, 0 on table cells. One radius everywhere
  is a tell.
- Motion answers user actions only: expansion, drawer open, value change. No entrance
  animations on page sections. Respect `prefers-reduced-motion`.

### Copy

Plain verbs, active voice, sentence case. Name things the way an advisor would say them,
not the way the schema does. Buttons state the outcome ("Save allocation", not "Submit").
Empty states say what is missing and give one action. Errors say what happened and what to
do; they do not apologize.

---

## 8. Visualization catalog

Structured data gets a graphical representation by default. Every chart is interactive
(hover detail, click to filter or drill through), keyboard navigable, and has a table
equivalent behind a toggle for accessibility and export.

| Data | Visual | Where |
| --- | --- | --- |
| Income → taxes → spending → savings | Sankey | Cashflow |
| Net worth composition | Treemap, drill into account → holding | Balance |
| Net worth change over a period | Waterfall | Balance |
| Target vs actual allocation | Paired ring with drift bars | Allocation |
| Holdings by sector/geography/style | Sunburst | Allocation |
| Concentration risk | Bar with threshold marker | Allocation |
| Retirement outcome distribution | Monte Carlo fan chart, percentile bands | Retirement |
| Goal funding over time | Stacked area with goal markers | Goals |
| Goal priority vs funding | Bubble quadrant | Goals |
| Bracket position and conversion room | Stepped bracket bar with fill | Tax |
| Family and entity relationships | Force-free node graph | Household, Estate |
| Asset titling and beneficiary flow | Directed flow diagram | Estate |
| Coverage vs need | Diverging gap bars | Protection |
| Prospect pipeline | Funnel with stage aging | Prospects |
| Book composition | Treemap + revenue concentration curve | Insights |
| Plan progress across sections | Segmented completeness ring | Overview |
| Market series | Sparkline, candlestick on demand | Markets |

Charts live in `components/charts` with a uniform prop shape (`data`, `onSelect`,
`height`, `density`) and pull color exclusively from tokens.

---

## 9. AI layer

### Model use

Streaming responses via the Anthropic Messages API with tool-calling. Tools are the only
way the model touches data; there is no free-form SQL.

Tool families in `lib/ai/tools`:

- `household.*` — search, get section, get holdings, get activity
- `market.*` — quote, series, news (cited)
- `calendar.*` and `task.*` — read, propose, create on confirmation
- `doc.*` — retrieve, summarize, extract fields
- `report.*` — assemble a draft
- `nav.*` — navigate the workspace to a record

### Grounding rules

1. Any claim about a client's finances must come from a tool result and carry a link to
   the record. If tools return nothing, say so; never fill the gap from priors.
2. Figures are rendered from the tool payload through `lib/format`, not restated by the
   model as prose numbers where a component can render them.
3. Anything with an external effect (send, schedule, file, change a plan value) is a
   proposal the user confirms in the UI. The model never commits silently.
4. No recommendation of specific securities to buy or sell, no tax or legal advice
   presented as authoritative. The assistant drafts and surfaces; the advisor decides.
   This is enforced in the system prompt and checked in `lib/ai/guardrails`.
5. Every AI interaction is logged with the tools called and the records touched.

### Context assembly

`lib/ai/context.ts` builds a compact descriptor from the current route: entity type, id, a
summary block, and the visible filter set. Never dump full household records into the
prompt; the model fetches what it needs through tools.

---

## 10. Data model (core entities)

`Org` → `User` → `Household` is the ownership spine. Everything client-facing is scoped to
a household.

```
Org, User, Role, AuditEvent
Household ── Member ── Relationship
Household ── Account ── Position ── Security
Household ── Goal, Liability, IncomeSource, Expense, Policy, EstateDocument, BusinessEntity
Household ── Note, Meeting, Task, Document, Alert, PlanSnapshot
Prospect ── PipelineStage, IntakeSubmission
Watchlist ── WatchItem
DashboardLayout, SavedView, AiConversation, AiMessage, AiToolCall
```

Notes: monetary values are integer minor units with an explicit currency, never floats.
Plan values are versioned via `PlanSnapshot` so "what changed since last review" is a diff,
not a guess. Soft-delete client data; audit events are append-only.

---

## 11. Security and compliance constraints

These are not negotiable and apply to every PR.

- Row-level scoping by org on every query. No cross-org reads, ever.
- Encrypt at rest; field-level encryption for SSN, account numbers, and dates of birth.
  Mask by default in the UI, reveal requires an explicit action that is logged.
- Append-only audit log for every read and write of client data, including AI tool calls.
- Role-based access: Admin, Advisor, Associate, Compliance, ReadOnly. Compliance can read
  everything and write nothing except attestations.
- Communications retention: advisor-client messages and AI drafts sent to clients are
  retained per SEC 17a-4 expectations. Retention configuration lives in Settings.
- No client PII in logs, analytics, or error reports. Scrub in the logger, not at the call
  site.
- Third-party model calls must be covered by the org's disclosed vendor list; this is
  surfaced in Settings → AI.

---

## 12. Conventions

- TypeScript strict. No `any` in committed code; use `unknown` and narrow.
- Zod schema is the single source of truth for a shape; infer types from it.
- Server components by default; `"use client"` only where interaction requires it.
- Components: named exports, one component per file, colocated tests.
- Files: `kebab-case.tsx`. Components: `PascalCase`. Hooks: `useThing`.
- Financial math lives in `lib/calc`, pure, with unit tests covering edge cases
  (zero balances, negative net worth, partial years, mid-year contributions).
- Never format money or dates inline. Use `lib/format`.
- Commits: Conventional Commits. Branches: `feat/`, `fix/`, `chore/`.
- A PR that adds a household section must also add its completeness manifest, its summary
  visual, and its empty state.

---

## 13. Working agreements for AI agents

- Update `PROGRESS.md` when you complete, start, or reprioritize work. Check the box, move
  the item, and add a dated line to the changelog at the bottom.
- Record any non-obvious choice in `DECISIONS.md` using the existing template. If you
  reverse a prior decision, supersede it rather than editing it in place.
- Do not introduce a new dependency without a decision entry covering what it replaces.
- Do not invent financial figures, benchmark returns, tax thresholds, or regulatory rules
  in seed data or tests. Use clearly fictional values and mark them as fixtures.
- Prefer extending the shared `PlanSection` scaffold over building a bespoke section page.
  If a section genuinely cannot fit the scaffold, that is a decision entry.
- When a task is ambiguous, write the question into `PROGRESS.md` under Open Questions and
  implement the smaller, reversible option.
