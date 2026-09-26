# PROGRESS.md

Development plan and status for Meridian. Update this file whenever work starts,
completes, or gets reprioritized. Add a dated line to the changelog at the bottom.

**Status key:** `[ ]` not started · `[~]` in progress · `[x]` done · `[!]` blocked · `[-]` dropped

**Last updated:** 2026-09-25
**Current phase:** M-assist — the advisor's assistant (see below), inserted ahead of Phase 8.
Phases 1, 2, 4, 5 and 7 are built; Phase 3's assistant is wired (streaming, grounded tools,
confirmation cards, guardrails, interaction log) with history and telemetry still open;
M-demo is done. Markets stays `[~]` until a market-data adapter exists (Phase 8).

---

## Milestones

| M | Name | Definition of done | Target |
| --- | --- | --- | --- |
| M1 | Shell walking skeleton | Three-column shell, nav, routing, auth, empty routes render | Week 3 |
| M2 | Household spine | Seeded data, Clients list with filters, 4 core sections | Week 7 |
| M3 | Assistant online | Chat dock streaming, 6 grounded tools, confirmation flow | Week 10 |
| M4 | Today configurable | Prompt zone + widget grid with persistence | Week 12 |
| M5 | Plan complete | All 14 household sections at parity with the scaffold | Week 17 |
| M6 | Pipeline to plan | Prospects + Intake producing a real household — **intake half done 2026-09-20** | Week 20 |
| M7 | Audit ready | Compliance, audit log, retention, RBAC verified | Week 23 |
| M8 | Private beta | 5 design-partner firms on real data | Week 26 |
| **M-demo** | **Advisor discovery demo** | **A demo that runs end to end for real advisors: a prospect becomes a household, the book is broad enough for impact analysis to look like a book, and a watched indicator change finds the households it affects and says why** | **done 2026-09-20** |
| **M-assist** | **The advisor's assistant** | **The assistant tells the advisor what needs attention today and why, every line cited, and can put a meeting or a task on their real calendar and worklist after they confirm it — started 2026-09-25** | **before Phase 8** |

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

Checks: `pnpm typecheck`, `pnpm lint`, `pnpm test`, `pnpm build`.

## M-demo — advisor discovery demo

Inserted ahead of M6–M8 on 2026-09-20. The goal is a demo shown to practising
advisors to gauge interest and collect feedback — not a beta. No real
custodian, market, or client data; no auth, RBAC, encryption, or retention,
because none of it changes an advisor's reaction in a 30-minute call. What
does change it is a complete workflow and something their current stack
can't do.

Four items, in build order. The first is small and unblocks a complete
narrative; the second raises the quality of everything the third produces.

1. ~~**Intake creates a real household.**~~ **Done 2026-09-20.** The wizard
   now creates a Household, its Members (with dates of birth and risk
   profiles), its Goals (named but uncosted), an opening activity event and
   a three-item worklist, then converts the prospect and lands on the new
   record. Sections it doesn't collect start empty: a household created this
   morning reads 18% complete with $0 AUM, which is the demo beat — "here's
   day one, here's the work" — rather than a seeded number that reads
   finished.
2. ~~**Demo data breadth.**~~ **Done 2026-09-20.** Forty households across
   four advisors, $232M AUM, built from seven archetypes so the book varies
   along the axes the impact rules will test: ages clustered on 59/65/73,
   cash from 1.8% to 14%, drift from 0.5% to 7.3% (16 households at or past
   the 4% alert line), mortgages on all forty from $59K to $1.29M, taxable
   income $49K to $350K. Uncovered a real ceiling on the way (D-021).
3. ~~**The signals engine**~~ **Done 2026-09-20** (D-022). Eight watched
   indicators across Rates, Market, Tax and Policy, all simulated fixtures
   and labelled as such. Moving one runs all forty households through eight
   rules in `lib/calc/signals.ts` and raises alerts that each say why that
   household matched, in its own figures. Reachable three ways: a "Run now"
   control on `/signals`, `pnpm --filter @meridian/web signals <key>
   <value>` for cron, and the assistant via `get_open_alerts`. Alerts
   surface on `/signals`, on the affected household's Overview, and in
   Today's Alerts widget.
4. ~~**Demo reset.**~~ **Done 2026-09-20.** `pnpm demo:reset` reseeds the
   book, clears the runtime artifacts a demo leaves behind — chat
   transcripts, dragged widget layouts, acknowledged alerts, dismissed
   insights — and re-runs the two opening scenarios, printing what the
   demo now contains. Verified by dirtying all of it and resetting.

### Running the demo

```bash
pnpm demo:reset   # 40 households, 16 prospects, 8 indicators, 42 open alerts,
                  # and two saved scenarios on the Whitakers for Compare
pnpm dev
```

A sequence that shows the whole loop in about ten minutes:

1. **Today** — the morning view. The suggestion chips are computed from
   this book, so they name real households and real counts. Drag a widget
   to show the grid is theirs.
2. **Clients** — forty households. Pick the "At risk" view, then
   **Analyze**: it hands that cohort to the assistant. Ask *"which of these
   needs attention first, and why?"* — every figure in the answer is cited
   to a record you can click.
3. **Prospects → Intake** — take an Agreement-stage prospect through the
   seven steps. Enter two or three holdings in one account and a property:
   the allocation builds as you type. At Review, take the household in as
   typed — it lands with a working Allocation section and an honest
   worklist — or press **Analyse and draft a plan first** and let the
   assistant read the whole picture. It asks two or three questions before
   it writes; answer them and the report it produces is filed against the
   household in Activity.
4. **Planning → Compare** — on the Whitakers, the two saved scenarios. The
   first is a like-for-like plan change; the second reads −31 points and
   the page shows that the plan change is worth *none* of it and the
   return assumption is worth all of it. Then **Review this change** and
   ask it a follow-up.
5. **Signals** — the part nothing else on their desk does. Run a scenario
   live: policy rate to 5.0, or the estate threshold to $7M. Watch it name
   the affected households and say why each one matched, in that
   household's own figures.
6. **Ask the assistant** *"which households did that touch, and what should
   I do about the worst one?"* — it reads the alerts, ranks them, and cites
   each one.
6. **Open a flagged household** — the alert and its reason are on the
   Overview, with a link into the section to act on.
7. **Settings → AI** — if the conversation turns to trust: the grounding
   rules, what enforces each one, the tool list, and the interaction log.

Two things to say out loud, because an advisor will ask: the indicator
feed is simulated and labelled as such everywhere, and every suggested
action is a prompt to review with the household or their tax or legal
adviser, never advice from the product.

**The credibility constraint that shapes item 3:** this audience spots an
invented tax threshold instantly, and CLAUDE.md §13 forbids inventing one.
So the indicator feed is explicitly a *simulated* feed with labelled
fixtures, and suggested actions are phrased as prompts to review, never as
advice. The mechanism is the product; the feed plugs in at Phase 8. The
existing guardrails already enforce the same line in chat, which is itself
worth demoing.

---

## M-assist — the advisor's assistant

Inserted ahead of Phase 8 on 2026-09-25 (D-034). The idea: the app already knows
what needs attention (reviews overdue, alerts, milestones, stalled prospects) and
already proposes-then-confirms through the chat dock. What it can't do is the
second half of the loop — turn a surfaced item into a meeting or a task — because
until now there was nowhere to write one. Schedule was a view over each
household's `nextReviewDate` and Tasks a view over open Insights, and both pages
said so in their own footers.

Built before Phase 8 for the same reason M-demo went ahead of M6–M8: the
mechanism is what an advisor reacts to, and a mock calendar changes nothing
about that reaction. It also gives the Phase 8 adapter interface a real
consumer to be designed against.

Two constraints from the start. Client-facing outreach stays a draft in the
demo — sending is an outward effect and brings CLAUDE.md §11's retention rules
with it. And anything inferred about the advisor's habits may only soften or
reorder a suggestion, never suppress a compliance or drift alert.

1. ~~**Meeting and Task are real rows.**~~ **Done 2026-09-25.** Two models on the
   `Advisor` → `Household` / `Prospect` spine (`packages/db/prisma/schema.prisma`),
   seeded to agree with the rest of the record: a household whose review is
   "scheduled" has that review on the calendar; one whose review is "due" or
   "overdue" has nothing booked, which is the gap item 2 should find. Open task
   rows per household equal the stored `openTasksCount`; the held check-in and
   the completed task each mirror the ActivityEvent the timeline already shows.
   Each advisor keeps deliberately regular hours in the seed so item 4 has
   something true to find. Intake now re-points a converted prospect's meetings
   and tasks at the new household before deleting the prospect. 88 meetings and
   144 tasks after `pnpm demo:reset`.
