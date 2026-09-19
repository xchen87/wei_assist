import { prisma } from "@meridian/db";
import { formatMoney } from "@/lib/format/money";

/** CLAUDE.md §9: build a compact descriptor of what the advisor is looking
 * at — entity type, id, a summary line, and the visible filter set — and
 * nothing more. Full household records never go into the prompt; the model
 * fetches what it needs through tools, which is also what keeps the audit
 * log honest about which records were actually read. */
export async function buildContextDescriptor(path: string | null): Promise<string | null> {
  if (!path) return null;

  const [pathname, search] = path.split("?");
  const filters = search
    ? Array.from(new URLSearchParams(search).entries())
        .map(([k, v]) => `${k}=${v}`)
        .join(", ")
    : null;

  const householdMatch = /^\/clients\/([A-Za-z0-9_-]+)(?:\/([a-z]+))?$/.exec(pathname ?? "");
  if (householdMatch) {
    const household = await prisma.household.findUnique({
      where: { id: householdMatch[1] },
      select: { id: true, name: true, segment: true, aumCents: true },
    });
    if (household) {
      const section = householdMatch[2] ?? "overview";
      return [
        "The advisor is currently looking at:",
        `- Household: ${household.name} (household_id ${household.id}, ${household.segment}, ${formatMoney(household.aumCents, { compact: true })} AUM)`,
        `- Section: ${section}`,
        "Resolve pronouns like \"they\" or \"this household\" to this record. Still call tools for any figure.",
      ].join("\n");
    }
  }

  const lines = [`The advisor is currently on the ${pathname} page.`];
  if (filters) lines.push(`Visible filters: ${filters}.`);
  lines.push("Nothing about this is a fact about a client — call tools for anything you assert.");
  return lines.join("\n");
}
