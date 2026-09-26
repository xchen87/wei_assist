import type Anthropic from "@anthropic-ai/sdk";
import { prisma } from "@meridian/db";
import { centsToNumber, formatMoney, type Cents } from "@/lib/format/money";
import { formatPercent, formatSignedPercent } from "@/lib/format/percent";
import { formatDate, formatTime } from "@/lib/format/date";
import type { RefRegistry } from "./refs";
import { bySeverity } from "@/lib/calc/signals";
import { loadBrief } from "@/lib/brief";
import { calendar } from "@/lib/integrations";
import { conflictWith, findFreeSlots } from "@/lib/calc/slots";
import { loadPatterns } from "@/lib/patterns";
import { hourLabel, orderSlots, WEEKDAY_NAMES } from "@/lib/calc/patterns";
import { DAY_MS, utcDayStart } from "@/lib/agenda";
import {
  defaultMeetingTitle,
  parseInstant,
  parseMeetingFields,
  parseTaskFields,
  type MeetingProposal,
  type ProposalSubject,
  type TaskProposal,
} from "./proposals";
import { CURRENT_ADVISOR_NAME } from "@/lib/current-advisor";
import { countBySeverity } from "@/lib/calc/brief";
import { sectionPath, sectionPathFromName, type SectionKey } from "@/lib/sections";
import { ASSET_CLASS_LABEL, mergeBySecurity, summarisePortfolio } from "@/lib/calc/holdings";
import {
  ACCOUNT_KIND_LABEL,
  TAX_TREATMENT_LABEL,
  assetLocation,
  summariseAccounts,
  type AccountInput,
} from "@/lib/calc/accounts";

/** Tools are the only way the model touches data (CLAUDE.md §9) — there is
 * no free-form SQL, and nothing here takes a table or column name from the
 * model. Every read tool returns figures already rendered through
 * lib/format alongside a link to the record they came from, so the model
 * can satisfy §9 rules 1 and 2 by quoting what it was handed rather than
 * restating numbers in its own words.
 *
 * Every record handed back carries a `ref` issued by the request's
 * RefRegistry. The model cites that token rather than describing the record
 * in its own words, which is what stops it merging two rows into one
 * citation — see lib/ai/refs.ts.
 *
 * Two tools are proposals, not actions. Per §9 rule 3 anything with an
 * external effect is surfaced for the advisor to confirm in the UI; the
 * runtime never executes them, it returns a descriptor the chat dock
 * renders as a confirmation card. */

export type ToolEffect = "read" | "proposal";

export type ToolOutcome = {
  /** What goes back to the model as the tool_result. */
  payload: unknown;
  /** Ids of the records this call touched, for the audit log (§9 rule 5). */
  recordIds: string[];
  /** Present on proposal tools: what the UI should offer to confirm. */
  proposal?: Proposal;
};

export type Proposal =
  | { kind: "navigate"; path: string; label: string }
  | { kind: "dismissInsight"; insightId: string; text: string; householdId: string }
  | MeetingProposal
  | TaskProposal;

export type ToolDef = {
  name: string;
  effect: ToolEffect;
  definition: Anthropic.Tool;
  run: (input: Record<string, unknown>, refs: RefRegistry) => Promise<ToolOutcome>;
};

function str(input: Record<string, unknown>, key: string): string | undefined {
  const v = input[key];
  return typeof v === "string" && v.trim() ? v.trim() : undefined;
}
function num(input: Record<string, unknown>, key: string): number | undefined {
  const v = input[key];
  return typeof v === "number" && Number.isFinite(v) ? v : undefined;
}

const SECTIONS = [
  "overview",
  "household",
  "cashflow",
  "balance",
  "allocation",
  "goals",
  "retirement",
  "tax",
  "protection",
  "estate",
  "documents",
  "activity",
  "compliance",
] as const satisfies readonly SectionKey[];
type Section = (typeof SECTIONS)[number];

// ---------------------------------------------------------------------------