2. ~~**Schedule and Tasks read the rows.**~~ **Done 2026-09-25.** Schedule is a
   calendar of Meeting rows: month grid with a dot per meeting (readiness tone
   for household meetings, pine for prospects, muted once held), the next
   fourteen days as a list grouped by day, an advisor filter, and a "Reviews
   with nothing booked" list — households due or overdue with no future review
   on the calendar, which is the gap item 4 will offer to fill. Today's Agenda
   reads the signed-in advisor's meetings for today and tomorrow and names the
   next one when both days are clear. Tasks has two views: Task rows (grouped
   by household or prospect, overdue first, filters for household, advisor, due
   window and done) and the old Insights inbox, kept separate because an
   insight is a prompt, not a to-do. Marking a task done is a server action
   that also writes the TaskCompleted entry on the household's timeline;
   reopening leaves that entry, since the log is append-only.
   `Household.openTasksCount` is gone — the Activity page counts Task rows.
   Due-date and day arithmetic lives in `lib/agenda.ts`, pure and tested on
   UTC day boundaries. Both pages' "honestly scoped" footers are replaced by
   the one limitation that remains: no external calendar is connected.
3. ~~**The daily brief.**~~ **Done 2026-09-26** (D-035). `lib/calc/brief.ts` ranks
   what needs the advisor's attention: meetings today the plan is not ready for,
   open signals, reviews owed with nothing booked, tasks past due, stalled
   prospects, drift no signal already covers, and age triggers or birthdays close
   enough to act on — each line with its reason in the record's own figures, a
   next step phrased as a prompt to review, a link, and the record it came from.
   Pure and tested (eleven cases, including the band overlaps). One loader,
   `lib/brief.ts`, feeds both the new Brief widget on Today (top six, "N more",
   "Walk me through it" sends the brief question to the dock) and the assistant's
   `get_agenda` tool, so the widget and the answer are one ranking. Today's first
   suggestion chip is now that question. The Milestones widget became real on the
   way: birthdays and 59½ / 65 / 73 triggers from members' dates of birth, via the
   same `upcomingMilestones`, replacing the "upcoming age-based milestone" stub.
4. ~~**Propose a meeting, propose a task.**~~ **Done 2026-09-26** (D-036). Three
   tools: `find_meeting_slots` reads the advisor's busy time through the new
   calendar adapter interface (`lib/integrations`, mock provider over Meeting
   rows — the first Phase 8 adapter, built for its first consumer) and runs the
   pure slot search in `lib/calc/slots.ts`; `propose_meeting` and `propose_task`
   return cards and write nothing. The cards are editable — time, length, place,
   the drafted note; title, due date, priority — and confirming calls a server
   action that validates the edited fields again through the same rules the tool
   used (`lib/ai/proposals.ts`), checks for a clash, writes the row with source
   "assistant", files the outreach note on the household's timeline as a draft
   marked not sent, and logs the confirmation on the conversation. Declining
   writes nothing. Settings → Integrations reads the adapter's status live.
5. [ ] **Advisor patterns, explicit and inspectable.** Review cadence they
   actually keep per segment, alert rules they act on versus dismiss, the days
   and hours they book. Stored as rows, shown in Settings → AI beside the
   interaction log, editable, and used only to order and phrase suggestions.

---

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
- **Forty households, four advisors.** Eight carry figures verbatim from
  `design/Clients.dc.html`; Delacroix–Wu and Bergström were added to reach
  ten; the other thirty are generated deterministically from the household
  name by `generateHouseholds()` in `packages/db/prisma/seed.ts`, so
  reseeding never reshuffles the demo. Section-level detail still comes
  from the pure `deriveFinancials()` function, so waterfalls reconcile and
  allocations sum to 100% without thirty sets of hand-typed figures that
  could quietly contradict each other. The thirty are built from seven
  archetypes — accumulator, family, pre-retiree, new retiree, RMD-age,
  business owner, wealth transfer — for one reason: the signals engine's
  impact rules need households that genuinely differ along the axes those
  rules test, and forty lookalikes would let every rule match everyone or
  no one. Threshold ages (59, 65, 73) are assigned by position rather than
  chance, because leaving them to `rand()` left one member at 59 and none
  at 65, which would make an age-triggered rule look broken when the data
  was thin. Firm totals: $232M AUM, 93 members, 16 prospects.
- **Money is `bigint` in the database layer, `number` at the boundary
  (D-023).** Cents live in BigInt columns — the old `Int` ceiling of
  $21,474,836.47 per field is gone — and every formatter in
  `lib/format/money.ts` accepts either. Convert with `centsToNumber` when
  a value is serialised, handed to a client component, or passed into
  `lib/calc` (whose functions multiply cents by fractions, which bigint
  cannot do). `bigint` crossing into a client component throws at render,
  and `JSON.stringify` throws on it, so the boundary is not optional.
- **Several Today widgets are honestly static**, not fake-dynamic: Markets,
  Milestones, Recents, and Notes have no backing model (no Security/Quote,
  no DOB, no view-tracking, no persistence). They're labeled as such in
  their component files. Agenda, Tasks, Alerts, Pipeline, Book, and Reviews
  are all real queries against seeded data.
- **Today's grid places widgets; it never fetches for them.** The page
  still does one query block and hands the rendered widgets to
  `WidgetGrid` as content (D-020). Per-widget fetching is what §5's widget
  contract wants and is still open — until then, one failing query fails
  the page, which is why widget-level error isolation is still unchecked.
  A widget's size lives in `components/widgets/catalog.ts`, not in the
  widget: one that set its own width would fight the layout the advisor
  dragged.
- **The intake SSN box masks while typing; the Household panel shows dates
  of birth in full.** Not a contradiction with D-019: a date of birth on a
  record page is being read by the advisor who owns that relationship, while
  an SSN is typed at a meeting where the client — or the next person past the
  desk — can see the screen. Masking a field being typed is ordinary practice
  for secrets, not a compliance gesture. Nothing typed there is stored:
  there's no encrypted column for it (§11, Phase 9).
- **The risk questionnaire's bands are illustrative, like the tax brackets.**
  `lib/calc/risk.ts` scores four answers into Conservative/Moderate/Growth/
  Aggressive. The mechanism is real and visible to the advisor; the questions
  and cut-offs are fixtures, because a firm's suitability questionnaire is a
  compliance artifact its own compliance team owns (CLAUDE.md §13).
- **Dates of birth are shown, not masked (D-019).** CLAUDE.md §11 says to
  mask them; this platform's users are all certified professionals working
  on wholly confidential records, so the rule buys nothing here and the
  roster shows the full date. The masking machinery built for it — an
  `AuditEvent` model and a logged reveal action — was backed out rather
  than left unused. Encryption at rest is a separate §11 requirement and is
  still unbuilt.
- **Section URLs live in `lib/sections.ts`, nowhere else.** Retirement,
  Tax, Protection and Estate sit under `/planning/` now (D-024), and the
  slug was previously repeated in the section nav, the insight card, the
  AI tools, the signals rules and the Overview ring. Four of those would
  have kept linking to the old paths. Add a section there or not at all.
- **Planning levers are per member because dates differ per person.**
  `PlanScenario` holds household levers, `PlanScenarioMember` per-person
  ones, and both store only what the scenario *changes* — null inherits
  from the record, so a saved scenario survives an update to the plan and
  its summary row can say what it actually did.
- **Every scenario lever defaults to a value that changes nothing**
  (D-025). No pension, no part-time work, no tax drag, no survivor
  reduction, no care cost, no legacy target, zero inflation. A default
  that moved the projection would be the app inventing a financial
  assumption on the advisor's behalf (§13), and the advisor would have no
  way to tell which figures were theirs. The test for it is concrete: the
  Whitaker plan of record reads 69% before and after eleven levers were
  added. Add a lever, give it a neutral default, and prove the baseline
  didn't move — `pnpm test`.
- **`pnpm test` is Vitest over `lib/**` only, and that is on purpose**
  (D-026). Everything it covers is pure, so it needs no database, server
  or browser and runs in about a second. Tests assert *direction*, never a
  value, wherever a number depends on the random draw. Component and
  end-to-end coverage are Storybook's and Playwright's jobs and neither is
  wired up, so **the browser is still where UI behaviour gets verified
  here** — a green suite says the arithmetic holds, not that the page
  works.
