import Link from "next/link";
import { prisma } from "@meridian/db";
import { MonthCalendar, type CalendarEvent } from "@/components/schedule/month-calendar";
import { Badge } from "@/components/ui/badge";
import { EmptyState } from "@/components/ui/empty-state";
import { FilterSelect } from "@/components/ui/filter-select";
import { DAY_MS, calendarDaysBetween, dayHeading, readinessTone, utcDayStart } from "@/lib/agenda";
import { formatDate, formatDaysAgo, formatShortDate, formatTime } from "@/lib/format/date";
import { formatMoney, type Cents } from "@/lib/format/money";

export const dynamic = "force-dynamic";

const MONTH_NAMES = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];

const UPCOMING_DAYS = 14;

/** The firm's calendar: Meeting rows (D-034) — household reviews and
 * check-ins, prospect discovery and proposal meetings — on a month grid,
 * the next two weeks as a list, and the reviews that are due with nothing
 * booked, which is the list the assistant will be offering to fill. No
 * external calendar is connected in this build (Phase 8); these are the
 * firm's own records. */
export default async function SchedulePage({
  searchParams,
}: {
  searchParams: { month?: string; advisor?: string };
}) {
  const now = new Date();
  const today = utcDayStart(now);
  const advisorId = searchParams.advisor ?? "";

  let year = today.getUTCFullYear();
  let month = today.getUTCMonth();
  if (searchParams.month && /^\d{4}-\d{2}$/.test(searchParams.month)) {
    const [y, m] = searchParams.month.split("-").map(Number);
    year = y!;
    month = m! - 1;
  }
  const monthStart = new Date(Date.UTC(year, month, 1));
  const monthEnd = new Date(Date.UTC(year, month + 1, 1));
  const prevMonth = new Date(Date.UTC(year, month - 1, 1));
  const nextMonth = new Date(Date.UTC(year, month + 1, 1));
  const monthParam = (d: Date) => `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, "0")}`;
  const withAdvisor = (href: string) => (advisorId ? `${href}&advisor=${advisorId}` : href);

  const listEnd = new Date(today.getTime() + UPCOMING_DAYS * DAY_MS);
  const rangeStart = monthStart < today ? monthStart : today;
  const rangeEnd = monthEnd > listEnd ? monthEnd : listEnd;

  const meetingInclude = {
    household: { select: { id: true, name: true, planHealthPct: true } },
    prospect: { select: { id: true, name: true, stage: true } },
    advisor: { select: { id: true, initials: true, name: true } },
  } as const;

  const [meetings, advisors, unbooked] = await Promise.all([
    prisma.meeting.findMany({
      where: {
        status: { not: "cancelled" },
        startsAt: { gte: rangeStart, lt: rangeEnd },
        ...(advisorId ? { advisorId } : {}),
      },
      include: meetingInclude,
      orderBy: { startsAt: "asc" },
    }),
    prisma.advisor.findMany({ select: { id: true, name: true }, orderBy: { name: "asc" } }),
    // Reviews the record says are due or overdue, with no future review on
    // the calendar. This is the gap, listed as a gap.
    prisma.household.findMany({
      where: {
        reviewStatus: { in: ["due", "overdue"] },
        ...(advisorId ? { advisorId } : {}),
        meetings: { none: { kind: "Review", status: { in: ["confirmed", "proposed"] }, startsAt: { gte: now } } },
      },
      select: {
        id: true,
        name: true,
        segment: true,
        aumCents: true,
        nextReviewDate: true,
        reviewStatus: true,
        lastContactDays: true,
        planHealthPct: true,
        advisor: { select: { initials: true } },
      },
      orderBy: { nextReviewDate: "asc" },
    }),
  ]);

  const toneFor = (m: (typeof meetings)[number]): CalendarEvent["tone"] => {
    if (m.status === "held") return "neutral";
    if (m.household) return readinessTone(m.household.planHealthPct);
    return "pine";
  };
  const hrefFor = (m: (typeof meetings)[number]) => (m.household ? `/clients/${m.household.id}` : "/prospects");

  const events: CalendarEvent[] = meetings
    .filter((m) => m.startsAt >= monthStart && m.startsAt < monthEnd)
    .map((m) => ({ id: m.id, date: m.startsAt, label: `${formatTime(m.startsAt)} ${m.title}`, href: hrefFor(m), tone: toneFor(m) }));

  const upcoming = meetings.filter((m) => m.status !== "held" && m.startsAt >= today && m.startsAt < listEnd);
  const byDay = new Map<string, typeof upcoming>();
  for (const m of upcoming) {
    const key = utcDayStart(m.startsAt).toISOString();
    const list = byDay.get(key) ?? [];
    list.push(m);
    byDay.set(key, list);
  }

  const nothingAnywhere = meetings.length === 0 && unbooked.length === 0;

  return (
    <div className="px-8 py-7">
      <div className="mb-4 flex items-center justify-between">
        <h1 className="text-lg font-semibold">Schedule</h1>
        <div className="flex items-center gap-3">
          <FilterSelect paramKey="advisor" label="Advisor" options={advisors.map((a) => ({ value: a.id, label: a.name }))} />
          <Link href={withAdvisor(`/schedule?month=${monthParam(prevMonth)}`)} className="rounded-control border border-rule px-2.5 py-1.5 text-sm text-ink-muted hover:bg-paper" aria-label="Previous month">
            ←
          </Link>
          <div className="w-36 text-center text-sm font-semibold">
            {MONTH_NAMES[month]} {year}
          </div>
          <Link href={withAdvisor(`/schedule?month=${monthParam(nextMonth)}`)} className="rounded-control border border-rule px-2.5 py-1.5 text-sm text-ink-muted hover:bg-paper" aria-label="Next month">
            →
          </Link>
        </div>
      </div>

      {nothingAnywhere ? (
        <EmptyState title="Nothing on the calendar" description="Meetings show here once one is booked with a household or a prospect." />
      ) : (
        <>
          <MonthCalendar year={year} month={month} events={events} today={today} />
          <div className="mt-2 flex flex-wrap gap-4 text-xs text-ink-muted">
            <Legend className="bg-gain" label="Household meeting, plan ready" />
            <Legend className="bg-brass" label="Plan partly ready" />
            <Legend className="bg-loss" label="Plan not ready" />
            <Legend className="bg-pine" label="Prospect meeting" />
            <Legend className="bg-rule" label="Held" />
          </div>

          <div className="mt-6">
            <div className="mb-2.5 text-sm font-semibold">Next {UPCOMING_DAYS} days</div>
            {byDay.size === 0 ? (
              <div className="text-sm text-ink-muted">Nothing booked in the next {UPCOMING_DAYS} days.</div>
            ) : (
              <div className="flex flex-col gap-5">
                {Array.from(byDay.entries()).map(([key, items]) => (
                  <div key={key}>
                    <div className="mb-2 text-xs font-semibold text-ink-muted">{dayHeading(new Date(key), now, formatDate)}</div>
                    <div className="flex flex-col gap-2">
                      {items.map((m) => (
                        <MeetingRow key={m.id} meeting={m} href={hrefFor(m)} tone={toneFor(m)} showAdvisor={!advisorId} />
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="mt-8">
            <div className="mb-1 text-sm font-semibold">Reviews with nothing booked</div>
            <div className="mb-2.5 text-xs text-ink-muted">
              Due or overdue by the household&rsquo;s review cadence, and no review on the calendar.
            </div>
            {unbooked.length === 0 ? (
              <div className="text-sm text-ink-muted">Every due review has a meeting booked.</div>
            ) : (
              <div className="flex flex-col gap-2">
                {unbooked.map((h) => (
                  <UnbookedRow key={h.id} household={h} now={now} showAdvisor={!advisorId} />
                ))}
              </div>
            )}
          </div>
        </>
      )}

      <div className="mt-6 rounded-card border border-dashed border-rule p-4 text-xs text-ink-muted">
        These are the firm&rsquo;s own meeting records. No external calendar (Google, Microsoft) is connected in
        this build, so a meeting booked elsewhere does not appear here until it is.
      </div>
    </div>
  );
}

function Legend({ className, label }: { className: string; label: string }) {
  return (
    <span className="flex items-center gap-1.5">
      <span className={`h-1.5 w-1.5 rounded-full ${className}`} />
      {label}
    </span>
  );
}

function MeetingRow({
  meeting,
  href,
  tone,
  showAdvisor,
}: {
  meeting: {
    id: string;
    title: string;
    kind: string;
    startsAt: Date;
    endsAt: Date;
    location: string | null;
    status: string;
    source: string;
    prospect: { stage: string } | null;
    advisor: { initials: string; name: string };
  };
  href: string;
  tone: CalendarEvent["tone"];
  showAdvisor: boolean;
}) {
  const dotClass = { gain: "bg-gain", brass: "bg-brass", loss: "bg-loss", pine: "bg-pine", neutral: "bg-rule" }[tone];
  const minutes = Math.round((meeting.endsAt.getTime() - meeting.startsAt.getTime()) / 60000);
  return (
    <Link href={href} className="flex items-center gap-3.5 rounded-control border border-rule px-3.5 py-2.5 hover:bg-paper">
      <span className={`h-2 w-2 shrink-0 rounded-full ${dotClass}`} />
      <div className="tabular w-20 shrink-0 text-xs text-ink-muted">{formatTime(meeting.startsAt)}</div>
      <div className="min-w-0 flex-1 truncate text-sm font-medium">{meeting.title}</div>
      <div className="text-xs text-ink-muted">
        {meeting.kind}
        {meeting.prospect && meeting.prospect.stage !== meeting.kind ? ` · Prospect, ${meeting.prospect.stage}` : meeting.prospect ? " · Prospect" : ""}
        {` · ${minutes} min`}
        {meeting.location ? ` · ${meeting.location}` : ""}
      </div>
      {showAdvisor && (
        <div className="w-8 text-right text-xs font-semibold text-ink-muted" title={meeting.advisor.name}>
          {meeting.advisor.initials}
        </div>
      )}
      {meeting.status === "proposed" && <Badge tone="brass">Proposed</Badge>}
    </Link>
  );
}

function UnbookedRow({
  household,
  now,
  showAdvisor,
}: {
  household: {
    id: string;
    name: string;
    segment: string;
    aumCents: Cents;
    nextReviewDate: Date;
    reviewStatus: string;
    lastContactDays: number;
    planHealthPct: number;
    advisor: { initials: string };
  };
  now: Date;
  showAdvisor: boolean;
}) {
  const daysPast = -calendarDaysBetween(now, household.nextReviewDate);
  const tone = readinessTone(household.planHealthPct);
  const dotClass = tone === "gain" ? "bg-gain" : tone === "brass" ? "bg-brass" : "bg-loss";
  return (
    <Link href={`/clients/${household.id}`} className="flex items-center gap-3.5 rounded-control border border-rule px-3.5 py-2.5 hover:bg-paper">
      <span className={`h-2 w-2 shrink-0 rounded-full ${dotClass}`} />
      <div className="tabular w-20 shrink-0 text-xs text-ink-muted">{formatShortDate(household.nextReviewDate)}</div>
      <div className="flex-1 text-sm font-medium">{household.name}</div>
      <div className="text-xs text-ink-muted">
        {household.segment} · last contact {formatDaysAgo(household.lastContactDays)} ago
      </div>
      <div className="tabular w-20 text-right text-xs text-ink-muted">{formatMoney(household.aumCents, { compact: true })}</div>
      {showAdvisor && <div className="w-8 text-right text-xs font-semibold text-ink-muted">{household.advisor.initials}</div>}
      <div className="w-24 text-right">
        <Badge tone={household.reviewStatus === "overdue" ? "loss" : "brass"}>
          {household.reviewStatus === "overdue" ? `${daysPast}d overdue` : "Due"}
        </Badge>
      </div>
    </Link>
  );
}
