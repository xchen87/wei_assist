import Link from "next/link";
import { prisma } from "@meridian/db";
import { formatSignedPercent } from "@/lib/format/percent";
import { formatMonthYear } from "@/lib/format/date";

export const dynamic = "force-dynamic";

const SECTIONS = [
  { key: "summary", label: "Executive summary", included: true },
  { key: "balance", label: "Balance sheet", included: true },
  { key: "allocation", label: "Allocation", included: true },
  { key: "goals", label: "Goals progress", included: true },
  { key: "retirement", label: "Retirement projection", included: false },
  { key: "disclosures", label: "Disclosures", included: true },
] as const;

/** A real preview of one household's report, per design/Reports.dc.html —
 * the executive summary and net-worth chart are composed from that
 * household's actual data, not the design mockup's fixed Ramirez text.
 * The section picker, branding, and delivery/schedule controls in the
 * design are a genuine authoring UI (drag-reorder, PDF export, email
 * scheduling) that needs a rendering/delivery decision this pass doesn't
 * make (no PDF library or email infra chosen yet — see PROGRESS.md) —
 * shown here as real-looking but explicitly disabled, same pattern as
 * other not-yet-wired controls elsewhere in the app, rather than either
 * faking an "it works" interaction or hiding the whole feature. */
export default async function ReportsPage({
  searchParams,
}: {
  searchParams: { household?: string };
}) {
  const households = await prisma.household.findMany({
    select: { id: true, name: true },
    orderBy: { name: "asc" },
  });
  const householdId = searchParams.household || households[0]?.id;
  const household = householdId
    ? await prisma.household.findUnique({
        where: { id: householdId },
        include: { members: true, advisor: true },
      })
    : null;

  if (!household) {
    return (
      <div className="px-8 py-7 text-sm text-ink-muted">No households on file to report on yet.</div>
    );
  }

  const cashDriftPts = household.cashPct - household.targetCashPct;
  const returnClause =
    household.ytdReturnPct >= 6
      ? "ahead of your long-term plan"
      : household.ytdReturnPct >= 0
        ? "roughly in line with your long-term plan"
        : "behind your long-term plan";
  const driftClause =
    Math.abs(cashDriftPts) > 1.5
      ? ` Cash has drifted ${cashDriftPts > 0 ? "above" : "below"} target as recent ${cashDriftPts > 0 ? "contributions await reinvestment" : "spending has drawn it down"}, and we recommend addressing this at our upcoming meeting.`
      : " Cash is tracking close to target.";
  const sectionCompleteness: [string, number][] = [
    ["Household", household.householdCompletenessPct],
    ["Cashflow", household.cashflowCompletenessPct],
    ["Balance", household.balanceCompletenessPct],
    ["Allocation", household.allocationCompletenessPct],
    ["Goals", household.goalsCompletenessPct],
    ["Retirement", household.retirementCompletenessPct],
    ["Tax", household.taxCompletenessPct],
    ["Protection", household.protectionCompletenessPct],
    ["Estate", household.estateCompletenessPct],
    ["Documents", household.documentsCompletenessPct],
    ["Activity", household.activityCompletenessPct],
  ];
  const weakest = sectionCompleteness.reduce((a, b) => (b[1] < a[1] ? b : a));
  const healthClause =
    household.completenessPct >= 80
      ? "strong"
      : household.completenessPct >= 60
        ? "solid"
        : "developing";

  const executiveSummary = `Your portfolio returned ${formatSignedPercent(household.ytdReturnPct)} year-to-date, ${returnClause}.${driftClause} Overall plan health remains ${healthClause} at ${household.completenessPct}% complete, with ${weakest[0]} the primary section needing attention.`;

  const compositionParts = [
    { label: "Investments", cents: household.investmentAccountsCents, color: "var(--pine)" },
    { label: "Real estate", cents: household.realEstateCents, color: "var(--brass)" },
    { label: "Cash & other", cents: household.cashCents + household.otherAssetsCents, color: "var(--info)" },
  ];

  const primary = household.members.find((m) => m.role === "Primary") ?? household.members[0];

  return (
    <div className="flex h-full">
      {/* Section picker */}
      <div className="w-[220px] shrink-0 overflow-y-auto border-r border-rule bg-surface px-3 py-5">
        <div className="mb-3 px-2 text-xs font-semibold text-ink-muted">REPORT SECTIONS</div>
        <div className="flex flex-col gap-px">
          {SECTIONS.map((s) => (
            <div
              key={s.key}
              title="Not wired up in this build"
              className={`flex items-center gap-2.5 rounded-control px-2.5 py-2 text-sm ${
                s.key === "summary" ? "bg-pine-tint font-semibold text-pine" : s.included ? "text-ink" : "text-ink-muted"
              }`}
            >
              <div
                className="h-3.5 w-3.5 shrink-0 rounded-control"
                style={s.included ? { background: "var(--pine)" } : { border: "1.4px solid var(--rule)" }}
              />
              <div className="flex-1">{s.label}</div>
            </div>
          ))}
        </div>
      </div>

      {/* Preview */}
      <div className="flex-1 overflow-y-auto bg-paper">
        <div className="flex items-center justify-between border-b border-rule px-7 py-5">
          <div className="text-sm text-ink-muted">Previewing — Executive summary</div>
          <div className="flex gap-2">
            <button disabled title="Not wired up in this build" className="rounded-control border border-rule px-3.5 py-1.5 text-sm opacity-60">
              Save draft
            </button>
            <button disabled title="Not wired up in this build" className="rounded-control bg-pine px-3.5 py-1.5 text-sm font-semibold text-on-accent opacity-60">
              Export PDF
            </button>
          </div>
        </div>

        <div className="flex justify-center p-8">
          <div className="w-[480px] border border-rule bg-surface p-9 shadow-[0_2px_8px_rgba(20,24,29,0.06)]">
            <div className="mb-9 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="h-5 w-5 rounded-control bg-pine" />
                <div className="text-xs font-semibold tracking-wide">Meridian</div>
              </div>
              <div className="text-xs text-ink-muted">Quarterly review</div>
            </div>

            <div className="font-serif mb-2 text-xl font-semibold leading-tight">{household.name}</div>
            <div className="font-serif mb-6 text-sm text-ink-muted">
              Prepared for the {formatMonthYear(new Date())} review
              {primary ? ` · ${household.advisor.name}` : ""}
            </div>

            <div className="mb-6 h-px w-full bg-rule" />

            <div className="font-serif mb-2.5 text-md font-semibold">Executive summary</div>
            <div className="font-serif mb-5 text-md leading-relaxed">{executiveSummary}</div>

            <div className="mb-2 border border-rule p-3.5">
              <div className="flex h-16">
                {compositionParts.map((p) => (
                  <div key={p.label} style={{ flexGrow: p.cents, background: p.color }} />
                ))}
              </div>
            </div>
            <div className="font-serif text-sm italic text-ink-muted">
              Figure 1. Net worth composition, as of {formatMonthYear(new Date())}.
            </div>

            <div className="mt-10 flex justify-between text-xs text-ink-muted">
              <div>Confidential — prepared exclusively for the {household.name.replace(" Household", "")} household</div>
              <div className="tabular">1</div>
            </div>
          </div>
        </div>
      </div>

      {/* Settings */}
      <div className="w-[280px] shrink-0 overflow-y-auto border-l border-rule bg-surface px-4 py-5">
        <div className="mb-4 text-sm font-semibold">Report settings</div>

        <div className="mb-1 text-xs text-ink-muted">Template</div>
        <div className="mb-4 flex items-center justify-between rounded-control border border-rule px-2.5 py-2 text-sm text-ink-muted" title="Not wired up in this build">
          Quarterly review
        </div>

        <div className="mb-1 text-xs text-ink-muted">Household</div>
        <div className="mb-4 flex flex-col gap-1">
          {households.map((h) => (
            <Link
              key={h.id}
              href={`/reports?household=${h.id}`}
              className={`rounded-control border px-2.5 py-2 text-sm ${
                h.id === household.id ? "border-pine bg-pine-tint font-semibold text-pine" : "border-rule text-ink hover:bg-paper"
              }`}
            >
              {h.name}
            </Link>
          ))}
        </div>

        <div className="mb-1.5 text-xs text-ink-muted">Branding</div>
        <div className="mb-4 flex items-center justify-between text-sm" title="Not wired up in this build">
          <div>Firm letterhead</div>
          <div className="relative h-5 w-[34px] rounded-full bg-pine opacity-60">
            <div className="absolute right-0.5 top-0.5 h-4 w-4 rounded-full bg-surface" />
          </div>
        </div>

        <div className="mb-5 h-px w-full bg-rule" />

        <div className="mb-1.5 text-xs text-ink-muted">Delivery</div>
        <div className="mb-2.5 flex items-center justify-between text-sm" title="Not wired up in this build">
          <div>Email to household</div>
          <div className="relative h-5 w-[34px] rounded-full bg-pine opacity-60">
            <div className="absolute right-0.5 top-0.5 h-4 w-4 rounded-full bg-surface" />
          </div>
        </div>
        <div className="mb-4 flex flex-wrap gap-1.5">
          {household.members
            .filter((m) => m.role === "Primary" || m.role === "Spouse")
            .map((m) => (
              <div key={m.id} className="rounded-control border border-rule bg-paper px-2 py-1 text-xs">
                {m.name}
              </div>
            ))}
        </div>

        <div className="mb-1 text-xs text-ink-muted">Schedule</div>
        <div className="text-sm text-ink-muted">Not scheduled — delivery isn&rsquo;t wired up in this build</div>
      </div>
    </div>
  );
}