- **A model's tool input is untrusted structure** (D-033). Treating
  `input.questions` as a typed array cost a whole turn when it arrived as
  something else: `.filter` threw and the advisor saw a runtime error
  where a report should have been. Parse defensively, and say plainly
  when a turn produced nothing usable.
- **Ask, or note — not both** (D-033). Give a model a question tool *and*
  a "limits" heading and it will quietly prefer the heading, writing a
  confident report over its own assumptions. The line that works:
  something the advisor could answer now is a question; the heading is
  for what no answer could resolve today.
- **Cap a clarification loop in the route, not the prompt** (D-033).
  There is always another thing a form didn't collect, so the model will
  keep asking. One round, then the tool is withdrawn.
- **Don't itemise and summarise the same money** (D-033). The member
  card's assets/liabilities boxes went when accounts and property became
  itemised — a lump sum for the same money is a second answer to one
  question, with nothing to say which is right.
- **Whatever a field displays must round-trip through its own change
  handler** (D-032). A masked display carries no information, so a handler
  that parses the display cannot preserve what is behind it — the SSN
  field masked itself with bullets and accepted exactly one digit,
  because every keystroke stripped the bullets and everything already
  typed with them. Masking is `type="password"`; the value stays real.
- **Formatters live in `lib/format`, not beside their component**
  (D-032). The SSN helpers were sound; what was missing was anywhere to
  write a test that fed the display back in. `lib/**` is what `pnpm test`
  covers.
- **Separate a plan change from a yardstick change** (D-031). A scenario
  that moves a return assumption would have moved the number with the
  plan untouched. Compare projects both plans at the record's assumptions
  first — that difference is the plan's — then applies the scenario's own,
  and reports the two separately. Without it an advisor blames the wrong
  change: the demo scenario reads −31 pts and the plan change is worth
  zero of it.
- **Compute the figures, then ask the model** (D-031). The comparison is
  built from `lib/calc` and handed over whole; the assistant is forbidden
  to derive anything. A model asked for a probability of success would
  sometimes be right, and that is not a standard that number can be
  quoted at.
- **A proposal has to be appliable or the button is theatre** (D-031).
  The assistant picks from a closed lever catalogue
  (`lib/planning/adjustments.ts`) and an unknown lever is refused back to
  it, not rendered as a card that does nothing. Applying writes to the
  scenario, never the plan of record.
- **A 200 is not proof a page rendered** (D-030). The error boundary
  answers 200, so a render that throws looks identical to curl. The route
  sweep greps each response for the boundary's text and the server log
  for errors; without both, a page that fails completely passes the
  check. This is the other half of the bill D-011 ran up when it traded
  404 fidelity for an error boundary.
- **Never export a plain constant from a `"use client"` module into a
  server component** (D-030). React resolves it through the client
  manifest, a non-component export is not in there, and the page throws
  at render. Shared constants go in their own module — see
  `lib/charts/asset-class.ts`.
- **An account's tax treatment is what makes the layer worth having**
  (D-030). It is why the Tax section can say "unrealised losses in
  taxable accounts" and mean it. A claim about a *kind* of account is
  only checkable once accounts exist.
- **Two views of the same money: per security and per position** (D-030).
  "What do we hold" wants one row per security; "where is it held" wants
  one per position. Concentration is measured on the merged view, or
  bookkeeping hides it — one name at 6% in a brokerage account and 5% in
  an IRA is an 11% position in that company.
- **A figure about the holdings is derived from the holdings** (D-029).
  The mix, the blended expense ratio, the distinct-holdings count and the
  largest position are all rolled up from `Position` rows rather than
  stored beside them. They used to be four independent random numbers,
  which was harmless only while nothing could contradict them. If you add
  a figure that describes the portfolio, compute it — do not add a column.
- **Concentration means single names, not large holdings** (D-029). The
  largest fund in this book runs a median 24% of the portfolio and the
  largest single stock a median 8%, so a threshold tuned to catch the
  second flags every household on the first. A broad index fund at a
  quarter of the book is diversification. 10% of the portfolio selects
  seventeen of forty — the same tuning lesson as the signal rules.
- **Within-class and whole-portfolio percentages are different scales.**
  Bars inside an asset class are drawn as shares of that class; a
  concentration limit is a share of the whole portfolio. `lib/calc/
  holdings.ts` has `thresholdWithinClass` for the conversion, because
  drawing one against the other put the marker 25 points left of where it
  belonged and implied a breach on holdings nowhere near the limit.
- **An interactive chart is built out of links, not click handlers**
  (D-028). A treemap cell is an SVG `<a href>`, so middle-click, open in
  a new tab, copy link and Enter all work without being implemented, and
  it reaches the accessibility tree as a named link. Keyboard navigation
  is a roving tabindex — one tab stop for the whole chart, arrows moving
  *spatially* between cells — because forty tab stops in the middle of a
  page is hostile to anyone trying to get past it.
- **Chart labels are measured against their cell before they are drawn**
  (D-027). `lib/charts/treemap.ts` computes the layout in viewBox units
  precisely so that decision can be exact: a name is drawn only if it
  fits, a value only if there is a second line's room. The
  character-width estimate must sit at or above what the face really
  produces — at 0.55 em two labels overflowed their cells; the browser
  measures 0.665, so it is 0.68 and a test pins it there.
- **One describer writes both the live chips and the saved-scenario
  summary** (`lib/planning/describe.ts`). It compares baseline against
  current rather than reading the scenario record field by field, which is
  what the saved-scenario table used to do — every lever added after it
  would have been silently missing from the rows.
- **Signal rule thresholds are tuned against this book, and that tuning is
  the work.** At the first cut, a 14% drawdown flagged 32 of 40 households
  and the harvesting rule fired on 31 — which describes the book rather
  than selecting from it, and an advisor who sees three-quarters of their
  clients flagged stops reading the feed. The gates in
  `lib/calc/signals.ts` now sit where the distributions say they should
  (24 of 40 on that scenario, 8 on harvesting). Re-tune them against any
  new book; the numbers are judgements, not constants.
- **Alert severity must be sorted through `bySeverity()`.** It is a string
  column, so ordering it ascending in a query sorts alphabetically — high,
  low, medium — which silently buries every medium alert below the low
  ones. That shipped briefly and was only caught because the assistant
  summarised a run and said "all ten are high severity".
- **A household created at intake starts empty, on purpose.** Plan health
  is the mean across its twelve sections, so a brand-new household reads
  ~18%, AUM reads $0 until something is custodied, and goals are named but
  uncosted (`Goal.targetCents` is nullable; status `unset` is not the same
  as `behind`). Anything that fabricates a starting figure to make the
  record look finished is the failure CLAUDE.md §1 calls a bug — and it
  costs the demo its best beat.
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

- [x] Repo scaffold: Next.js App Router, TypeScript strict, ESLint — configured. No
      Prettier config on purpose: it's installed, but checking the tree against a
      reasonable config (120 cols, double quotes, trailing commas) reports 68 files
      differing, so adding one means a repo-wide reformat that buries feature history in
      `git blame`. Worth doing as its own commit when someone wants it, not slipped into
      a batch
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
- [x] Vitest wired up — `pnpm test`, 195 unit tests over `lib/**` (D-026)
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

- [~] Three-column layout — the chat dock resizes between 380 and 560px by dragging its
      edge (double-click resets), and its width and collapsed state persist per device
      via the same boot-script pattern as theme, density, and the nav, so neither flashes
      on load. The nav is 72px/232px by hover or pin (Phase 1 below). Not resizable: the
      workspace column, which takes whatever is left
- [x] Nav rail — icon mode, groups, Settings pinned bottom, plus expand-on-hover and
      pin-to-expanded (CLAUDE.md §4). Hovering overlays the workspace; pinning shifts it
      across, so content doesn't reflow every time the pointer crosses the rail. Group
      labels appear only when expanded. The pin persists via the same boot-script
      attribute as theme and density, so a pinned nav never flashes narrow on load
- [x] Route stubs for all 12 top-level entries with proper empty states — every one
      has since been built out for real; no stub routes remain