const searchHouseholds: ToolDef = {
  name: "search_households",
  effect: "read",
  definition: {
    name: "search_households",
    description:
      "Find households in this advisor's book by name or by the filters the Clients list supports. Returns one compact row per household with its key figures and a link to its record. Use this first whenever a question names a household or asks 'which households ...'.",
    input_schema: {
      type: "object",
      properties: {
        query: { type: "string", description: "Match against household or member name." },
        review_status: { type: "string", enum: ["scheduled", "due", "overdue"] },
        segment: { type: "string", enum: ["Core", "Premier", "Founding"] },
        min_drift_pct: { type: "number", description: "Only households whose allocation drift is at or above this." },
        max_plan_health_pct: { type: "number", description: "Only households whose plan health is at or below this." },
        min_last_contact_days: { type: "number", description: "Only households not contacted in at least this many days." },
        limit: { type: "number", description: "Default 10, maximum 25." },
      },
      required: [],
    },
  },
  async run(input, refs) {
    const query = str(input, "query");
    const limit = Math.min(Math.max(num(input, "limit") ?? 10, 1), 25);
    const households = await prisma.household.findMany({
      where: {
        ...(str(input, "review_status") ? { reviewStatus: str(input, "review_status") } : {}),
        ...(str(input, "segment") ? { segment: str(input, "segment") } : {}),
        ...(num(input, "min_drift_pct") !== undefined ? { driftPct: { gte: num(input, "min_drift_pct") } } : {}),
        ...(num(input, "max_plan_health_pct") !== undefined
          ? { planHealthPct: { lte: num(input, "max_plan_health_pct") } }
          : {}),
        ...(num(input, "min_last_contact_days") !== undefined
          ? { lastContactDays: { gte: num(input, "min_last_contact_days") } }
          : {}),
        ...(query
          ? {
              OR: [
                { name: { contains: query } },
                { members: { some: { name: { contains: query } } } },
              ],
            }
          : {}),
      },
      include: { advisor: { select: { name: true } }, members: { select: { name: true, role: true } } },
      orderBy: { aumCents: "desc" },
      take: limit,
    });

    return {
      recordIds: households.map((h) => h.id),
      payload: {
        count: households.length,
        households: households.map((h) => ({
          ref: refs.issue(h.name, `/clients/${h.id}`),
          household_id: h.id,
          name: h.name,
          link: `/clients/${h.id}`,
          segment: h.segment,
          advisor: h.advisor.name,
          members: h.members.map((m) => `${m.name} (${m.role})`),
          aum: formatMoney(h.aumCents, { compact: true }),
          net_worth: formatMoney(h.netWorthCents, { compact: true }),
          ytd_return: formatSignedPercent(h.ytdReturnPct),
          cash: `${formatPercent(h.cashPct)} against a ${formatPercent(h.targetCashPct)} target`,
          drift: formatPercent(h.driftPct),
          plan_health: `${h.planHealthPct}%`,
          last_contact: `${h.lastContactDays} days ago`,
          next_review: formatDate(h.nextReviewDate),
          review_status: h.reviewStatus,
        })),
      },
    };
  },
};

const getHouseholdSection: ToolDef = {
  name: "get_household_section",
  effect: "read",
  definition: {
    name: "get_household_section",
    description:
      "Read one section of a household's plan — the same figures the section page shows, already formatted for display. Call this before making any claim about a household's finances. Sections: " +
      SECTIONS.join(", ") +
      ".",
    input_schema: {
      type: "object",
      properties: {
        household_id: { type: "string", description: "From search_households." },
        section: { type: "string", enum: [...SECTIONS] },
      },
      required: ["household_id", "section"],
    },
  },
  async run(input, refs) {
    const householdId = str(input, "household_id");
    const section = str(input, "section") as Section | undefined;
    if (!householdId || !section || !SECTIONS.includes(section)) {
      return { payload: { error: "household_id and a valid section are required." }, recordIds: [] };
    }
    return readSection(householdId, section, refs);
  },
};

const getHouseholdActivity: ToolDef = {
  name: "get_household_activity",
  effect: "read",
  definition: {
    name: "get_household_activity",
    description:
      "Recent meetings, notes, documents, completed tasks, and plan changes for one household, most recent first. Use for 'what happened since', 'when did we last speak', or meeting prep.",
    input_schema: {
      type: "object",
      properties: {
        household_id: { type: "string" },
        limit: { type: "number", description: "Default 8, maximum 20." },
      },
      required: ["household_id"],
    },
  },
  async run(input, refs) {
    const householdId = str(input, "household_id");
    if (!householdId) return { payload: { error: "household_id is required." }, recordIds: [] };
    const limit = Math.min(Math.max(num(input, "limit") ?? 8, 1), 20);
    const events = await prisma.activityEvent.findMany({
      where: { householdId },
      orderBy: { occurredAt: "desc" },
      take: limit,
    });
    const link = `/clients/${householdId}/activity`;
    return {
      recordIds: events.map((e) => e.id),
      payload: {
        link,
        // One ref per event, not one for the timeline: these are the rows
        // most easily conflated with each other, since several can mention
        // the same subject on different dates.
        events: events.map((e) => ({
          ref: refs.issue(`${e.kind} · ${formatDate(e.occurredAt)} · ${e.label}`, link),
          kind: e.kind,
          label: e.label,
          detail: e.detail,
          occurred: formatDate(e.occurredAt),
        })),
      },
    };
  },
};

const getOpenInsights: ToolDef = {
  name: "get_open_insights",
  effect: "read",
  definition: {
    name: "get_open_insights",
    description:
      "Open (undismissed) insights — the app's own surfaced observations, which are what the Tasks inbox lists. Filter by household or by section. Use for 'what needs attention'.",
    input_schema: {
      type: "object",
      properties: {
        household_id: { type: "string", description: "Omit to search the whole book." },
        section: { type: "string", description: "e.g. Allocation, Estate, Compliance." },
        limit: { type: "number", description: "Default 10, maximum 25." },
      },
      required: [],
    },
  },
  async run(input, refs) {
    const limit = Math.min(Math.max(num(input, "limit") ?? 10, 1), 25);
    const insights = await prisma.insight.findMany({
      where: {
        dismissed: false,
        ...(str(input, "household_id") ? { householdId: str(input, "household_id") } : {}),
        ...(str(input, "section") ? { section: str(input, "section") } : {}),
      },
      include: { household: { select: { id: true, name: true } } },
      orderBy: { createdAt: "asc" },
      take: limit,
    });
    return {
      recordIds: insights.map((i) => i.id),
      payload: {
        count: insights.length,
        insights: insights.map((i) => ({
          ref: refs.issue(
            `${i.household.name} · ${i.section} insight`,
            sectionPathFromName(i.household.id, i.section) ?? `/clients/${i.household.id}`,
          ),
          insight_id: i.id,
          household: i.household.name,
          household_id: i.household.id,
          section: i.section,
          text: i.text,
          source: i.sourceLabel,
          link: sectionPathFromName(i.household.id, i.section) ?? `/clients/${i.household.id}`,
        })),
      },
    };
  },
};

