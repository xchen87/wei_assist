import { prisma } from "@meridian/db";
import { Badge } from "@/components/ui/Badge";
import { formatShortDate } from "@/lib/format/date";

export const dynamic = "force-dynamic";

export default async function CompliancePage() {
  const households = await prisma.household.findMany({ include: { advisor: true } });
  const overdue = households.filter((h) => h.reviewStatus === "overdue");
  const dueSoon = households.filter((h) => h.reviewStatus === "scheduled" && h.lastContactDays >= 30);

  return (
    <div className="px-8 py-7">
      <h1 className="mb-4 text-lg font-semibold">Compliance</h1>

      <div className="mb-6 grid grid-cols-3 gap-3.5">
        <StatCard label="Reviews overdue" value={String(overdue.length)} tone="loss" />
        <StatCard label="Due within 30 days" value={String(dueSoon.length)} />
        <StatCard label="Households tracked" value={String(households.length)} />
      </div>

      <div className="mb-3 text-sm font-semibold">Review status</div>
      <table className="mb-6 w-full border-collapse text-sm">
        <thead>
          <tr className="border-b border-rule text-xs font-semibold text-ink-muted">
            <th className="py-2 text-left">HOUSEHOLD</th>
            <th className="py-2 text-left">STATUS</th>
            <th className="py-2 text-right">NEXT REVIEW</th>
            <th className="py-2 text-right">LAST CONTACT</th>
            <th className="py-2 text-left">ADVISOR</th>
          </tr>
        </thead>
        <tbody>
          {households
            .slice()
            .sort((a, b) => a.lastContactDays - b.lastContactDays)
            .map((h) => (
              <tr key={h.id} className="border-b border-rule">
                <td className="py-2.5 font-medium">{h.name}</td>
                <td className="py-2.5">
                  <Badge tone={h.reviewStatus === "overdue" ? "loss" : "pine"}>
                    {h.reviewStatus === "overdue" ? "Overdue" : "Scheduled"}
                  </Badge>
                </td>
                <td className="tabular py-2.5 text-right">
                  {h.reviewStatus === "overdue" ? "—" : formatShortDate(h.nextReviewDate)}
                </td>
                <td className="tabular py-2.5 text-right">{h.lastContactDays}d ago</td>
                <td className="py-2.5 text-ink-muted">{h.advisor.name}</td>
              </tr>
            ))}
        </tbody>
      </table>

      <div className="rounded-card border border-dashed border-rule p-6 text-sm text-ink-muted">
        The append-only audit log (every read/write of client data, including AI tool calls, per CLAUDE.md §11)
        isn&rsquo;t wired up yet — there&rsquo;s no AuditEvent model in this pass. See PROGRESS.md.
      </div>
    </div>
  );
}

function StatCard({ label, value, tone }: { label: string; value: string; tone?: "loss" }) {
  return (
    <div className={`rounded-card border p-3.5 ${tone === "loss" ? "border-loss bg-loss-tint" : "border-rule"}`}>
      <div className={`tabular text-xl font-semibold ${tone === "loss" ? "text-loss" : ""}`}>{value}</div>
      <div className="mt-0.5 text-xs text-ink-muted">{label}</div>
    </div>
  );
}
