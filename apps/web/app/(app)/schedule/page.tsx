import Link from "next/link";
import { prisma } from "@meridian/db";
import { MonthCalendar, type CalendarEvent } from "@/components/schedule/month-calendar";
import { Badge } from "@/components/ui/badge";
import { EmptyState } from "@/components/ui/empty-state";
import { formatDate, formatDaysAgo, daysUntil } from "@/lib/format/date";
import { formatMoney, type Cents } from "@/lib/format/money";

export const dynamic = "force-dynamic";

const MONTH_NAMES = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];

function readinessTone(planHealthPct: number): CalendarEvent["tone"] {
  if (planHealthPct >= 80) return "gain";
  if (planHealthPct >= 60) return "brass";
  return "loss";
}

/** No calendar integration exists yet (Phase 8) — this page schedules
 * exactly what the app actually knows about: each household's next
 * review date, the same field Today's Agenda widget already uses. There
 * is no generic multi-meeting-per-household model yet (see CLAUDE.md §10's
 * Meeting entity, not built in this pass), so "Schedule" here means
 * "upcoming household reviews," not a full calendar of arbitrary events —
 * stated honestly in the empty state below rather than implied otherwise. */
export default async function SchedulePage({
  searchParams,
}: {
  searchParams: { month?: string };
}) {
  const households = await prisma.household.findMany({
    select: {
      id: true,
      name: true,
      segment: true,
      aumCents: true,
      nextReviewDate: true,
      reviewStatus: true,
      planHealthPct: true,
      advisor: { select: { name: true } },
    },
    orderBy: { nextReviewDate: "asc" },
  });

  const now = new Date();
  const today = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));

  let year = today.getUTCFullYear();
  let month = today.getUTCMonth();
  if (searchParams.month && /^\d{4}-\d{2}$/.test(searchParams.month)) {
    const [y, m] = searchParams.month.split("-").map(Number);
    year = y!;
    month = m! - 1;
  }
  const prevMonth = new Date(Date.UTC(year, month - 1, 1));
  const nextMonth = new Date(Date.UTC(year, month + 1, 1));
  const monthParam = (d: Date) => `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, "0")}`;

  const events: CalendarEvent[] = households.map((h) => ({
    id: h.id,
    date: h.nextReviewDate,
    label: `${h.name} — Review`,
    tone: h.reviewStatus === "overdue" ? "loss" : readinessTone(h.planHealthPct),
  }));

  const overdue = households.filter((h) => h.reviewStatus === "overdue");
  const upcoming = households.filter((h) => h.reviewStatus !== "overdue");

  const upcomingByMonth = new Map<string, typeof upcoming>();
  for (const h of upcoming) {
    const key = `${h.nextReviewDate.getUTCFullYear()}-${h.nextReviewDate.getUTCMonth()}`;
    const list = upcomingByMonth.get(key) ?? [];
    list.push(h);
    upcomingByMonth.set(key, list);
  }

  if (households.length === 0) {
    return (
      <div className="px-8 py-7">
        <h1 className="mb-4 text-lg font-semibold">Schedule</h1>
        <EmptyState title="No reviews scheduled" description="Household reviews will show here once households are on file." />
      </div>
    );
  }

  return (
    <div className="px-8 py-7">
      <div className="mb-4 flex items-center justify-between">
        <h1 className="text-lg font-semibold">Schedule</h1>
        <div className="flex items-center gap-3">
          <Link href={`/schedule?month=${monthParam(prevMonth)}`} className="rounded-control border border-rule px-2.5 py-1.5 text-sm text-ink-muted hover:bg-paper">
            ←
          </Link>
          <div className="w-36 text-center text-sm font-semibold">
            {MONTH_NAMES[month]} {year}
          </div>
          <Link href={`/schedule?month=${monthParam(nextMonth)}`} className="rounded-control border border-rule px-2.5 py-1.5 text-sm text-ink-muted hover:bg-paper">
            →
          </Link>
        </div>
      </div>

      <MonthCalendar year={year} month={month} events={events} today={today} />

      {overdue.length > 0 && (
        <div className="mb-6 mt-6">
          <div className="mb-2.5 text-sm font-semibold text-loss">Overdue reviews</div>
          <div className="flex flex-col gap-2">
            {overdue.map((h) => (
              <ReviewRow key={h.id} household={h} />
            ))}
          </div>
        </div>
      )}

      <div className="mt-6">
        <div className="mb-2.5 text-sm font-semibold">Upcoming reviews</div>
        <div className="flex flex-col gap-5">
          {Array.from(upcomingByMonth.entries()).map(([key, items]) => {
            const [y, m] = key.split("-").map(Number);
            return (
              <div key={key}>
                <div className="mb-2 text-xs font-semibold text-ink-muted">
                  {MONTH_NAMES[m!]} {y}
                </div>
                <div className="flex flex-col gap-2">
                  {items.map((h) => (
                    <ReviewRow key={h.id} household={h} />
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      <div className="mt-6 rounded-card border border-dashed border-rule p-4 text-xs text-ink-muted">
        Scheduling shown here is each household&rsquo;s next review date — the same field Today&rsquo;s Agenda widget
        uses. No calendar integration (Google, Microsoft) is connected in this build, and there&rsquo;s no
        general-purpose meeting model yet, so this isn&rsquo;t a full calendar of arbitrary events.
      </div>
    </div>
  );
}

function ReviewRow({
  household,
}: {
  household: {
    id: string;
    name: string;
    segment: string;
    aumCents: Cents;
    nextReviewDate: Date;
    reviewStatus: string;
    planHealthPct: number;
    advisor: { name: string };
  };
}) {
  const days = daysUntil(household.nextReviewDate);
  const tone = readinessTone(household.planHealthPct);
  const dotClass = tone === "gain" ? "bg-gain" : tone === "brass" ? "bg-brass" : "bg-loss";

  return (
    <Link
      href={`/clients/${household.id}`}
      className="flex items-center gap-3.5 rounded-control border border-rule px-3.5 py-2.5 hover:bg-paper"
    >
      <span className={`h-2 w-2 shrink-0 rounded-full ${dotClass}`} />
      <div className="w-24 shrink-0 text-xs text-ink-muted">
        {household.reviewStatus === "overdue" ? formatDaysAgo(-days) + " over" : formatDate(household.nextReviewDate)}
      </div>
      <div className="flex-1 text-sm font-medium">{household.name}</div>
      <div className="text-xs text-ink-muted">{household.segment}</div>
      <div className="tabular w-20 text-right text-xs text-ink-muted">{formatMoney(household.aumCents, { compact: true })}</div>
      <div className="w-20 text-right">
        <Badge tone={household.reviewStatus === "overdue" ? "loss" : "neutral"}>
          {household.reviewStatus === "overdue" ? "Overdue" : days <= 7 ? "This week" : "Scheduled"}
        </Badge>
      </div>
    </Link>
  );
}