- [ ] Responsive behavior: overlay chat < 1280px, bottom bar nav < 900px
- [x] Command palette (⌘K) — every top-level surface, the two saved views, and every
      household by name, which is what an advisor is usually reaching for and previously
      cost a trip through Clients and its search box. Arrow keys, Enter, Escape; matches
      that start with the query rank above ones that merely contain it. Hand-rolled
      rather than pulling in Radix: an overlay, an input, and arrow keys don't need a
      Dialog primitive (D-014's rule is to add Radix when something genuinely does). The
      nav carries a Search row with the shortcut on it — a shortcut nobody can see is a
      shortcut nobody uses
- [~] Global search — ⌘K reaches every household and page by name, and the Clients list
      searches household and member names. Not searched: documents, notes, activity,
      insights — none of it is indexed, and scanning every table per keystroke is the
      wrong shape for it
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
- [~] Sort — real, URL-driven (`?sort=&dir=`), all 12 columns. The Household column is
      pinned: the table scrolls horizontally below 1224px (which is most configurations
      once the nav is pinned or the chat dock is open) and the name column stays put
      rather than every column being squeezed. Show/hide and reorder are not built
- [~] Search — household name or any member's name; no email or tag search (neither is
      modelled). Matches the same two fields the assistant's `search_households` tool does
- [ ] Filter chips (region, income, investable assets, segment, goals, life stage, risk,
      completeness, last contact, review status, account types, tags, advisor)
- [x] Filter state in URL, shareable (sort, saved view, and search query all do this)
- [x] Saved views: My book, Needs review, At risk, Whole firm — the first three are
      scoped to the acting advisor (14 of the 40 households), which "My book" claimed
      but didn't do once the book grew to four advisors
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
- [x] Overview's segmented completeness ring (CLAUDE.md §8) — one arc per plan section,
      filled to that section's completeness, anything under 60% in brass, with a linked
      legend beside it that doubles as the chart's table equivalent. The centre shows the
      mean across sections, which is deliberately *not* the plan-health figure in the
      header: that one is a separate stored roll-up, and the two only converge once the
      completeness manifest exists. Said on the page, not just here
- [x] Sections: all thirteen build on the shared scaffold with real data and a real
      summary visual. The nav now lists ten, because Retirement, Tax, Protection and
      Estate moved inside **Planning** as tabs alongside a scenario explorer (D-024) —
      they moved, they were not merged. Business is correctly hidden (no seeded
      household has an entity, D-003). See Phase 5

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
- [~] Conversation history / threading — every turn is persisted, a thread keeps one
      `conversationId` for its lifetime, and the dock now survives a reload: the
      transcript, its citations, and the conversation id are kept in sessionStorage, so
      a resumed thread keeps writing to the same append-only log. Still no UI to reopen
      a past conversation, and a new tab starts clean (deliberately — a conversation
      belongs to the sitting it was started in)
- [ ] Token and cost telemetry

## Phase 4 — Today (M4)

- [x] Prompt zone: greeting, composer, and three suggestion chips computed from the
      book (CLAUDE.md §5) — the household whose review is next, the most overdue one,
      the count that has actually drifted past the alert threshold, falling back to the
      weakest plan. A chip never names a household the advisor doesn't have
- [x] Submit streams into the dock without navigating (shared Zustand store)
- [x] Widget grid drag/resize/add/remove/reset — real, on `react-grid-layout` (D-020).
      Editing is a mode ("Edit layout"), so cards don't shift under the cursor while
      being read; inside it, drag to move, drag the corner to resize, × to remove, "Add
      widget" offers exactly the widgets not currently placed, and Reset restores the
      default
- [~] Per-user per-breakpoint layout persistence — per advisor, in a `DashboardLayout`
      row written on drop (debounced) and read on page load. Not per breakpoint: the app
      has one breakpoint until responsive behaviour exists (Phase 1). A layout equal to
      the default is stored as no row, so Reset means "follow the default" rather than
      freezing today's default into the record
- [ ] Org default layout + admin widget locking — needs an Org and roles (D-014). The
      built-in default lives in `components/widgets/catalog.ts` as the constant an
      org-published layout would replace
- [x] Widgets: Agenda, Tasks, Alerts, Pipeline, Markets, Book, Reviews, Milestones,
      Recents, Notes — all ten present, each with a catalog entry (title, description,
      default and minimum size) driving both the grid and the add menu. Agenda/Tasks/Alerts/Pipeline/Book/Reviews are
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
- [~] Household (members) — a members roster is real and data-backed, now including each
      member's date of birth and a "turns 17 in 12 days" nudge when a birthday is within
      sixty days. Dates of birth are shown in full rather than masked (D-019), which is a
      deliberate deviation from CLAUDE.md §11. The force-free relationship graph from
      `design/HouseholdMembers.dc.html` isn't built (see that section's page for the gap)
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
- [x] Planning — a Planning section after Goals holding the scenario explorer and the
      four disciplines it drives (D-024). Seventeen levers (D-025) split by who owns the
      decision: per member, retirement age, plan-to age, part-time income and through-age,
      SS claim age and SSA estimate, pension amount/start/COLA, savings and a real
      step-up; per household, retirement spending, a spending shift from a stated age,
      survivor spending, long-term care, real return, volatility, inflation, an effective
      tax rate on withdrawals, a one-time inflow, a legacy target and the plan horizon.
      Grouped into a four-tab workbench with the outcome sticky beside it, recomputed in
      the browser on every move against the plan of record. Scenarios save as deltas,
      compare side by side with the probability and the points gained, and one can be
      marked as the recommendation
- [ ] `PlanSnapshot` versioning + "what changed since last review" diff — the Overview
      page's "what changed" list and the Activity timeline's plan-change entries are
      static/seeded, not a real diff engine

## Phase 6 — Charts and reports

- [~] Chart primitives — thirteen real, data-driven chart components exist
      (`components/charts/`: cashflow-sankey, net-worth-waterfall, allocation-rings,
      goals-bubble-quadrant, book-treemap, revenue-concentration-curve,
      pipeline-funnel, retirement-fan-chart, tax-bracket-bar, protection-gap-bars,
      estate-flow-diagram, attestation-timeline, completeness-ring); no shared
      axis/legend/tooltip/
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
      and Tasks). A real 5-step interactive wizard (`components/intake/`: Start →
      Household basics → Members → Goals → Review, real step state, real add/remove
      rows) that starts from an actual Agreement-stage Prospect when one exists
      (pre-fills name and advisor from real seeded data) or from scratch.
      Members collect a date of birth (age is derived, never typed — two fields for
      one fact drift apart the moment a birthday passes), a social security number,
      income/expenses/assets/liabilities with net worth and annual surplus computed
      live, and a four-question risk-tolerance questionnaire that scores to a profile
      in front of the advisor rather than out of sight (`lib/calc/risk.ts`). Goals are
      picked from a catalog of the common ones — the first five matching the names
      seeded households already use, plus an Other escape hatch — each with a priority
      and a time-horizon band. "Create household" is deliberately
      disabled — a Household record has ~70 fields spanning every plan section,
      which this wizard never collects and which a brand-new household
      wouldn't have data for yet; wiring a real create means deciding a
      freshly-onboarded household's starting state across every section, a
      product decision. **Resolved 2026-09-20**: "Create household" creates one
      (`app/(app)/intake/create-household.ts`). Collected figures carry across,
      everything downstream of a custodian feed starts at zero, per-section
      completeness is computed from what was actually provided, and the converted
      prospect leaves the pipeline. The social security number is still not saved —
      there is no encrypted column for one (CLAUDE.md §11, Phase 9), said on the
      step itself.
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
- [-] Masked-by-default PII with logged reveal — dropped for dates of birth (D-019): every
      user is a certified professional and the whole record is confidential, so masking one
      field from the advisor who owns the relationship buys nothing. Revisit if a reader
      who isn't a certified professional ever gets a seat (client portal, support, outside
      auditor). Field-level encryption below is unaffected and still required
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

