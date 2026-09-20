/** Client-side CSV export. Values are written raw — dollars as numbers,
 * dates as ISO — because the destination is a spreadsheet, not a screen;
 * lib/format exists for the display path and `toDollars` is still the only
 * thing that turns cents into dollars. */
export function toCsv(headers: string[], rows: (string | number)[][]): string {
  const escape = (value: string | number) => {
    const text = String(value);
    return /[",\n]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text;
  };
  return [headers, ...rows].map((row) => row.map(escape).join(",")).join("\n");
}

export function downloadCsv(filename: string, csv: string): void {
  // A BOM so Excel reads the UTF-8 household names correctly.
  const blob = new Blob(["﻿" + csv], { type: "text/csv;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  link.click();
  URL.revokeObjectURL(url);
}
