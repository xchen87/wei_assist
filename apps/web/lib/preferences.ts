/** Per-user display preferences (CLAUDE.md §7: dark mode, and two density
 * modes set per user in Settings). There's no User table and no auth yet
 * (D-014), so these live in localStorage on the device rather than being
 * persisted per user server-side — a real `UserPreference` row replaces the
 * storage calls here without changing how the rest of the app reads them,
 * since everything downstream keys off the two attributes on <html>. */

export const THEME_KEY = "meridian.theme";
export const DENSITY_KEY = "meridian.density";

export type Theme = "light" | "dark" | "system";
export type Density = "comfortable" | "compact";

export const THEMES: { value: Theme; label: string; description: string }[] = [
  { value: "light", label: "Light", description: "Warm paper background, dark ink." },
  { value: "dark", label: "Dark", description: "Inverted tokens, lightened pine and brass." },
  { value: "system", label: "System", description: "Follows the operating system setting." },
];

export const DENSITIES: { value: Density; label: string; description: string }[] = [
  { value: "comfortable", label: "Comfortable", description: "40px table rows." },
  { value: "compact", label: "Compact", description: "32px table rows — more on screen at once." },
];

export function resolveTheme(theme: Theme): "light" | "dark" {
  if (theme !== "system") return theme;
  return window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
}

export function applyPreferences(theme: Theme, density: Density): void {
  document.documentElement.setAttribute("data-theme", resolveTheme(theme));
  document.documentElement.setAttribute("data-density", density);
}

/** Runs in <head> before first paint, so a dark-theme user never sees a
 * flash of the light palette. Inlined as a string because it has to
 * execute before React hydrates — keep it dependency-free and in sync with
 * applyPreferences above. */
export const PREFERENCES_BOOT_SCRIPT = `(function(){try{var t=localStorage.getItem(${JSON.stringify(
  THEME_KEY,
)})||"system";var d=localStorage.getItem(${JSON.stringify(
  DENSITY_KEY,
)})||"comfortable";var r=t==="system"?(window.matchMedia("(prefers-color-scheme: dark)").matches?"dark":"light"):t;var e=document.documentElement;e.setAttribute("data-theme",r);e.setAttribute("data-density",d);}catch(_){}})();`;