- **2026-09-21** — Intake now collects a portfolio, and offers to read it before the household
  exists (D-033). It used to collect names, income, spending, two lump sums and a goal list, so
  a household created from it had a net worth and nothing else — Allocation, Tax and Planning
  all opened empty on a household that had just been described in full.
  Two new steps. **Accounts and holdings**, itemised account by account with type, custodian
  and owner, and a position table inside each; the firm's securities are offered as
  suggestions and picking one fills the row, but the field is free text because a client
  arrives holding what they hold. The allocation is shown back as it is typed. **Property**,
  each with its own mortgage, plus other assets and non-mortgage liabilities. The member
  card's assets/liabilities boxes are gone: once the same money is itemised, a lump sum for it
  is a second answer to one question. Everything the new household states about its portfolio
  is derived from the positions, exactly as D-029 requires of a seeded one — so a household
  onboarded this morning opens with working rings, holdings, a concentration marker, an
  accounts panel and asset location.
  The second way out is an **opening analysis**: hand the whole picture to the assistant
  first, with the day's market conditions and a free-text instruction for anything to weigh.
  It is allowed to stop and ask, and two rules make that work. One round of questions,
  enforced in the route — left alone it asks again after the answers, and an advisor who
  answers four questions to be handed four more has a worse tool than a blank page. And
  asking and noting are different outlets: the first prompt offered both a question tool and
  an "Open questions and limits" heading, and the model quietly preferred the heading, writing
  a confident report over its own assumptions. The report is filed against the household as an
  activity entry.
  Two things found in testing. A tool call's input is untrusted structure: `questions` came
  back as something other than an array, `.filter` threw, and the advisor saw a runtime error
  where a report should have been — parsed defensively now. And drift is no longer drawn when
  no target allocation exists: a household onboarded this morning has no IPS, every target
  reads zero, and drift against zero painted three full red bars that meant only "no target
  exists".

- **2026-09-21** — Fixed the intake SSN field, which accepted exactly one digit (D-032). It
  masked itself by putting bullets in `value`, so the input held no digits: every keystroke
  the browser handed the handler what was on screen plus the new character, the handler
  stripped every non-digit, and the bullets went out along with everything already typed.
  Only the newest keystroke survived. Revealed, the same code worked perfectly — `formatSsn`
  puts real digits on screen and stripping the dashes recovers them — so the bug was invisible
  in the state anyone would debug in, and the review step's "Incomplete" for every member was
  the only outward sign.
  Masking is the browser's job now: `type="password"` when hidden, and the value is always the
  real formatted number. The helpers moved to `lib/format/ssn.ts` with the round trip tested
  at every length, plus a test that reproduces the bullet version and pins it at one digit —
  the functions were fine, what was missing was anywhere to write a test that fed the display
  back in.

- **2026-09-21** — Added Compare: a saved scenario against the plan of record, both projected
  under the same market conditions, with the assistant's review beside the arithmetic and a
  chat box for follow-ups (D-031).
  The decomposition is the point. A scenario can change the plan (when someone retires) or the
  yardstick (what returns to assume), and mixing them makes the answer useless. Both plans are
  projected at the record's market assumptions first — that difference is the plan's doing —
  then the scenario's own assumptions are applied, and that difference is the yardstick's. The
  seeded demo makes the case: "Retire 65 and assume 3% returns" reads −31 pts, and the
  retirement change is worth *zero* of it. By eye an advisor gets that backwards.
  Every figure is computed before the model is asked anything — the comparison comes from
  `lib/calc`, and the prompt forbids deriving a number that isn't in the block. What the
  assistant adds is judgement: key differences, pros, cons, recommendations, in four fixed
  headings. It can propose a further change, which arrives as a card with an Apply button;
  the levers are picked from a closed catalogue so the button actually works, and an unknown
  lever is refused back to the model rather than shown as a card that would do nothing.
  Applying writes to the scenario, never the plan of record.
  Goals became scenario levers on the way, since "any part of the plan" that excludes goals
  isn't that — which exposed that seeded goals had no time horizon and so never reached the
  projection at all: the levers worked and moved nothing. They have intake's horizon bands
  now, which lowers every household's baseline probability, because the plan is finally paying
  for goals it always had. Retirement keeps no horizon on purpose — it is the spending the
  projection already models, and dating it would charge the plan twice.
  The guardrails needed a second grounding mode: the review cites no records because it
  fetches none, and the citation rules flagged a correct answer either way — ungrounded with a
  tool count of zero, uncited with one. `checkAssistantText` now takes `grounding: "tools" |
  "supplied"`; everything else it checks applies unchanged.
  Verified against the live model end to end: review, an adjustment card, Apply (92% → 90% as
  the suggested stress-test landed), and a follow-up. Asked which single change did most of
  the work, the assistant said the comparison doesn't break it down that way and told the
  advisor how to find out, rather than estimating — which is the grounding contract working.

- **2026-09-21** — Added the account layer, completing §10's Household → Account → Position →
  Security spine (D-030). D-029 deferred it because nothing needed it; that was true of the
  data model and not of the pages on top of it. The Tax section had a row labelled "unrealized
  gains (taxable accounts)" over a random fraction of the portfolio — it *could not* have been
  about taxable accounts, because the app had no idea which accounts were taxable — and a
  withdrawal order, "Taxable → Traditional → Roth", identical on all forty households and
  attached to nothing.
  163 accounts across the book (40 brokerage, 61 traditional IRAs, 20 Roths, 18 401(k)s, 16
  529s — only in the 19 households that have a dependent — and 8 trusts), 523 positions. The
  seed splits each security's total across accounts and never alters it, so D-029's invariant
  survives: the mix re-derived off the positions still reproduces the stored percentages to
  0.000 points. Unrealised gains and losses are now computed from taxable accounts only, the
  withdrawal order shows the balances it would actually draw on, the balance sheet itemises
  "Investment accounts" into the accounts that make it up, and Allocation gained an accounts
  panel and an asset-location readout.
  Three things worth keeping. Concentration is now measured **per security, not per position**
  — one name at 6% in a brokerage account and 5% in an IRA is an 11% position in that company,
  and counting the lots separately reports neither; no household in this book has a breach that
  only merging reveals, so it changes nothing today and closes the hole. The seed needed a
  coverage pass, because small accounts lost every weighted draw for a position and were
  dropped as empty: 55% of households were given a Roth and two of forty kept it. And
  "unrealized losses available to harvest" became "unrealized losses (taxable accounts)" —
  whether a loss can be used is a tax question that depends on the rest of the return, and this
  app states the amount rather than the conclusion.
  The bug worth recording is how one hid. `CLASS_COLOR` was exported from the rings chart, a
  `"use client"` module, and imported by the new server-rendered accounts panel. React resolves
  that through the client manifest, a plain constant is not in it, and the page throws at
  render — where the error boundary catches it and answers **200**. The curl sweep that has
  verified every change in this repository was blind to it; the browser caught it immediately.
  The sweep now greps each response for the boundary's own text as well.
  §6's "account types held" filter is finally possible and still not built — the Clients list
  has no filter-chip machinery yet.

- **2026-09-21** — Allocation now holds real positions (D-029). The section could say a
  household was 62% equities and could not say what the equities *were*. `Security` and
  `Position` land, seeded per household from the allocation it already had — the sleeves are
  cut from `equityActualPct` and `fixedIncomeActualPct` with cash taking the remainder — so
  re-deriving the mix off the positions reproduces the stored percentages to 0.000 points
  across all forty households. 15 securities, 415 positions, 7–13 holdings each, every ticker
  and fee fictional.
  Everything the section states about holdings is now computed from them: the blended expense
  ratio, the largest position, and `distinctHoldings`, which drops from an invented 18–48 to a
  true 7–13. Those were four independent random numbers before, which is harmless right up
  until there is a table underneath capable of contradicting them.
  The rings had to be rebuilt as SVG arcs to make any of it selectable — a `conic-gradient`
  draws the right picture and has no segments to click. The legend rows are the accessible
  control (a radio group, one tab stop, arrow keys), and the ring segments click through to
  the same selection. Picking a class shows its holdings as bars with a concentration marker,
  and the full holdings table sits below, grouped by class with subtotals.
  Two things worth remembering. Concentration is measured on **single names only** — the
  largest fund in this book is a median 24% of the portfolio against a median 8% for the
  largest single stock, so counting funds flags all forty households instead of the seventeen
  that have an actual concentrated position. And the marker was initially drawn in the wrong
  units: bars inside a class are shares *of the class*, the limit is a share *of the
  portfolio*, so a 10% limit landed at 36% of the track instead of 59% and implied a breach on
  holdings nowhere near it. Caught by measuring the rendered bars against the marker in the
  browser rather than trusting the arithmetic; `thresholdWithinClass` now does the conversion
  and is tested. The marker is also drawn only on single-name rows, since a line a fund's bar
  visibly crosses reads as a breach whatever the caption underneath says.
  §10's `Account` layer is still not built; positions hang off the household for now.

