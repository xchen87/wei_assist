import { prisma } from "@meridian/db";
import { formatMoney } from "@/lib/format/money";

/** CLAUDE.md §9: build a compact descriptor of what the advisor is looking
 * at — entity type, id, a summary line, and the visible filter set — and
 * nothing more. Full household records never go into the prompt; the model
 * fetches what it needs through tools, which is also what keeps the audit
 * log honest about which records were actually read. */
export async function buildContextDescriptor(
  path: string | null,
  ids: string[] = [],
): Promise<string | null> {
  if (!path && ids.length === 0) return null;

  // A cohort handed over from the Clients list: names and ids only. What the
  // advisor can see is which households are in front of them, so that is what
  // the model is told — every figure still has to come from a tool.
  if (ids.length > 0) {
    const cohort = await prisma.household.findMany({
      where: { id: { in: ids.slice(0, 50) } },
      select: { id: true, name: true },
      orderBy: { name: "asc" },
    });
    if (cohort.length > 0) {
      return [
        `The advisor is looking at a filtered set of ${cohort.length} household${cohort.length === 1 ? "" : "s"} on ${path ?? "the Clients list"}:`,
        ...cohort.map((h) => `- ${h.name} (household_id ${h.id})`),
        "Answer about these households unless asked otherwise, and call tools for every figure.",
      ].join("\n");
    }
  }

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
