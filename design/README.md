# Meridian — design canvas

A first visual design pass for Meridian, covering the app shell and 22 screens.
No application code exists yet (see `../PROGRESS.md`) — this is the visual
spec these screens will be built from.

**Live canvas (view, comment, export PNG/PDF):**
https://claude.ai/artifact/7vF1chcTKQvfF6zjG2K1yP

---

## What's in this folder

- `*.dc.html` — one file per artboard/screen, in Claude Design's "Design
  Component" format. Authored as close to real markup/CSS as a mockup gets:
  inline styles, the actual color tokens from `CLAUDE.md` §7, real copy, no
  lorem ipsum.
- `canvas.json` — the layout manifest: where each artboard sits on the
  pan/zoom canvas, plus the sticky-note captions visible on the published
  version.

**These files will not render if you double-click them.** They depend on a
runtime the Design canvas injects at publish time (`<script
src="./support.js">` is a placeholder the tool replaces). To *look* at the
designs, use the live canvas link above. To read the markup, colors,
spacing, and copy — which is most of what an implementer needs — just open
the files directly; the `<div style="...">` soup is plain, literal CSS.

### Regenerating the live canvas

The canvas is published from these source files via a helper script that
ships with Claude Code's `design` skill (not part of this repo). A future
Claude Code session with that skill available can re-seed and republish from
this folder by pointing the skill at the artboard list in `canvas.json` and
these `.dc.html` files, then publishing to the URL above to update it in
place. There is no local build step outside that skill.

---

## Screen inventory

Household-detail screens all use **Ramirez Household** as the running
example — a fictional two-adult, two-dependent household (Elena & Marcus
Ramirez, Sophia & Lucas). Facts are deliberately cross-referenced across
screens (the same AUM, the same drift %, the same overdue dates) so the
mockups demonstrate the product's core claim — one connected record — not
just isolated screens.

| Artboard | Screen | Maps to `PROGRESS.md` |
|---|---|---|
| `Main.dc.html` | App shell + Today (prompt zone, widget grid, chat open) | Phase 1 (shell), Phase 4 (Today) |
| `Clients.dc.html` | Clients list, sorted by AUM descending | Phase 2 |
| `ClientsAscending.dc.html` | Same list, sort toggled ascending | Phase 2 (sort interaction) |
| `ChatDock.dc.html` | Chat dock closeup — tool-call renders, citation, confirmation card | Phase 3 |
| `Household.dc.html` | Household detail → **Overview** (section 1) | Phase 2 / Phase 5 |
| `HouseholdMembers.dc.html` | Household detail → **Household** (section 2) — relationship graph | Phase 5 |
| `Cashflow.dc.html` | Household detail → **Cashflow** (section 3) — Sankey | Phase 5 |
| `Balance.dc.html` | Household detail → **Balance** (section 4) — waterfall | Phase 5 |
| `Allocation.dc.html` | Household detail → **Allocation** (section 5) — paired rings + drift bars | Phase 5 |
| `Goals.dc.html` | Household detail → **Goals** (section 6) — bubble quadrant | Phase 5 |
| `Retirement.dc.html` | Household detail → **Retirement** (section 7) — Monte Carlo fan chart | Phase 5 |
| `Tax.dc.html` | Household detail → **Tax** (section 8) — stepped bracket bar | Phase 5 |
| `Protection.dc.html` | Household detail → **Protection** (section 9) — diverging gap bars | Phase 5 |
| `Estate.dc.html` | Household detail → **Estate** (section 10) — directed asset/beneficiary flow | Phase 5 |
| `HouseholdDocuments.dc.html` | Household detail → **Documents** (section 11) — household-scoped vault | Phase 5 |
| `Activity.dc.html` | Household detail → **Activity** (section 12) — unified timeline | Phase 5 |
| `Prospects.dc.html` | Prospects — funnel with stage aging, kanban board | Phase 7 |
| `Documents.dc.html` | Documents (top-level, org-wide vault — distinct from the household-scoped one) | Phase 7 / Phase 6 |
| `Reports.dc.html` | Reports — section picker, live paper preview, branding/delivery panel | Phase 6 |
| `Compliance.dc.html` | Compliance (top-level, org-wide — review/attestation status, audit log) | Phase 9 |
| `Markets.dc.html` | Markets — equities, rates & economy, fixed income, tax & regulatory calendar | Phase 7 |
| `Insights.dc.html` | Insights — book composition, revenue concentration, segment mix, advisor capacity | Not phase-mapped; practice analytics, closest to Phase 2/Phase 10 reporting |