- **2026-09-21** — Book composition is now something you can get into (D-028). Every cell
  is an SVG `<a href>` to its household, so middle-click, open-in-new-tab, copy-link and the
  status-bar URL preview all work because the browser already knows how; the click handler
  intercepts only a plain left click, to route without a page load. Keyboard navigation is a
  roving tabindex rather than forty tab stops — the chart is one stop and the arrows move
  within it, Home and End jump to the largest and smallest household, Enter follows the link
  as links do.
  The arrows move *spatially*, which is the part that needed real code: → from a tall cell
  has to reach whatever is beside it, not whatever is next in value order. A candidate that
  lines up with the source on the other axis always wins; one that lines up with nothing has
  to sit within 45° of the direction asked for. That cone is not decoration — without it the
  top-left cell answered ↑ with the cell to its right, whose centre sat a fraction higher,
  which is true and is not what anybody pressing ↑ meant. Caught by driving the keys in a
  real browser, then pinned by a test, alongside one proving all forty cells stay reachable.
  Verified in the accessibility tree: a `group` named for the chart, described by the
  keyboard hint, with forty `link` children named "{household}, {segment}, {AUM} under
  management". §8's table equivalent is still not built.

- **2026-09-21** — Wired up Vitest and fixed the Insights treemap (D-026, D-027).
  `pnpm test` now runs 101 unit tests over `lib/**` in about a second, with no database,
  server or browser — everything it covers is pure. The `check:planning` script D-025 left
  behind is gone; it needed a seeded database, it printed a table for a human to read rather
  than asserting anything, and nothing ran it but somebody remembering to. Its content is
  now four suites plus one for the name formatter. The database dependency is replaced by
  `lib/planning/fixtures.ts`, a fictional household whose *shape* is the thing under test:
  a couple whose primary is the younger of the two, so the position-versus-role bug that bit
  the Whitakers fails a test if it ever comes back.
  Converting the script found one thing worth keeping: extending the plan horizon lowers the
  probability of success while *raising* the median ending value, because that value is
  measured at the end of a longer plan. Both are correct, and they are not comparable — the
  saved-scenario column is now labelled "Median at plan end" rather than implying a shared
  yardstick, and a test stops it being rediscovered as a bug. (Its header, and the other
  five, were also in ALL CAPS against §7.)
  The book-composition chart called itself a treemap and was two flex rows, so thirty-seven
  of forty households landed in a single row of seventeen-pixel columns: no name survived
  truncation, and the value line had no truncation at all, so forty money figures overflowed
  and overprinted each other into a smear along the bottom edge. It is now a real squarified
  treemap — pure geometry in `lib/charts/treemap.ts`, tested for proportional area, exact
  fill, no overlap and aspect ratios under 5:1 — and, more to the point, labels are measured
  against their cell before they are drawn. A cell gets a name only if the name fits and a
  value only if there is room for a second line; the rest keep a hover title. Three things
  made the result read as deliberate rather than arbitrary: preferring the distinguishing
  word ("Achebe", not "Achebe Househ…", and "Whitakers", not "The"), a five-character floor
  so no cell shows "Ab…", and correcting a character-width estimate that was under-measuring
  the real font and letting two labels spill out of their cells — caught by checking
  `getComputedTextLength` in the browser rather than trusting the constant.

- **2026-09-21** — Widened the scenario model from six levers to seventeen and rebuilt the
  explorer around them (D-025). The six that shipped with D-024 were enough to show the
  idea and not enough to plan with: an advisor's actual review questions — she drops to
  three days a week at 62, his pension has no COLA, assume care from 85, what does the tax
  drag on withdrawals cost, what if the practice sells in five years, do they still leave
  something behind — had nowhere to go. Added per member: plan-to age, part-time income
  and through-age, pension amount/start age/COLA flag, and a real savings step-up. Added
  per household: a spending shift of ±N% from a stated age, survivor spending, long-term
  care from a stated age, volatility, inflation, an effective tax rate on withdrawals, a
  labelled one-time inflow, and a legacy target that changes what counts as success rather
  than moving a dollar of the projection.
  The rule that made this safe is that **every new lever defaults to a value that changes
  nothing** — a default that moved the number would be the app inventing an assumption the
  advisor couldn't see (§13). Verified rather than asserted: the Whitaker plan of record
  reads 69% before and after. `pnpm --filter @meridian/web check:planning` now checks the
  direction of all seventeen and that the baseline is unmoved; it caught nothing wrong in
  the model, but it did catch two of my own test expectations being wrong, which is the
  same value.
  Seventeen levers don't fit beside a chart, so the explorer became a four-tab workbench —
  People, Spending, Markets & tax, Events — with the outcome panel sticky alongside. Each
  tab carries a count of what's been moved inside it and the chips under the chart spell
  out every change, so grouping hides nothing. Controls know their baseline: a moved lever
  says "was 62" and clicking that puts it back, because an advisor mid-conversation needs
  to undo one lever without resetting the scenario. Money fields carry their own $ and
  unit and group their thousands on blur.
  Two things found while wiring it up. Moving one retirement slider reported *three*
  changes, because the pension start age and part-time through-age park on the retirement
  age to mean "not set" and travel with it — they now count, and save, only once there is
  an income attached to them. And the saved-scenario table built its summary by reading
  the scenario record field by field, so all eleven new levers would have been invisible
  in the saved rows; both it and the live chips now come from one baseline-vs-current
  describer.

- **2026-09-20** — Added financial planning (D-024). A **Planning** section now sits after
  Goals in the household nav, with Retirement, Tax, Protection and Estate moved inside it as
  tabs and a scenario explorer as the first one. The explorer is per member, which is the
  whole point: retirement age, Social Security claim age, the SSA estimate and annual
  savings are levers per person, alongside household spending and a real-return assumption,
  because "she goes at 62, he works to 67" is the first question any couple asks and a
  single household retirement age cannot express it. Every move recomputes in the browser
  against the plan of record and shows the delta in points; scenarios save as *deltas* (null
  inherits) so a saved scenario survives an update to the record, compare side by side, and
  one can be marked as the recommendation. On the Whitakers: 69% baseline, 83% with Karen
  retiring at 64 and spending trimmed, +14 points, saved and recommended.
  Two real bugs found on the way. The baseline assigned plan ages by *position* after
  ordering members by age, so Tom — the older spouse — was getting Karen's primary
  retirement age; it now keys off role. And the Goals page threw "Cannot convert a BigInt
  value to a number" at runtime while typechecking clean, because a type predicate asserted
  `targetCents: number` over values that were still bigint — the conversion now happens at
  the boundary like everywhere else, and the assertion is gone. Moving four URLs also
  produced `lib/sections.ts`, which is now the only place that knows where a section lives;
  the slug had been repeated in five files.

- **2026-09-20** — Pre-demo fix: "My book" was showing all forty households across four
  advisors. It had been honest when the whole book was ten and everything belonged to one
  advisor; expanding the book made the label a lie, and it is the kind of thing an advisor
  notices in the first minute. The three personal views now scope to the acting advisor
  (14 households, 6 needing review, 6 at risk) and a fourth, "Whole firm", shows all forty.

- **2026-09-20** — Migrated every money column to BigInt (D-023), closing the
  $21,474,836.47 per-field ceiling that D-021 had deferred. Twenty-five columns, 268
  references across 37 files; the compiler found all of them, in four rounds from 61 errors
  to zero. The migration is really one rule applied consistently: cents are `bigint` in the
  database layer and in server-side arithmetic, and become `number` at the boundary where
  they are serialised or handed to a client component — because `bigint` cannot be JSON
  serialised, so React throws on the prop and `JSON.stringify` throws in the assistant's
  tool payloads. `lib/format/money.ts` owns the crossings (`centsToNumber`, `toCents`,
  `absCents`), and `lib/calc` stays on plain numbers since its functions multiply cents by
  fractions. Verified by storing a household with $97M in net worth — 4.5x the old ceiling
  — reading it back exactly, rendering all thirteen of its sections, listing it in the
  client-component Clients table, and asking the assistant about it, which exercises the
  serialisation path bigint would have broken. With the ceiling gone, the archetype ranges
  capped beneath it were restored: the book's largest household is now $25.6M in net worth
  and the firm total $255.6M, neither of which the previous schema could represent.

- **2026-09-20** — M-demo item 4, and with it the milestone: `pnpm demo:reset` reseeds the
  book, clears what a demo leaves behind — chat transcripts, dragged widget layouts,
  acknowledged alerts, dismissed insights — re-runs the two opening scenarios, and prints
  what the demo now contains. Making `db:seed` clear runtime artifacts was the substance of
  it: a demo that opens with the last demo's chat still in the dock, or its rearranged
  widgets, is not the demo that was rehearsed. Verified by dirtying every one of those
  (41 households, a leftover transcript, a dragged layout, every alert acknowledged, every
  insight dismissed) and confirming one command restored all of it. Added a demo runbook
  above — the seven-step sequence through Today, Clients, Intake, Signals and the
  assistant, plus the two things to say out loud about the simulated feed and the framing
  of suggested actions. **M-demo is complete.**