const getOpenAlerts: ToolDef = {
  name: "get_open_alerts",
  effect: "read",
  definition: {
    name: "get_open_alerts",
    description:
      "Open signals raised by the monitoring engine when a watched indicator moved — which households a change affected and the reason each one matched. Use for 'who is affected by', 'what did the rate move touch', or when asked about a specific household's alerts. Each alert already contains the household's own figures; quote them rather than recomputing.",
    input_schema: {
      type: "object",
      properties: {
        household_id: { type: "string", description: "Omit for the whole book." },
        indicator: { type: "string", description: "Filter by indicator name fragment, e.g. 'rate' or 'equity'." },
        severity: { type: "string", enum: ["high", "medium", "low"] },
        limit: { type: "number", description: "Default 10, maximum 25." },
      },
      required: [],
    },
  },
  async run(input, refs) {
    const limit = Math.min(Math.max(num(input, "limit") ?? 10, 1), 25);
    const indicatorFilter = str(input, "indicator");

    const alerts = await prisma.alert.findMany({
      where: {
        status: "open",
        ...(str(input, "household_id") ? { householdId: str(input, "household_id") } : {}),
        ...(str(input, "severity") ? { severity: str(input, "severity") } : {}),
        ...(indicatorFilter
          ? { change: { indicator: { name: { contains: indicatorFilter } } } }
          : {}),
      },
      include: {
        household: { select: { id: true, name: true } },
        change: { include: { indicator: { select: { name: true, unit: true } } } },
      },
      orderBy: { createdAt: "desc" },
    });
    // Highest severity first — and sorted here rather than in the query,
    // because ordering the string column ascending puts "low" above
    // "medium".
    const ranked = [...alerts].sort(bySeverity).slice(0, limit);

    return {
      recordIds: ranked.map((a) => a.id),
      payload: {
        count: ranked.length,
        note: "Indicator values are simulated fixtures. Suggested actions are prompts to review with the household or their tax or legal adviser, never advice.",
        alerts: ranked.map((a) => ({
          ref: refs.issue(
            `${a.household.name} · ${a.title}`,
            (a.section ? sectionPathFromName(a.household.id, a.section) : null) ??
              `/clients/${a.household.id}`,
          ),
          household: a.household.name,
          household_id: a.household.id,
          severity: a.severity,
          title: a.title,
          why_this_household: a.rationale,
          suggested_action: a.suggestedAction,
          indicator: a.change?.indicator.name ?? "—",
          indicator_moved: a.change ? `${a.change.fromValue} to ${a.change.toValue}` : "—",
        })),
      },
    };
  },
};

const getAgenda: ToolDef = {
  name: "get_agenda",
  effect: "read",
  definition: {
    name: "get_agenda",
    description:
      "The advisor's daily brief: what needs their attention today, ranked, with the reason for each line in that record's own figures, plus today's meetings. Same list and order as the Brief widget on Today. Use for 'what should I do first', 'what needs attention', 'walk me through today', or to check whether a household is on today's list. Each line already says why; quote it rather than reconstructing the reason from other tools.",
    input_schema: {
      type: "object",
      properties: {
        limit: { type: "number", description: "Default 12, maximum 40." },
        household_id: { type: "string", description: "Only lines about this household." },
      },
      required: [],
    },
  },
  async run(input, refs) {
    const limit = Math.min(Math.max(num(input, "limit") ?? 12, 1), 40);
    const householdId = str(input, "household_id");
    const now = new Date();
    const { items, scope } = await loadBrief(now);
    const scoped = householdId ? items.filter((i) => i.householdId === householdId) : items;
    const shown = scoped.slice(0, limit);
    const bySev = countBySeverity(scoped);

    const meetings = await prisma.meeting.findMany({
      where: {
        advisor: { name: CURRENT_ADVISOR_NAME },
        status: { in: ["confirmed", "proposed"] },
        startsAt: { gte: new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate())), lt: new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate() + 1)) },
        ...(householdId ? { householdId } : {}),
      },
      include: { household: { select: { id: true, name: true, planHealthPct: true } }, prospect: { select: { name: true } } },
      orderBy: { startsAt: "asc" },
    });

    return {
      recordIds: [...shown.map((i) => i.recordId), ...meetings.map((m) => m.id)],
      payload: {
        as_of: formatDate(now),
        scope: `${scope.households} household${scope.households === 1 ? "" : "s"} in the advisor's own book`,
        needs_attention: scoped.length,
        by_severity: bySev,
        note: "Ranked by lib/calc/brief: meeting prep, then signals, then reviews owed with nothing booked, then overdue tasks, stalled prospects, drift, milestones. Next steps are prompts to review with the household or their tax or legal adviser, never advice. The brief reorders; it never hides a line.",
        items: shown.map((i, n) => ({
          rank: n + 1,
          ref: refs.issue(i.recordLabel, i.href),
          kind: i.kind,
          severity: i.severity,
          subject: i.subject,
          household_id: i.householdId ?? undefined,
          prospect_id: i.prospectId ?? undefined,
          what: i.title,
          why: i.why,
          next_step: i.nextStep,
          ...(i.adjustment ? { ordering_note: i.adjustment } : {}),
        })),
        meetings_today: meetings.map((m) => ({
          ref: refs.issue(`${formatTime(m.startsAt)} · ${m.title}`, m.household ? `/clients/${m.household.id}` : "/prospects"),
          time: formatTime(m.startsAt),
          title: m.title,
          kind: m.kind,
          with: m.household?.name ?? m.prospect?.name ?? "—",
          plan_health: m.household ? `${m.household.planHealthPct}%` : undefined,
          status: m.status,
        })),
      },
    };
  },
};