**Section 13 (household-scoped Compliance — IPS, suitability, disclosures,
review attestations) is not yet designed.** It's the one PlanSection left
before all 14 household sections have a mockup. Section 11's conditional
Business section also has no mockup — Ramirez has no business entity, so
the scaffold correctly hides it; a household that *does* have one would
need its own screen.

---

## Not designed yet

Nothing below has a mockup. Flagging so implementation doesn't assume
visual direction exists where it doesn't:

- Household-scoped **Compliance** section (14th PlanSection)
- **Business** section (conditional; needs a household with a business entity to demo)
- **Schedule**, **Tasks**, **Intake** (three top-level nav entries with zero screens)
- **Settings** (org, team, integrations, AI, billing)
- Auth flow (sign-in, MFA, org selection)
- Command palette (⌘K), global search
- Empty states, loading/skeleton states, error states — every screen here
  shows the *populated* state only
- Modals/dialogs: widget settings, table column config, CSV import mapping,
  confirmation dialogs generally (`ChatDock.dc.html` shows one proposal
  card, not the full pattern)
- Prospects: "new prospect" form, prospect detail view
- Documents: document preview panel
- Today: "add widget" flow, widget catalog
- Dark mode (tokens for it exist in `CLAUDE.md` §7; no screen renders them)
- Responsive breakpoints (<1280px chat-as-overlay, <900px bottom nav) — every
  screen here is fixed at 1440×900
- Report builder: other templates, delivery-schedule editing UI
- New-firm onboarding / data import

---

## Conventions worth carrying into implementation

These held up across two rounds of review on every screen and are worth
keeping as house rules, not just mockup habits:

- **Type scale is exactly `12/13/14/16/20/26/34`.** No in-between sizes,
  including inside SVG charts.
- **Radius is exactly `6` (controls) / `10` (cards) / `0` (table cells and
  chart marks) / `50%`** (true circles — avatars, toggle knobs, status
  dots). Nothing else.
- **Drift is colored by magnitude of concern, not by arithmetic sign.** A
  household running *over* a cash target and one running *under* a fixed-income
  target are both shown in `--loss`, because both represent the same kind
  of problem (off-plan). This is different from YTD return or P&L, which
  are colored by literal sign (`--gain`/`--loss`).
- **AI Insights are phrased as discussion prompts, never conclusions** —
  "worth discussing," "worth confirming," "worth raising at the next
  review." No insight tells the advisor what to do, recommends a specific
  security, or states a tax/legal position as fact. This is a hard
  constraint from `CLAUDE.md` §9 rule 4, not just a style choice — check new
  screens against it.
- **No fabricated tax thresholds or regulatory figures**, even as fixtures.
  `Tax.dc.html`'s bracket percentages (10/15/25/30/35/40) are deliberately
  *not* real current IRS brackets, and carry an explicit "illustrative, not
  current-year figures" disclaimer in its Provenance line. `Markets.dc.html`'s
  tax calendar sticks to deadline mechanics (RMD deadline, filing deadline)
  rather than dollar contribution limits, for the same reason.
- **Every household-scoped chart cites its source and a last-verified/synced
  timestamp** in the section's Provenance line, per the shared `PlanSection`
  scaffold in `CLAUDE.md` §6.
