import Link from "next/link";
import { prisma } from "@meridian/db";
import { InsightsInbox, SearchBox } from "@/components/tasks/insights-inbox";
import { TaskRow } from "@/components/tasks/task-row";
import { EmptyState } from "@/components/ui/empty-state";
import { FilterSelect } from "@/components/ui/filter-select";
import { compareByDue, describeDue } from "@/lib/agenda";
import { formatShortDate } from "@/lib/format/date";

export const dynamic = "force-dynamic";

type View = "tasks" | "insights";
type Status = "open" | "done";
type Due = "" | "overdue" | "week" | "none";

/** The advisor's worklist: Task rows (D-034), with real due and overdue,
 * grouped by the household or prospect each one is about. Marking one done
 * persists and lands on the household's timeline. Open insights — the
 * app's own observations, which are prompts rather than to-dos — are the
 * second view rather than mixed in. */
export default async function TasksPage({
  searchParams,
}: {
  searchParams: { view?: string; q?: string; household?: string; section?: string; advisor?: string; status?: string; due?: string };
}) {
  const view: View = searchParams.view === "insights" ? "insights" : "tasks";
  const q = (searchParams.q ?? "").trim().toLowerCase();
  const householdId = searchParams.household ?? "";

  if (view === "insights") {
    return (
      <Shell view={view} counts={await headerCounts()}>
        <InsightsInbox q={q} householdId={householdId} section={searchParams.section ?? ""} />
      </Shell>
    );
  }

  const advisorId = searchParams.advisor ?? "";
  const status: Status = searchParams.status === "done" ? "done" : "open";
  const due: Due = searchParams.due === "overdue" || searchParams.due === "week" || searchParams.due === "none" ? searchParams.due : "";
  const now = new Date();

  const [tasks, households, advisors, counts] = await Promise.all([
    prisma.task.findMany({
      where: {
        status,
        ...(householdId ? { householdId } : {}),
        ...(advisorId ? { advisorId } : {}),
      },
      include: {
        household: { select: { id: true, name: true } },
        prospect: { select: { id: true, name: true, stage: true } },
        advisor: { select: { initials: true } },
      },
      orderBy: { createdAt: "asc" },
    }),
    prisma.household.findMany({ select: { id: true, name: true }, orderBy: { name: "asc" } }),
    prisma.advisor.findMany({ select: { id: true, name: true }, orderBy: { name: "asc" } }),
    headerCounts(),
  ]);

  const described = tasks
    .map((t) => ({ ...t, due: describeDue(t.dueAt, now, formatShortDate) }))
    .filter((t) => {
      if (due === "overdue" && !t.due.overdue) return false;
      if (due === "week" && (t.due.days === null || t.due.days < 0 || t.due.days > 7)) return false;
      if (due === "none" && t.dueAt !== null) return false;
      if (!q) return true;
      const subject = (t.household?.name ?? t.prospect?.name ?? "").toLowerCase();
      return t.title.toLowerCase().includes(q) || (t.detail ?? "").toLowerCase().includes(q) || subject.includes(q);
    })
    .sort(compareByDue);

  // Grouped by who the task is about. A task about nobody in particular
  // is the advisor's own, and says so.
  type Group = { key: string; name: string; href: string | null; note: string | null; items: typeof described };
  const groups = new Map<string, Group>();
  for (const t of described) {
    const key = t.household ? `h:${t.household.id}` : t.prospect ? `p:${t.prospect.id}` : "own";
    const group =
      groups.get(key) ??
      (t.household
        ? { key, name: t.household.name, href: `/clients/${t.household.id}`, note: null, items: [] }
        : t.prospect
          ? { key, name: t.prospect.name, href: "/prospects", note: `Prospect · ${t.prospect.stage}`, items: [] }
          : { key, name: "Your own", href: null, note: null, items: [] });
    group.items.push(t);
    groups.set(key, group);
  }
  // Groups keep the order their most urgent task earned in the sort above.
  const ordered = Array.from(groups.values());
  const overdueCount = described.filter((t) => t.due.overdue).length;

  return (
    <Shell view={view} counts={counts}>
      <div className="mb-5 flex flex-wrap items-center gap-2">
        <SearchBox q={q} placeholder="Search tasks…" hidden={{ status: searchParams.status ?? "", due, advisor: advisorId, household: householdId }} />
        <FilterSelect paramKey="household" label="Household" options={households.map((h) => ({ value: h.id, label: h.name }))} />
        <FilterSelect paramKey="advisor" label="Advisor" options={advisors.map((a) => ({ value: a.id, label: a.name }))} />
        <FilterSelect
          paramKey="due"
          label="Due"
          options={[
            { value: "overdue", label: "Overdue" },
            { value: "week", label: "Next 7 days" },
            { value: "none", label: "No due date" },
          ]}
        />
        <FilterSelect paramKey="status" label="Status" options={[{ value: "done", label: "Done" }]} />
        <div className="ml-auto text-sm text-ink-muted">
          {status === "open" ? (
            <>
              {described.length} open
              {overdueCount > 0 && (
                <>
                  {" · "}
                  <span className="text-loss">{overdueCount} overdue</span>
                </>
              )}
            </>
          ) : (
            <>{described.length} done</>
          )}
        </div>
      </div>

      {ordered.length === 0 ? (
        <EmptyState
          title={tasks.length === 0 ? (status === "open" ? "Nothing open" : "Nothing done yet") : "No tasks match"}
          description={
            tasks.length === 0
              ? status === "open"
                ? "Every task is done. New ones show up here as you add them, and as the assistant proposes them."
                : "Tasks you mark done will be listed here."
              : "Try a different search term or clear a filter."
          }
        />
      ) : (
        <div className="flex flex-col gap-6">
          {ordered.map((group) => (
            <div key={group.key}>
              <div className="mb-1 flex items-baseline justify-between border-b border-rule pb-2">
                {group.href ? (
                  <Link href={group.href} className="text-sm font-semibold hover:underline">
                    {group.name}
                  </Link>
                ) : (
                  <span className="text-sm font-semibold">{group.name}</span>
                )}
                <div className="text-xs text-ink-muted">
                  {group.note ? `${group.note} · ` : ""}
                  {group.items.length} {status}
                  {!advisorId && ` · ${group.items[0]!.advisor.initials}`}
                </div>
              </div>
              <div>
                {group.items.map((t) => (
                  <TaskRow
                    key={t.id}
                    task={{ id: t.id, title: t.title, detail: t.detail, priority: t.priority, status: t.status, source: t.source, due: t.due }}
                  />
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </Shell>
  );
}

async function headerCounts() {
  const [openTasks, openInsights] = await Promise.all([
    prisma.task.count({ where: { status: "open" } }),
    prisma.insight.count({ where: { dismissed: false } }),
  ]);
  return { openTasks, openInsights };
}

function Shell({ view, counts, children }: { view: View; counts: { openTasks: number; openInsights: number }; children: React.ReactNode }) {
  const tab = (id: View, label: string, count: number) => {
    const active = view === id;
    return (
      <Link
        href={id === "tasks" ? "/tasks" : "/tasks?view=insights"}
        aria-current={active ? "page" : undefined}
        className={`-mb-px border-b-2 px-1 pb-2 text-sm ${active ? "border-pine font-semibold text-ink" : "border-transparent text-ink-muted hover:text-ink"}`}
      >
        {label} <span className="tabular text-xs text-ink-muted">{count}</span>
      </Link>
    );
  };
  return (
    <div className="px-8 py-7">
      <h1 className="mb-3 text-lg font-semibold">Tasks</h1>
      <div className="mb-5 flex gap-5 border-b border-rule">
        {tab("tasks", "Tasks", counts.openTasks)}
        {tab("insights", "Insights", counts.openInsights)}
      </div>
      {children}
    </div>
  );
}
