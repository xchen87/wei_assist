/** "Dana Whitfield" -> "D. Whitfield" — the abbreviated form used in dense
 * table cells (Clients list Advisor column), per design/Clients.dc.html. */
export function formatShortName(fullName: string): string {
  const parts = fullName.trim().split(/\s+/);
  if (parts.length < 2) return fullName;
  const first = parts[0]!;
  const rest = parts.slice(1).join(" ");
  return `${first[0]}. ${rest}`;
}
