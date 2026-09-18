export function formatPercent(pct: number, decimals = 1): string {
  return `${pct.toFixed(decimals)}%`;
}

export function formatSignedPercent(pct: number, decimals = 1): string {
  const formatted = formatPercent(Math.abs(pct), decimals);
  return pct >= 0 ? `+${formatted}` : `−${formatted}`;
}

export function formatSignedPoints(pct: number, decimals = 1): string {
  const abs = Math.abs(pct).toFixed(decimals);
  return pct >= 0 ? `+${abs}pt` : `−${abs}pt`;
}
