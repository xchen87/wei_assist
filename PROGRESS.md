# PROGRESS.md

Development plan and status for Meridian. Update this file whenever work starts,
completes, or gets reprioritized. Add a dated line to the changelog at the bottom.

**Status key:** `[ ]` not started · `[~]` in progress · `[x]` done · `[!]` blocked · `[-]` dropped

**Last updated:** 2026-09-17
**Current phase:** Phase 0 — Foundations

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

## Phase 0 — Foundations

- [ ] Repo scaffold: Next.js App Router, TypeScript strict, ESLint, Prettier
- [ ] Monorepo wiring (`apps/web`, `packages/db`, `packages/schemas`, `packages/integrations`)
- [ ] Design tokens in CSS custom properties, Tailwind theme mapped to them
- [ ] Type setup: Public Sans + Source Serif 4, tabular figures utility
- [ ] `components/ui` primitives: Button, Field, Input, Select, Checkbox, Tabs, Sheet,
      Dialog, Popover, Tooltip, Badge, Table shell, EmptyState, ErrorState
- [ ] Storybook with light/dark and density toggles
- [ ] Prisma schema v1: Org, User, Role, Household, Member, Account, Position, Security
- [ ] Seed script with 40 fictional households across segments and life stages
- [ ] Auth.js with org-scoped sessions, MFA stub
- [ ] RBAC middleware and a `requireOrgScope` query helper
- [ ] Append-only `AuditEvent` writer + logger PII scrubber
- [ ] CI: typecheck, lint, unit, build

## Phase 1 — Shell (M1)

- [ ] Three-column layout with resizable, persisted column widths
- [ ] Nav rail: icon mode, expanded mode, pin, groups, Settings pinned bottom
- [ ] Route stubs for all 12 top-level entries with proper empty states
- [ ] Responsive behavior: overlay chat < 1280px, bottom bar nav < 900px
- [ ] Command palette (⌘K): navigate, search households, run actions
- [ ] Global search across households, members, documents, notes
- [ ] Keyboard map and visible focus states throughout
- [ ] Theme switching, density switching, both persisted per user

## Phase 2 — Clients spine (M2)

- [ ] Virtualized household table, 12 default columns, tabular figures
- [ ] Column show/hide, reorder, sort, pin household column
- [ ] Search input across household, member, email, tag
- [ ] Filter chips: region, income, investable assets, net worth, segment, goals,
      life stage, risk, completeness, last contact, review status, account types, tags,
      advisor
- [ ] Filter state in URL, shareable
- [ ] Saved views: My book, Needs review, At risk
- [ ] Bulk select and bulk actions
- [ ] "Analyze this cohort" handoff into chat
- [ ] Household detail route with section nav and the `PlanSection` scaffold
- [ ] Completeness manifest engine + plan-health roll-up
- [ ] Provenance model: source, last verified, verify action
- [ ] Sections: Overview, Household, Balance, Allocation

## Phase 3 — Assistant (M3)

- [ ] Chat dock: streaming, message parts, stop, retry, copy
- [ ] Context chip from route descriptor, clearable
- [ ] Tool runtime with per-tool auth checks and audit logging
- [ ] Tools: `household.search`, `household.getSection`, `household.getHoldings`,
      `household.getActivity`, `market.quote`, `nav.goto`
- [ ] Tool-call renderers: household card, holdings table, chart embed, citation link
- [ ] Confirmation flow for any write or send
- [ ] Guardrails: no security recommendations, no authoritative tax/legal advice,
      no ungrounded figures — with tests
- [ ] Conversation history, per-household conversation threading
- [ ] Token and cost telemetry per org

## Phase 4 — Today (M4)

- [ ] Prompt zone: greeting, composer, dynamic suggestion chips from real state
- [ ] Submit streams into the dock without navigating
- [ ] Widget grid with drag, resize, add, remove, reset
- [ ] Per-user per-breakpoint layout persistence
- [ ] Org default layout + optional widget locking for admins
- [ ] Widgets: Agenda, Tasks, Alerts, Pipeline, Markets, Book, Reviews, Milestones,
      Recents, Notes
- [ ] Widget error isolation and skeleton loading

## Phase 5 — Remaining plan sections (M5)

- [ ] Cashflow (Sankey)
- [ ] Goals (stacked area + priority quadrant)
- [ ] Retirement (Monte Carlo fan chart, withdrawal sequencing)
- [ ] Tax (bracket bar, harvesting, Roth conversion room)
- [ ] Protection (coverage gap bars)
- [ ] Estate (relationship graph, beneficiary flow)
- [ ] Business (conditional section)
- [ ] Documents (household vault)
- [ ] Activity (unified timeline, plan-change diff)
- [ ] Compliance (IPS, suitability, attestations)
- [ ] `PlanSnapshot` versioning + "what changed since last review" diff view

## Phase 6 — Charts and reports

- [ ] Chart primitives: axes, legend, tooltip, empty, table-toggle
- [ ] Full catalog from CLAUDE.md §8 built and documented in Storybook
- [ ] Accessibility pass: keyboard traversal, ARIA, table equivalents
- [ ] Report builder: section picker, branding, PDF export
- [ ] Scheduled report delivery

## Phase 7 — Pipeline and operations (M6)

- [ ] Prospects: pipeline board, stage aging, conversion metrics, funnel
- [ ] Intake: multi-step guided flow, resumable, client-facing share link
- [ ] Intake → household conversion with field mapping
- [ ] Schedule: calendar views, meeting prep packet generation
- [ ] Tasks: inbox, household grouping, recurrence, templates
- [ ] Markets: watchlists, movers, index snapshot, cited news

## Phase 8 — Integrations

- [ ] Integration adapter interface + sandbox mock provider
- [ ] Custodian positions and balances sync
- [ ] Market data provider
- [ ] Calendar (Google, Microsoft)
- [ ] Email logging
- [ ] Document e-signature
- [ ] Sync health surface in Settings with per-feed last-success and error detail

## Phase 9 — Compliance and hardening (M7)

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

- **2026-09-17** — Repo documentation established. CLAUDE.md, PROGRESS.md, DECISIONS.md
  created. Phase plan drafted through private beta. No code yet.
- **2026-09-17** — Design pass: 22 screens mocked and published (shell, Today, Clients ×2,
  chat dock, 13 of 14 household sections, Prospects, Documents, Reports, Compliance,
  Markets, Insights). Source files in `design/`, live canvas linked from
  `design/README.md`. See "Design reference" above. Household-scoped Compliance is the
  one PlanSection still undesigned; several top-level surfaces (Schedule, Tasks, Intake,
  Settings, auth) have no screens yet. No code written — this is visual spec only. See
  D-013 in DECISIONS.md.