// ---------------------------------------------------------------------------
// Scheduling (M-assist item 4, D-036). find_meeting_slots reads the
// advisor's calendar through the adapter; propose_meeting and propose_task
// return cards. Nothing here writes a row — the confirmation actions in
// app/(app)/schedule/actions.ts and app/(app)/tasks/actions.ts do, after
// the advisor has seen and possibly edited the card.

async function currentAdvisorId(): Promise<string | null> {
  const advisor = await prisma.advisor.findFirst({ where: { name: CURRENT_ADVISOR_NAME }, select: { id: true } });
  return advisor?.id ?? null;
}

async function resolveSubject(input: Record<string, unknown>): Promise<ProposalSubject | { error: string } | null> {
  const householdId = str(input, "household_id");
  const prospectId = str(input, "prospect_id");
  if (householdId && prospectId) return { error: "Give household_id or prospect_id, not both." };
  if (householdId) {
    const h = await prisma.household.findUnique({ where: { id: householdId }, select: { id: true, name: true } });
    return h ? { type: "household", id: h.id, name: h.name } : { error: "No household with that id." };
  }
  if (prospectId) {
    const p = await prisma.prospect.findUnique({ where: { id: prospectId }, select: { id: true, name: true } });
    return p ? { type: "prospect", id: p.id, name: p.name } : { error: "No prospect with that id." };
  }
  return null;
}

const slotLabel = (i: { startsAt: Date; endsAt: Date }) => `${formatDate(i.startsAt)}, ${formatTime(i.startsAt)}–${formatTime(i.endsAt)}`;

const findMeetingSlots: ToolDef = {
  name: "find_meeting_slots",
  effect: "read",
  definition: {
    name: "find_meeting_slots",
    description:
      "Free times on the advisor's calendar for a meeting of a given length, inside working hours, avoiding everything already booked. Call this before propose_meeting and offer the advisor two or three of the results; do not invent a time. Times are returned as display strings — quote them as given.",
    input_schema: {
      type: "object",
      properties: {
        duration_min: { type: "number", description: "Default 60." },
        within_days: { type: "number", description: "How far ahead to look. Default 10, maximum 30." },
        from: { type: "string", description: "Earliest acceptable start, ISO 8601. Default: now." },
        part_of_day: { type: "string", enum: ["morning", "afternoon"], description: "Optional preference." },
        limit: { type: "number", description: "Default 5, maximum 10." },
      },
      required: [],
    },
  },
  async run(input, refs) {
    const advisorId = await currentAdvisorId();
    if (!advisorId) return { payload: { error: "No signed-in advisor." }, recordIds: [] };
    const now = new Date();
    const duration = Math.min(Math.max(num(input, "duration_min") ?? 60, 15), 240);
    const withinDays = Math.min(Math.max(num(input, "within_days") ?? 10, 1), 30);
    const fromParsed = parseInstant(str(input, "from"));
    const from = fromParsed instanceof Date && fromParsed > now ? fromParsed : now;
    const to = new Date(utcDayStart(from).getTime() + (withinDays + 1) * DAY_MS);
    const limit = Math.min(Math.max(num(input, "limit") ?? 5, 1), 10);
    const part = str(input, "part_of_day");
    const hours = calendar.workingHours;
    const workingHours =
      part === "morning" ? { startHour: hours.startHour, endHour: Math.min(12, hours.endHour) }
      : part === "afternoon" ? { startHour: Math.max(12, hours.startHour), endHour: hours.endHour }
      : { startHour: hours.startHour, endHour: hours.endHour };

    const [busy, patterns] = await Promise.all([calendar.busy(advisorId, from, to), loadPatterns(advisorId, now)]);
    // Search wider than asked, then put the advisor's usual days and times
    // first (D-037) and cut to the limit — a preference reorders what is
    // free, it does not make anything free.
    const found = findFreeSlots(busy, { durationMin: duration, from, to, workingHours, weekdays: hours.weekdays, stepMin: 30, limit: limit * 4 });
    const booking = patterns.booking;
    const slots = (booking ? orderSlots(found, booking) : found).slice(0, limit);
    const preference =
      booking && (booking.days.length > 0 || booking.startHours.length > 0)
        ? `Ordered by your usual days (${booking.days.map((d) => WEEKDAY_NAMES[d]).join(", ") || "any"}) and start times (${booking.startHours.map(hourLabel).join(", ") || "any"}), from Settings → AI. Every listed slot is free; the order is the only effect.`
        : "No booking pattern on file yet; earliest first.";
    const ref = refs.issue(`${CURRENT_ADVISOR_NAME}'s calendar, next ${withinDays} days`, "/schedule");
    return {
      recordIds: [],
      payload: {
        ref,
        calendar: calendar.label,
        working_hours: `${formatTime(new Date(Date.UTC(2000, 0, 1, Math.floor(hours.startHour), (hours.startHour % 1) * 60)))}–${formatTime(new Date(Date.UTC(2000, 0, 1, Math.floor(hours.endHour), (hours.endHour % 1) * 60)))}, weekdays`,
        busy_blocks_considered: busy.length,
        preference,
        time_zone: "All times are the practice's own clock. Quote labels as given; pass starts_at to propose_meeting exactly as given.",
        slots: slots.map((s) => ({ starts_at: s.startsAt.toISOString(), label: slotLabel(s) })),
        note: slots.length === 0 ? "No free slot of that length in the window. Try a shorter meeting or a wider window." : "Offer two or three of these; the advisor picks. Pass the chosen starts_at to propose_meeting unchanged.",
      },
    };
  },
};

