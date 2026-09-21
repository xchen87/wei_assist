import { prisma } from "@meridian/db";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Panel, Row, SettingsPage, Unset } from "@/components/settings/settings-panel";
import { CURRENT_ADVISOR_NAME } from "@/lib/current-advisor";
import { centsToNumber, formatMoney } from "@/lib/format/money";

export const dynamic = "force-dynamic";

/** The five roles in CLAUDE.md §11. Listed here as the reference they are —
 * no Advisor row carries a role, so assigning one would be inventing a
 * permission model the app doesn't enforce. */
const ROLES: { name: string; access: string }[] = [
  { name: "Admin", access: "Everything, including org settings, billing, and team membership." },
  { name: "Advisor", access: "Full read and write on their own households and prospects." },
  { name: "Associate", access: "Read and write on assigned households; no org settings." },
  { name: "Compliance", access: "Reads everything, writes nothing except attestations." },
  { name: "ReadOnly", access: "Reads assigned households; no writes anywhere." },
];

export default async function TeamSettingsPage() {
  const advisors = await prisma.advisor.findMany({
    orderBy: { name: "asc" },
    include: {
      households: { select: { aumCents: true } },
      prospects: { select: { id: true } },
    },
  });

  const team = advisors.map((a) => ({
    id: a.id,
    name: a.name,
    initials: a.initials,
    capacityTarget: a.capacityTarget,
    householdCount: a.households.length,
    aumCents: a.households.reduce((sum, h) => sum + centsToNumber(h.aumCents), 0),
    prospectCount: a.prospects.length,
  }));

  return (
    <SettingsPage
      title="Team"
      description="Who's on the team, what they carry, and the roles that will govern access."
      note={
        <>
          Household counts, AUM, prospects, and capacity targets are real, read from each advisor&rsquo;s
          own records. Roles are not assigned: the <code>Advisor</code> model has no role field and
          nothing in the app enforces access yet, so the Roles panel above lists the reference model
          from CLAUDE.md §11, not a live permission set.
        </>
      }
    >
      <Panel
        title="Members"
        subtitle={`${team.length} ${team.length === 1 ? "advisor" : "advisors"} on this book.`}
        action={
          <Button disabled title="No auth or invitation flow in this build">
            Invite
          </Button>
        }
      >
        <div className="divide-y divide-rule">
          {team.map((m) => {
            const loadPct = Math.min(100, (m.householdCount / m.capacityTarget) * 100);
            const overCapacity = m.householdCount > m.capacityTarget;
            return (
              <div key={m.id} className="flex items-center gap-4 py-3.5">
                <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-pine-tint text-xs font-semibold text-pine">
                  {m.initials}
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-semibold">{m.name}</span>
                    {m.name === CURRENT_ADVISOR_NAME ? <Badge tone="pine">You</Badge> : null}
                  </div>
                  <div className="mt-0.5 text-xs text-ink-muted">
                    <span className="tabular">{formatMoney(m.aumCents, { compact: true })}</span> AUM ·{" "}
                    <span className="tabular">{m.prospectCount}</span>{" "}
                    {m.prospectCount === 1 ? "prospect" : "prospects"}
                  </div>
                </div>
                <div className="w-[148px] shrink-0">
                  <div className="mb-1 flex justify-between text-xs">
                    <span className="text-ink-muted">Capacity</span>
                    <span className={`tabular ${overCapacity ? "text-brass" : "text-ink-muted"}`}>
                      {m.householdCount} of {m.capacityTarget}
                    </span>
                  </div>
                  <div className="h-2 overflow-hidden rounded-control bg-paper">
                    <div
                      className={`h-full ${overCapacity ? "bg-brass" : "bg-pine"}`}
                      style={{ width: `${loadPct}%` }}
                    />
                  </div>
                </div>
                <div className="w-[92px] shrink-0 text-right text-sm">
                  <Unset>No role</Unset>
                </div>
              </div>
            );
          })}
        </div>
      </Panel>

      <Panel title="Roles" subtitle="The access model from CLAUDE.md §11. Not assignable or enforced yet.">
        {ROLES.map((r) => (
          <Row key={r.name} label={r.name} description={r.access}>
            <Unset>Unassigned</Unset>
          </Row>
        ))}
      </Panel>
    </SettingsPage>
  );
}
