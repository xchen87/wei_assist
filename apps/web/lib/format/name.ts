/** "Dana Whitfield" -> "D. Whitfield" — the abbreviated form used in dense
 * table cells (Clients list Advisor column), per design/Clients.dc.html. */
export function formatShortName(fullName: string): string {
  const parts = fullName.trim().split(/\s+/);
  if (parts.length < 2) return fullName;
  const first = parts[0]!;
  const rest = parts.slice(1).join(" ");
  return `${first[0]}. ${rest}`;
}

/** The word that tells one household from another.
 *
 * Household names in this book are a family name plus a generic tail —
 * "Achebe Household", "Alvarez Family Trust", "Chen–Okafor Household" —
 * so the first word is the half worth keeping when there is only room for
 * one. The leading article has to go first or "The Whitakers" shortens to
 * "The", which names nothing. Used where a label has to fit a space too
 * small for the full name, such as a small treemap cell.
 */
export function householdKeyword(name: string): string {
  const trimmed = name.trim().replace(/^the\s+/i, "");
  const first = trimmed.split(/\s+/)[0];
  return first && first.length > 0 ? first : name.trim();
}