- **2026-09-20** — M-demo item 3: the signals engine (D-022). Eight watched indicators —
  policy rate, 10-year, mortgage rate, equity drawdown, equity YTD, and scenario versions of
  the distribution age, estate threshold and bracket edge — every one a simulated fixture
  labelled as one, because §13 forbids inventing tax thresholds and this audience checks.
  Moving an indicator runs all forty households through eight rules and raises alerts that
  explain themselves in the household's own figures: "14.0% in cash against a 3.8% target —
  $664K, 10.2 points above where the plan puts it". Reachable from a Run-now control on the
  new `/signals` page, from `pnpm --filter @meridian/web signals <key> <value>` for a cron,
  and from the assistant through a new `get_open_alerts` tool. Alerts appear on `/signals`
  grouped by what moved, on the affected household's Overview, and in Today's Alerts widget,
  which previously computed drift and overdue inline and now leads with real signals.
  Most of the work was tuning: the first cut flagged 32 of 40 households on a 14% drawdown
  with a harvesting rule firing on 31, which describes a book rather than selecting from
  one. Gates were reset from the actual distributions — 24 of 40 on that scenario, 8 on
  harvesting, 5 on the distribution-age scenario. Two real bugs found by looking at output
  rather than code: the drift rationale quoted equities when the drift was almost entirely
  in cash, and alert severity was ordered by string ascending — high, low, medium — quietly
  burying every medium alert, which surfaced only because the assistant summarised a run as
  "all ten are high severity". Verified end to end by asking the assistant which households
  a rate move touched: it named ten with their own figures, ranked them, and cited each one.

- **2026-09-20** — M-demo item 2: the book is forty households across four advisors,
  $232M AUM, 93 members, 16 prospects. Thirty are generated deterministically from seven
  archetypes — accumulator, family, pre-retiree, new retiree, RMD-age, business owner,
  wealth transfer — chosen so the book varies along the axes the signals engine's rules
  will test rather than being forty lookalikes: cash from 1.8% to 14%, drift from 0.5% to
  7.3% with sixteen at or past the alert line, mortgages on every household from $59K to
  $1.29M, taxable income from $49K to $350K, and ages deliberately clustered on 59, 65 and
  73. That last part started random and produced one member at 59 and none at 65 — thin
  enough to make an age-triggered rule look broken when it was the data — so threshold
  ages are now assigned by position. The eight design-record households keep their exact
  figures (Ramirez still $8.42M, 1.8% drift, 82%). Two real finds: Markets' RMD deadline
  item, which queries members aged 73+, finally has something to count (5 households, was
  0); and integer cents overflow an `Int` column at $21,474,836.47, which the first
  generated household above that promptly hit. Kept `Int` with a guard in `centsFrom()`
  that names the limit instead of failing as a column-type error, capped the book beneath
  it, and recorded the ceiling as D-021 — it has to move to `BigInt` before real data,
  because a Founding-tier household above $21.5M is not exotic.

- **2026-09-20** — M-demo item 1: Intake now creates a real household, closing the half
  of M6 that was missing. The insert was never the hard part — the question was what the
  seventy-odd fields the wizard doesn't collect should start as, and the answer is empty:
  a household created this morning reads 18% complete with $0 AUM and a three-item
  worklist, which is a worklist, where a seeded-looking 90% would be a lie the advisor has
  to un-believe. Collected figures carry across (net worth from assets minus liabilities,
  savings rate from income minus expenses), members keep their dates of birth and the risk
  profile their questionnaire produced, goals are named but uncosted — which needed
  `Goal.targetCents` to become nullable plus a fourth status, `unset`, since zero reads as
  fully funded everywhere a percentage is computed; the compiler found all three places
  that assumed otherwise. The converted prospect leaves the pipeline. Verified by driving
  the whole wizard in a browser: the household landed, all thirteen sections render for a
  day-one record with no NaN or Infinity anywhere, and the prospect was gone. One real bug
  caught in the process: plan health came out 100% because the Household *section* score
  (legitimately 100 when a member has name, date of birth, occupation and a completed
  questionnaire) was being used as the roll-up across all twelve sections. Now the
  roll-up is their mean — the same number the Overview ring shows in its centre, so the
  two can't disagree.

- **2026-09-20** — Recorded **M-demo** ahead of M6–M8: an advisor discovery demo, with
  its four items and build order written down (Intake creating a household → demo data
  breadth → the signals engine → a demo reset), plus the constraint that shapes the
  third: a simulated, labelled indicator feed, because inventing tax thresholds in front
  of practising advisors is both a credibility failure and against CLAUDE.md §13. M1–M5
  are complete; M7 and M8 are explicitly not demo blockers.

- **2026-09-20** — Added the ⌘K command palette (Phase 1). It covers every top-level
  surface, the two saved views, and every household by name — the last of which is the
  point: jumping to a household previously meant Clients, then its search box, then the
  row. Matches that start with the query rank above ones that merely contain it, so "ram"
  puts Ramirez first. Hand-rolled rather than adding Radix, since an overlay plus an
  input plus arrow keys isn't what D-014 meant by "a feature that needs a Dialog
  primitive". The household list is fetched once in the app shell rather than by the
  palette, which would otherwise need a client fetch on every page against the chance
  someone presses ⌘K. The nav now carries a Search row showing the shortcut, because a
  shortcut nobody can see is a shortcut nobody uses; it opens the palette through a
  custom event rather than a shared store, since one boolean crossing one component
  boundary doesn't earn one. Verified with real keystrokes: Ctrl+K opens, typing "ram"
  narrows to Ramirez, Enter navigates and closes, arrows move the highlight (through a
  multi-match query — the first attempt looked broken until I noticed "cl" matched
  exactly one row), and Escape closes.

- **2026-09-20** — Two more spec'd items. Overview now has the segmented completeness
  ring CLAUDE.md §8 asks for: one arc per plan section, filled to that section's
  completeness, under-60% arcs in brass, with a linked legend that doubles as the chart's
  table equivalent (§8) and is the only keyboard route into the same numbers. A single
  ring could only say "58%"; this says which twelve things that number is made of and
  which ones to go finish. Its centre shows the mean across sections rather than the
  header's plan-health figure — those are two different stored numbers until the
  completeness manifest exists, and quietly showing one as the other would have been the
  easy, wrong thing. And the chat dock is now resizable between 380 and 560px by dragging
  its edge, double-click to reset, with width and collapsed state persisted per device
  through the same boot-script attribute pattern as theme, density, and the nav — so a
  dock dragged to 523px doesn't start at 380 and jump. Verified by dragging: 380 → 523,
  stored and restored across a reload, clamped back to 380 when dragged past the minimum,
  and collapse surviving a reload at 56px.

- **2026-09-20** — Six adjustments to Intake, at the user's request. Members now take a
  date of birth instead of an age, with the age derived beside it — an age typed today is
  wrong within a year, and the Household section already stores dates of birth. Added a
  social security number field that masks as you type with a Show toggle, four money
  fields (income, expenses, assets, liabilities) with net worth and annual surplus
  computed live from them, and a four-question risk-tolerance questionnaire per member
  that shows its score and profile as it's filled in rather than computing one invisibly.
  The member row became a member card to hold it; scoring lives in `lib/calc/risk.ts`,
  pure like the rest of lib/calc, with its bands marked illustrative for the same reason
  the tax brackets are. Goals are now chosen from a catalog of common ones — the first
  five matching names the seeded households already use, so a goal picked at intake reads
  the same as one already on a plan — with an Other escape hatch, and each carries a time
  horizon as a band rather than a year, since at intake a household knows "a few years"
  long before it knows a date. The Review step summarises all of it, showing only the last
  four of an SSN. Walked the whole wizard in a browser: age derived correctly from a
  1979 date, SSN masked then revealed as 123-45-6789, net worth $1,430,000 and surplus
  $85,000 computed from the four inputs, four answers scoring 12 of 16 into Growth, Other
  revealing its text box, and the review tables carrying all of it through. Still not
  wired to create anything, for the reasons above plus the missing encrypted column.