const proposeMeeting: ToolDef = {
  name: "propose_meeting",
  effect: "proposal",
  definition: {
    name: "propose_meeting",
    description:
      "Propose putting a meeting with a household or prospect on the advisor's calendar. This does NOT book it — the advisor sees a card with the time, can adjust it, and confirms. Use a starts_at from find_meeting_slots. Include a short outreach note to the household in the advisor's voice when the meeting needs their agreement; it is filed on the record as a draft, never sent.",
    input_schema: {
      type: "object",
      properties: {
        household_id: { type: "string" },
        prospect_id: { type: "string" },
        kind: { type: "string", enum: ["Review", "Check-in", "Planning", "Discovery", "Proposal", "Signing", "Internal"] },
        starts_at: { type: "string", description: "The starts_at string from find_meeting_slots, copied exactly, ending in Z. Never convert it to another time zone." },
        duration_min: { type: "number", description: "Default 60." },
        location: { type: "string", enum: ["Video", "Office", "Phone"] },
        title: { type: "string", description: "Optional; defaults to '<name> — <kind>'." },
        note: { type: "string", description: "Optional draft note to the household, 2–4 sentences, warm and plain." },
        reason: { type: "string", description: "One sentence: why this meeting, citing the record." },
      },
      required: ["kind", "starts_at", "reason"],
    },
  },
  async run(input) {
    const subject = await resolveSubject(input);
    if (subject === null) return { payload: { error: "household_id or prospect_id is required." }, recordIds: [] };
    if ("error" in subject) return { payload: { error: subject.error }, recordIds: [] };
    const now = new Date();
    const parsed = parseMeetingFields(input, now);
    if (!parsed.ok) return { payload: { error: parsed.error }, recordIds: [subject.id] };
    const f = parsed.value;

    const advisorId = await currentAdvisorId();
    if (!advisorId) return { payload: { error: "No signed-in advisor." }, recordIds: [] };
    const busy = await calendar.busy(advisorId, f.startsAt, f.endsAt);
    const clash = conflictWith({ startsAt: f.startsAt, endsAt: f.endsAt }, busy);
    if (clash) {
      return {
        recordIds: [subject.id],
        payload: { error: `That time collides with something already booked (${slotLabel(clash)}). Call find_meeting_slots and pick a free one.` },
      };
    }

    const proposal: MeetingProposal = {
      kind: "meeting",
      subject,
      meetingKind: f.meetingKind,
      title: f.title ?? defaultMeetingTitle(subject.name, f.meetingKind),
      startsAt: f.startsAt.toISOString(),
      endsAt: f.endsAt.toISOString(),
      location: f.location,
      note: f.note,
      reason: f.reason,
    };
    return {
      recordIds: [subject.id],
      proposal,
      payload: { status: `Card shown to the advisor: ${proposal.title}, ${slotLabel(f)}. Nothing is booked until they confirm; they may change the time on the card.` },
    };
  },
};

const proposeTask: ToolDef = {
  name: "propose_task",
  effect: "proposal",
  definition: {
    name: "propose_task",
    description:
      "Propose adding a task to the advisor's worklist, about a household, a prospect, or the advisor's own. This does NOT create it — the advisor sees a card, can edit the title and due date, and confirms. Link it to the alert or insight that prompted it when there is one.",
    input_schema: {
      type: "object",
      properties: {
        household_id: { type: "string" },
        prospect_id: { type: "string" },
        title: { type: "string", description: "What to do, as a verb phrase, e.g. 'Send updated IPS for signature'." },
        detail: { type: "string", description: "Optional second line." },
        due_at: { type: "string", description: "YYYY-MM-DD, or omit for no due date." },
        priority: { type: "string", enum: ["high", "normal", "low"] },
        reason: { type: "string", description: "One sentence: why this task, citing the record." },
        alert_id: { type: "string", description: "From get_open_alerts or get_agenda, when the task acts on a signal." },
        insight_id: { type: "string", description: "From get_open_insights, when the task acts on an insight." },
      },
      required: ["title", "reason"],
    },
  },
  async run(input) {
    const subject = await resolveSubject(input);
    if (subject !== null && "error" in subject) return { payload: { error: subject.error }, recordIds: [] };
    const parsed = parseTaskFields(input, new Date());
    if (!parsed.ok) return { payload: { error: parsed.error }, recordIds: subject ? [subject.id] : [] };
    const f = parsed.value;
    const proposal: TaskProposal = {
      kind: "task",
      subject,
      title: f.title,
      detail: f.detail,
      dueAt: f.dueAt ? f.dueAt.toISOString().slice(0, 10) : null,
      priority: f.priority,
      reason: f.reason,
      alertId: str(input, "alert_id") ?? null,
      insightId: str(input, "insight_id") ?? null,
    };
    return {
      recordIds: subject ? [subject.id] : [],
      proposal,
      payload: { status: `Card shown to the advisor: "${f.title}"${f.dueAt ? `, due ${formatDate(f.dueAt)}` : ""}. Nothing is added until they confirm.` },
    };
  },
};

