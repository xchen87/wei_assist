import { prisma } from "@meridian/db";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { Panel, Row, SettingsPage, Unset } from "@/components/settings/settings-panel";

export const dynamic = "force-dynamic";

/** There is no subscription, plan, or invoice model in the schema, and no
 * billing provider wired up. Seats in use is a real count; everything else
 * is shown unset rather than filled with an invented plan name and price —
 * a fabricated dollar figure on a billing page is the one thing here a
 * reader would be most likely to take at face value. */
export default async function BillingSettingsPage() {
  const [advisors, households] = await Promise.all([
    prisma.advisor.count(),
    prisma.household.count(),
  ]);

  return (
    <SettingsPage
      title="Billing"
      description="Subscription, seats, and invoices."
      note={
        <>
          No plan, invoice, or payment model exists in the schema and no billing provider is connected,
          so nothing here shows a price. Seats in use and households are real counts, since those are
          what a seat- or household-based plan would be metered on.
        </>
      }
    >
      <Panel
        title="Subscription"
        action={
          <Button disabled title="No billing provider connected in this build">
            Change plan
          </Button>
        }
      >
        <Row label="Plan">
          <Unset>No subscription on file</Unset>
        </Row>
        <Row label="Billing period">
          <Unset />
        </Row>
        <Row label="Next charge">
          <Unset />
        </Row>
      </Panel>

      <Panel title="Usage" subtitle="What a seat- or household-based plan would meter.">
        <Row label="Seats in use" description="One per advisor on the team.">
          <span className="tabular">{advisors}</span>
        </Row>
        <Row label="Seats licensed">
          <Unset />
        </Row>
        <Row label="Households" description="Across the whole book.">
          <span className="tabular">{households}</span>
        </Row>
      </Panel>

      <Panel title="Payment">
        <Row label="Billing contact">
          <Unset />
        </Row>
        <Row label="Payment method">
          <Unset>None on file</Unset>
        </Row>
        <Row label="Billing address">
          <Unset />
        </Row>
      </Panel>

      <Panel title="Invoices">
        <div className="py-4">
          <EmptyState
            title="No invoices"
            description="Invoices appear here once a subscription exists and a billing provider is connected."
            action={
              <Button disabled title="No billing provider connected in this build">
                Add payment method
              </Button>
            }
          />
        </div>
      </Panel>
    </SettingsPage>
  );
}