- **2026-09-19** — Three more small items, no new dependencies. The nav rail now expands
  on hover and can be pinned (CLAUDE.md §4, previously unbuilt): hovering overlays the
  workspace, pinning shifts it across — content that reflows every time the pointer
  crosses the rail would be worse than a rail that sits over it for a moment — and group
  labels (Work, Relationships, Intelligence, Records) appear only when expanded. The pin
  rides the same boot-script attribute as theme and density, so a pinned nav doesn't flash
  narrow on first paint; verified by measuring nav, shell, and workspace offsets through
  hover, pin, pointer-away, and reload. The chat dock survives a reload: transcript,
  citations, and conversation id go to sessionStorage, so a resumed thread keeps writing
  to the same append-only log rather than opening a second one — verified by checking the
  id and all four citation chips came back. And the Household column is pinned on the
  Clients table, which meant giving the table horizontal scroll: at 1224px of columns it
  overflows as soon as the nav is pinned or the dock is open, and the old fixed layout
  squeezed every column instead. Deliberately not done: a Prettier config. It's installed,
  but the tree differs from any reasonable config in 68 files, and a repo-wide reformat
  buried in a feature batch is worse than no config — recorded in Phase 0 so it isn't
  re-derived.

- **2026-09-19** — Made Today's widget grid configurable (CLAUDE.md §5), on
  `react-grid-layout` as §2 specifies — the first new dependency since the Anthropic SDK,
  recorded in D-020. Drag to move, drag the corner to resize, × to remove, an "Add widget"
  menu listing exactly what isn't currently placed, and Reset. Editing is a mode rather
  than always-on, because a dashboard whose cards move while you read them is worse than
  one that doesn't. Layout persists per advisor in a new `DashboardLayout` row, written on
  drop and debounced so a drag is one write rather than one per frame. Two findings worth
  keeping: react-grid-layout v2 dropped `WidthProvider` for a `useContainerWidth` hook, so
  the API here is nothing like the v1 examples; and the original default layout had
  overlapping cells that the library silently compacted, which meant "reset to default"
  could never recognise its own output — so reset deleted the layout row and the reflow
  immediately wrote it back. Fixed by making the default collision-free and storing a
  default-equal layout as no row at all, so Reset means "follow the default" rather than
  freezing today's default into the advisor's record. Verified in a browser by actually
  dragging: a widget moved, a resize grew it by one column and two rows, remove and re-add
  round-tripped through the catalog, the arrangement survived a reload, and Reset left no
  row behind. Still missing from §5 and marked as such: a layout per breakpoint (there is
  one breakpoint), and an org default with admin-locked widgets (no Org, no roles).

- **2026-09-19** — Added dates of birth to the Household section's Members panel, with a
  "turns 17 in 12 days" nudge shown only when a birthday is within sixty days — past that
  it would repeat the date printed beside it. Needed a new `Member.birthDate` (the model
  had only `age`), seeded with fictional dates that agree with each member's stated age at
  seed time; verified all 24 members' stored ages match the ages their dates imply. The
  work started as masked-by-default with a logged reveal, per CLAUDE.md §11, and an
  `AuditEvent` model and reveal server action were built for it; the product owner's
  framing — every user is a certified professional, the whole record is confidential —
  made that friction without a threat model, so the masking was dropped and its machinery
  backed out rather than left unused (D-019). The deviation is recorded in DECISIONS, in
  the section's own provenance line, and in the schema comment, since a rule §11 calls
  non-negotiable shouldn't go unmet silently. Encryption at rest is a separate §11
  requirement and remains unbuilt.

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
- **2026-09-25** — Started M-assist (D-034), inserted ahead of Phase 8, with
  item 1: Meeting and Task as real rows. Both hang off Advisor and point at a
  Household or a Prospect (never both; Task may point at neither). Prospect
  deletion sets the key null rather than cascading, and Intake re-points a
  converted prospect's rows at the new household first, so a signing booked
  last week is still a meeting with these people. Seeded to agree with the
  record rather than beside it: a "scheduled" review is on the calendar, a
  "due" or "overdue" one is not, open Task rows equal `openTasksCount`, and the
  held check-in and completed task mirror the ActivityEvents already on the
  timeline. Each advisor keeps regular hours (Dana Tue–Thu, Maya Mon–Thu, and
  so on) so the habit inference in item 5 has something real to find; a
  first-cut slot picker put every review on each advisor's first working day,
  fixed by choosing among matching days within three days either side. One
  meeting per advisor is pinned to the next working day so a demo morning
  never opens on an empty agenda. Verified by a cross-check script (review
  status ↔ review meeting, task counts, weekday spread, stalled prospects have
  nothing booked), clean typecheck, lint, and 195 tests. Also fixed the
  "Last updated" line, which had sat at 2026-09-19 through a week of work.
- **2026-09-25** — M-assist item 2: the screens read the rows. Schedule went
  from "each household's next review date" to a real calendar of Meeting
  rows with an advisor filter and a list of due reviews that have nothing
  booked. Today's Agenda shows the signed-in advisor's meetings for today
  and tomorrow, with a "next up" line when both are clear — the check
  that caught this: the first render of the day was empty because it is
  already Saturday in UTC, and a blank card with no explanation would have
  read as broken. Tasks became a two-view page, Task rows first, the
  Insights inbox second, with a done/reopen action that writes to the
  household timeline. The stored `openTasksCount` column was dropped rather
  than kept in sync. Extracted `lib/agenda.ts` (due labels, UTC day
  arithmetic, sort order) with seven tests, including the 23:30 UTC case a
  local-time implementation gets wrong. Verified in the running app: every
  route 200, Tasks header reads 104 open · 26 overdue with the overdue
  filter agreeing, Schedule lists Monday's meetings for all four advisors,
  the advisor filter narrows to one, and a prospect row no longer reads
  "Proposal · Proposal" (kind and stage said the same word).
- **2026-09-26** — M-assist item 3: the daily brief (D-035). A pure ranker in
  `lib/calc/brief.ts` with the scores written out as one table, a loader
  that scopes it to the signed-in advisor's book, a Brief widget at the
  top-left of the default Today layout, and a `get_agenda` tool that hands
  the assistant the same list with a citation ref per line. Verified in
  the running app: the widget shows six lines and "22 more" for Dana's
  book, Settings → AI lists the new tool from the live registry, and the
  Milestones widget now lists real birthdays from seeded dates of birth
  (no seeded member crosses 59½, 65 or 73 in the next 60 days, so that
  half of the widget is empty by fact, not by omission). Asked "What should
  I do first today, and why?" through the chat route, the assistant called
  `get_agenda` once, led with the top-ranked line, cited nine refs that all
  resolved, tripped no guardrail, and offered a navigation card rather than
  navigating. One ranking test
  failed on first run — a prospect stalled 27 days outranked a task 5 days
  late, against the band order the file comment promised — and the answer
  was that the overlap is right, so the comment and a test now say so.
  Thirteen test files, 213 tests. Milestone ages come from CLAUDE.md §5's
  list; what each age means is left to the advisor and the household's tax
  adviser (§13), and the copy says "an age-based planning trigger" rather
  than naming a rule.
- **2026-09-26** — M-assist item 4: the assistant can put things on the
  calendar and the worklist, after the advisor says so (D-036). The calendar
  adapter interface landed in `apps/web/lib/integrations` with a mock
  provider, ahead of the `packages/integrations` workspace CLAUDE.md §3
  plans, because one consumer and no real provider is not yet a package.
  Free-slot search is pure and separate from the adapter, so Google and
  Microsoft will share it. Proposal validation is one module used twice:
  when the model proposes and when the edited card comes back, since the
  card is input too. Verified end to end in the running app: asked to book
  a review with an overdue household and draft a note, the assistant
  called find_meeting_slots then propose_meeting and the card arrived
  with a note in the advisor's voice; asked to add a task, propose_task.
  Confirming through the action created the row, a second confirm at the
  same time was refused as a clash, a past time and a past due date were
  refused, and the draft note landed on the household's Activity timeline
  labelled not sent. Eleven new tests (slots, proposal parsing); 224 total.
  Then the first real try from the chat dock found a bug the API test had
  not: the advisor picked the 1pm slot and Schedule showed 8pm. The model
  had passed `starts_at` without its trailing Z, `new Date()` read the
  zone-less string in the server's local zone (Pacific), and 13:00 became
  20:00 UTC. Instants now go through `parseInstant`: zone-less means UTC,
  the app's convention (D-034), and an explicit non-UTC offset is refused
  with an instruction to pass the slot unchanged rather than silently
  converted. The tool schema says the same. Four more tests, one of them
  the bug as reported; 228 total.
