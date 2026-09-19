import { prisma } from "@meridian/db";
import { Button } from "@/components/ui/button";
import { Panel, Row, SettingsPage, Unset } from "@/components/settings/settings-panel";
import { formatMoney } from "@/lib/format/money";

export const dynamic = "force-dynamic";

/** Organization. Two different kinds of content, deliberately not blended:
 * "Book at a glance" is real aggregate data over the seeded households, and
 * the firm-profile and retention rows are unset because there is no Org
 * record and no retention job behind them (D-014, CLAUDE.md §11) — shown as
 * empty fields with disabled controls rather than filled with an invented
 * firm name, CRD number, or retention window that would read as configured. */
export default async function OrganizationSettingsPage() {
  const [households, advisors, prospects, openInsights, totals] = await Promise.all([
    prisma.household.count(),
    prisma.advisor.count(),
    prisma.prospect.count(),
    prisma.insight.count({ where: { dismissed: false } }),
    prisma.household.aggregate({ _sum: { aumCents: true, heldAwayCents: true } }),
  ]);

  const aum = totals._sum.aumCents ?? 0;
  const heldAway = totals._sum.heldAwayCents ?? 0;

  return (
    <SettingsPage
      title="Organization"
      description="Firm details, the book these settings apply to, and records retention."
      note={
        <>
          The firm profile and retention rows are unset because there is no <code>Org</code> record in
          the schema yet and no retention job behind them — see PROGRESS.md and DECISIONS.md D-014.
          Book figures are real aggregates over the seeded households.
        </>
      }
    >
      <Panel
        title="Firm profile"
        subtitle="Identifies the firm on client-facing reports and disclosures."
        action={
          <Button disabled title="No Org record in the schema yet">
            Edit
          </Button>
        }
      >
        <Row label="Legal name">
          <Unset />
        </Row>
        <Row label="Doing business as">
          <Unset />
        </Row>
        <Row label="CRD number" description="Shown on disclosures and the firm brochure.">
          <Unset />
        </Row>
        <Row label="Primary office">
          <Unset />
        </Row>
        <Row label="Fiscal year end">
          <Unset />
        </Row>
      </Panel>

      <Panel title="Book at a glance" subtitle="What these settings currently apply to.">
        <Row label="Households">
          <span className="tabular">{households}</span>
        </Row>
        <Row label="Advisors">
          <span className="tabular">{advisors}</span>
        </Row>
        <Row label="Assets under management" description="Sum of every household's AUM.">
          <span className="tabular">{formatMoney(aum, { compact: true })}</span>
        </Row>
        <Row label="Held-away assets" description="Tracked but not custodied here.">
          <span className="tabular">{formatMoney(heldAway, { compact: true })}</span>
        </Row>
        <Row label="Prospects in pipeline">
          <span className="tabular">{prospects}</span>
        </Row>
        <Row label="Open insights" description="Across every household, undismissed.">
          <span className="tabular">{openInsights}</span>
        </Row>
      </Panel>

      <Panel
        title="Records retention"
        subtitle="Communications and AI drafts sent to clients are retained per SEC 17a-4 expectations (CLAUDE.md §11)."
        action={
          <Button disabled title="No retention job or audit log built yet">
            Configure
          </Button>
        }
      >
        <Row
          label="Communications retention"
          description="How long advisor–client messages and sent AI drafts are kept."
        >
          <Unset>Not configured</Unset>
        </Row>
        <Row label="Audit log" description="Append-only record of every read and write of client data.">
          <Unset>Not built</Unset>
        </Row>
        <Row label="Client data deletion" description="Soft-delete window before a household is purged.">
          <Unset>Not configured</Unset>
        </Row>
      </Panel>
    </SettingsPage>
  );
}