const proposeNavigation: ToolDef = {
  name: "propose_navigation",
  effect: "proposal",
  definition: {
    name: "propose_navigation",
    description:
      "Offer the advisor a button that opens a record in the workspace. This does not navigate on its own — the advisor clicks it. Use it to hand off after answering, not instead of answering.",
    input_schema: {
      type: "object",
      properties: {
        path: { type: "string", description: "An in-app path such as /clients/<id>/allocation." },
        label: { type: "string", description: "What the button should say, e.g. 'Open Ramirez allocation'." },
      },
      required: ["path", "label"],
    },
  },
  async run(input) {
    const path = str(input, "path");
    const label = str(input, "label");
    if (!path || !path.startsWith("/") || !label) {
      return { payload: { error: "path must be an in-app path starting with / and label is required." }, recordIds: [] };
    }
    return {
      recordIds: [],
      proposal: { kind: "navigate", path, label },
      payload: { status: "Offered to the advisor as a button. Not navigated." },
    };
  },
};

const proposeDismissInsight: ToolDef = {
  name: "propose_dismiss_insight",
  effect: "proposal",
  definition: {
    name: "propose_dismiss_insight",
    description:
      "Propose dismissing one open insight. This does NOT dismiss it — the advisor sees a confirmation card and decides. Only propose this when the advisor has asked to clear or dismiss something specific.",
    input_schema: {
      type: "object",
      properties: {
        insight_id: { type: "string", description: "From get_open_insights." },
      },
      required: ["insight_id"],
    },
  },
  async run(input) {
    const insightId = str(input, "insight_id");
    if (!insightId) return { payload: { error: "insight_id is required." }, recordIds: [] };
    const insight = await prisma.insight.findUnique({
      where: { id: insightId },
      select: { id: true, text: true, dismissed: true, householdId: true },
    });
    if (!insight) return { payload: { error: "No insight with that id." }, recordIds: [] };
    if (insight.dismissed) {
      return { payload: { status: "That insight is already dismissed." }, recordIds: [insight.id] };
    }
    return {
      recordIds: [insight.id],
      proposal: { kind: "dismissInsight", insightId: insight.id, text: insight.text, householdId: insight.householdId },
      payload: { status: "Confirmation card shown to the advisor. Nothing has been dismissed yet." },
    };
  },
};

export const TOOLS: ToolDef[] = [
  searchHouseholds,
  getHouseholdSection,
  getHouseholdActivity,
  getOpenInsights,
  getOpenAlerts,
  getAgenda,
  findMeetingSlots,
  proposeNavigation,
  proposeDismissInsight,
  proposeMeeting,
  proposeTask,
];

export const TOOL_DEFINITIONS: Anthropic.Tool[] = TOOLS.map((t) => t.definition);

export function findTool(name: string): ToolDef | undefined {
  return TOOLS.find((t) => t.name === name);
}

// ---------------------------------------------------------------------------
// Section readers. Each returns display-ready strings plus the link to the
// page the advisor can verify them on.

/** Shapes the Prisma rows into what lib/calc expects, converting cents at
 * the boundary (D-023). */
function toAccountInputs(
  accounts: {
    id: string;
    name: string;
    kind: string;
    taxTreatment: string;
    custodian: string;
    openedYear: number;
    owner: { name: string } | null;
    positions: {
      id: string;
      marketValueCents: bigint;
      costBasisCents: bigint;
      security: {
        ticker: string;
        name: string;
        kind: string;
        assetClass: string;
        sector: string | null;
        region: string;
        expenseRatioPct: number;
      };
    }[];
  }[],
): AccountInput[] {
  return accounts.map((account) => ({
    id: account.id,
    name: account.name,
    kind: account.kind,
    taxTreatment: account.taxTreatment,
    custodian: account.custodian,
    ownerName: account.owner?.name ?? null,
    openedYear: account.openedYear,
    holdings: account.positions.map((p) => ({
      id: p.id,
      ticker: p.security.ticker,
      name: p.security.name,
      kind: p.security.kind,
      assetClass: p.security.assetClass,
      sector: p.security.sector,
      region: p.security.region,
      expenseRatioPct: p.security.expenseRatioPct,
      marketValueCents: centsToNumber(p.marketValueCents),
      costBasisCents: centsToNumber(p.costBasisCents),
    })),
  }));
}

async function readSection(householdId: string, section: Section, refs: RefRegistry): Promise<ToolOutcome> {
  const h = await prisma.household.findUnique({
    where: { id: householdId },
    include: {
      advisor: { select: { name: true } },
      members: true,
      goals: true,
      policies: true,
      estateAssets: { orderBy: { sortOrder: "asc" } },
      estateDocs: { orderBy: { sortOrder: "asc" } },
      documents: true,
      complianceItems: { orderBy: { sortOrder: "asc" } },
      attestations: { orderBy: { occurredAt: "desc" } },
      accounts: {
        orderBy: { sortOrder: "asc" },
        include: { positions: { include: { security: true } }, owner: { select: { name: true } } },
      },
    },
  });
  if (!h) return { payload: { error: "No household with that id." }, recordIds: [] };

  const link = sectionPath(h.id, section);
  const base = {
    ref: refs.issue(`${h.name} · ${section}`, link),
    household: h.name,
    section,
    link,
    source: "Household record, read just now",
  };
  const money = (cents: Cents) => formatMoney(cents, { compact: true });

  switch (section) {
    case "overview":
      return {
        recordIds: [h.id],
        payload: {
          ...base,
          advisor: h.advisor.name,
          segment: h.segment,
          aum: money(h.aumCents),
          net_worth: money(h.netWorthCents),
          held_away: money(h.heldAwayCents),
          ytd_return: formatSignedPercent(h.ytdReturnPct),
          plan_health: `${h.planHealthPct}%`,
          next_review: formatDate(h.nextReviewDate),
          review_status: h.reviewStatus,
          last_contact: `${h.lastContactDays} days ago`,
          client_since: h.clientSinceYear,
          what_changed: h.whatChanged.split("\n"),
        },
      };
    case "household":
      return {
        recordIds: [h.id, ...h.members.map((m) => m.id)],
        payload: {
          ...base,
          members: h.members.map((m) => ({ name: m.name, role: m.role, age: m.age, occupation: m.occupation })),
        },
      };
    case "cashflow":
      return {
        recordIds: [h.id],
        payload: {
          ...base,
          annual_income: money(h.incomeCents),
          taxes: money(h.taxesCents),
          net_income: money(h.netIncomeCents),
          spending: money(h.spendingCents),
          savings: money(h.savingsCents),
          savings_rate: formatPercent(h.savingsRatePct),
        },
      };
    case "balance":
      return {
        recordIds: [h.id],
        payload: {
          ...base,
          net_worth: money(h.netWorthCents),
          investment_accounts: money(h.investmentAccountsCents),
          real_estate: money(h.realEstateCents),
          cash: money(h.cashCents),
          other_assets: money(h.otherAssetsCents),
          mortgage: money(h.mortgageCents),
          past_12_months: {
            starting: money(h.balanceStartCents),
            contributions: money(h.balanceContributionsCents),
            growth: money(h.balanceGrowthCents),
            taxes: money(h.balanceTaxesCents),
            spending: money(h.balanceSpendingCents),
          },
        },
      };
    case "allocation": {
      // Rolled up from the positions rather than read off the household's
      // stored columns, so what the assistant says and what the page shows
      // come from one place (D-029).
      const accounts = toAccountInputs(h.accounts);
      const positions = accounts.flatMap((a) => a.holdings);
      // Summary figures come from the per-security view, like the page:
      // one name split across two accounts is one holding of that name.
      // The listing stays per position, because each row names the
      // account it sits in and that is the detail worth having.
      const bySecurity = summarisePortfolio(mergeBySecurity(positions));
      const portfolio = summarisePortfolio(positions);
      const accountNameByHolding = new Map(
        accounts.flatMap((a) => a.holdings.map((holding) => [holding.id, a.name] as const)),
      );
      return {
        recordIds: [h.id, ...h.accounts.flatMap((a) => [a.id, ...a.positions.map((p) => p.id)])],
        payload: {
          ...base,
          equity: `${formatPercent(h.equityActualPct)} actual against a ${formatPercent(h.equityTargetPct)} target`,
          fixed_income: `${formatPercent(h.fixedIncomeActualPct)} actual against a ${formatPercent(h.fixedIncomeTargetPct)} target`,
          cash: `${formatPercent(h.cashPct)} actual against a ${formatPercent(h.targetCashPct)} target`,
          drift: formatPercent(h.driftPct),
          distinct_holdings: bySecurity.distinctHoldings,
          open_positions: portfolio.distinctHoldings,
          blended_expense_ratio: formatPercent(bySecurity.blendedExpenseRatioPct, 2),
          largest_position: bySecurity.largest
            ? `${bySecurity.largest.name} (${bySecurity.largest.ticker}) at ${formatPercent(bySecurity.largest.portfolioPct)} of the portfolio, across every account holding it`
            : "none on file",
          // Every position, so a question about what is actually held in a
          // sleeve is answered from the record instead of from priors (§9).
          holdings: portfolio.groups.map((group) => ({
            asset_class: ASSET_CLASS_LABEL[group.assetClass] ?? group.assetClass,
            value: money(group.valueCents),
            share_of_portfolio: formatPercent(group.portfolioPct),
            positions: group.holdings.map((holding) => ({
              ticker: holding.ticker,
              name: holding.name,
              // Which account it sits in, because the same fund in a
              // brokerage account and an IRA is not the same holding.
              account: accountNameByHolding.get(holding.id) ?? "unknown",
              type: holding.kind,
              sector: holding.sector ?? "diversified",
              value: money(holding.marketValueCents),
              share_of_class: formatPercent(holding.classPct),
              share_of_portfolio: formatPercent(holding.portfolioPct),
              unrealised: money(holding.gainCents),
              expense_ratio: holding.expenseRatioPct > 0 ? formatPercent(holding.expenseRatioPct, 2) : "none",
            })),
          })),
          accounts: summariseAccounts(accounts).map((account) => ({
            name: account.name,
            kind: ACCOUNT_KIND_LABEL[account.kind] ?? account.kind,
            tax_treatment: TAX_TREATMENT_LABEL[account.taxTreatment] ?? account.taxTreatment,
            custodian: account.custodian,
            owner: account.ownerName ?? "held jointly",
            value: money(account.valueCents),
            share_of_portfolio: formatPercent(account.portfolioPct),
          })),
          asset_location: assetLocation(accounts).map((cell) => ({
            tax_treatment: TAX_TREATMENT_LABEL[cell.taxTreatment] ?? cell.taxTreatment,
            value: money(cell.valueCents),
            share_of_portfolio: formatPercent(cell.portfolioPct),
            mix: cell.byClass
              .map((slice) => `${ASSET_CLASS_LABEL[slice.assetClass] ?? slice.assetClass} ${formatPercent(slice.sharePct, 0)}`)
              .join(", "),
          })),
        },
      };
    }
    case "goals":
      return {
        recordIds: [h.id, ...h.goals.map((g) => g.id)],
        payload: {
          ...base,
          goals: h.goals.map((g) => ({
            name: g.name,
            priority: g.priority,
            // A goal captured at intake has no target yet; saying so beats
            // reporting $0, which the model would read as fully funded.
            target: g.targetCents === null ? "not set yet" : money(g.targetCents),
            funded: g.targetCents === null ? "not applicable until a target is set" : formatPercent(g.fundedPct, 0),
            time_horizon: g.horizonLabel ?? "not set",
            status: g.status,
          })),
        },
      };
    case "retirement":
      return {
        recordIds: [h.id],
        payload: {
          ...base,
          retirement_age_primary: h.retirementAgePrimary,
          retirement_age_spouse: h.retirementAgeSpouse,
          social_security_claim_primary: h.ssClaimAgePrimary,
          social_security_claim_spouse: h.ssClaimAgeSpouse,
          monthly_spending_need: formatMoney(h.monthlySpendingNeedCents),
          withdrawal_sequencing: h.withdrawalSequencing,
          success_change_since_last_review: `${h.retirementSuccessDeltaPts > 0 ? "+" : ""}${h.retirementSuccessDeltaPts} points`,
        },
      };
    case "tax":
      return {
        recordIds: [h.id],
        payload: {
          ...base,
          filing_status: h.filingStatus,
          taxable_income: money(h.taxableIncomeCents),
          effective_rate: formatPercent(h.effectiveRatePct),
          realized_gains: money(h.realizedGainsCents),
          unrealized_gains: money(h.unrealizedGainsCents),
          harvestable_losses: money(h.harvestableLossesCents),
          withdrawal_order: h.withdrawalSequencing,
          note: "Bracket figures on the Tax page are illustrative fixtures, not current published rates.",
        },
      };
    case "protection":
      return {
        recordIds: [h.id, ...h.policies.map((p) => p.id)],
        payload: {
          ...base,
          coverage: h.policies.map((p) => ({ type: p.type, gap: p.gapLabel ?? "at target", detail: p.detailLabel })),
        },
      };
    case "estate":
      return {
        recordIds: [h.id, ...h.estateAssets.map((a) => a.id), ...h.estateDocs.map((d) => d.id)],
        payload: {
          ...base,
          documents: h.estateDocs.map((d) => ({ name: d.name, status: d.statusLabel, overdue: d.overdue })),
          titling: h.estateAssets.map((a) => ({
            asset: a.assetName,
            beneficiary: a.beneficiaryLabel,
            missing_designation: a.missingDesignation,
          })),
        },
      };
    case "documents":
      return {
        recordIds: [h.id, ...h.documents.map((d) => d.id)],
        payload: {
          ...base,
          documents: h.documents.map((d) => ({
            name: d.name,
            type: d.type,
            status: d.statusLabel,
            uploaded: d.uploadedLabel,
            source: d.source,
          })),
        },
      };
    case "activity":
      return getHouseholdActivity.run({ household_id: h.id, limit: 8 }, refs);
    case "compliance":
      return {
        recordIds: [h.id, ...h.complianceItems.map((c) => c.id), ...h.attestations.map((a) => a.id)],
        payload: {
          ...base,
          completeness: `${h.complianceCompletenessPct}%`,
          items: h.complianceItems.map((c) => ({
            name: c.name,
            category: c.category,
            status: c.statusLabel,
            effective: c.effectiveLabel,
            next_due: c.nextDueLabel,
          })),
          reviews: h.attestations.map((a) => ({
            period: a.periodLabel,
            date: formatDate(a.occurredAt),
            held: a.held,
            attested: a.attested,
            scope: a.scope,
          })),
        },
      };
  }
}
