/** Per-user display preferences (CLAUDE.md §7: dark mode, and two density
 * modes set per user in Settings). There's no User table and no auth yet
 * (D-014), so these live in localStorage on the device rather than being
 * persisted per user server-side — a real `UserPreference` row replaces the
 * storage calls here without changing how the rest of the app reads them,
 * since everything downstream keys off the two attributes on <html>. */

export const THEME_KEY = "meridian.theme";
export const DENSITY_KEY = "meridian.density";
export const NAV_KEY = "meridian.nav";
export const CHAT_KEY = "meridian.chat.dock";

/** CLAUDE.md §4: the chat dock is 380px wide, draggable to 560px, and
 * collapses to a rail button — with that state persisting per user. */
export const CHAT_MIN_WIDTH = 380;
export const CHAT_MAX_WIDTH = 560;
export const CHAT_RAIL_WIDTH = 56;

export type Theme = "light" | "dark" | "system";
export type Density = "comfortable" | "compact";
/** Rail: icons only, expanding over the workspace on hover. Pinned: labels
 * always visible, workspace shifted across to make room (CLAUDE.md §4). */
export type NavMode = "rail" | "pinned";

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

export type ChatDockState = { width: number; collapsed: boolean };

export function clampChatWidth(width: number): number {
  return Math.min(Math.max(Math.round(width), CHAT_MIN_WIDTH), CHAT_MAX_WIDTH);
}

/** Width lives as a CSS custom property so the boot script can set it
 * before first paint — a dock that renders at 380px and then jumps to the
 * 520px the advisor dragged it to is worse than one that never moved. */
export function applyChatDock(state: ChatDockState): void {
  const root = document.documentElement;
  root.style.setProperty("--chat-width", `${clampChatWidth(state.width)}px`);
  root.setAttribute("data-chat", state.collapsed ? "collapsed" : "open");
  try {
    localStorage.setItem(CHAT_KEY, JSON.stringify(state));
  } catch {
    // Applies for this session; just won't survive a reload.
  }
}

export function readChatDock(): ChatDockState {
  const fallback: ChatDockState = { width: CHAT_MIN_WIDTH, collapsed: false };
  if (typeof window === "undefined") return fallback;
  try {
    const raw = localStorage.getItem(CHAT_KEY);
    if (!raw) return fallback;
    const saved = JSON.parse(raw) as Partial<ChatDockState>;
    return {
      width: clampChatWidth(typeof saved.width === "number" ? saved.width : CHAT_MIN_WIDTH),
      collapsed: saved.collapsed === true,
    };
  } catch {
    return fallback;
  }
}

export function applyNavMode(mode: NavMode): void {
  document.documentElement.setAttribute("data-nav", mode);
  try {
    localStorage.setItem(NAV_KEY, mode);
  } catch {
    // Same as the other preferences: it still applies for this session.
  }
}

/** Runs in <head> before first paint, so a dark-theme user never sees a
 * flash of the light palette. Inlined as a string because it has to
 * execute before React hydrates — keep it dependency-free and in sync with
 * applyPreferences above. */
export const PREFERENCES_BOOT_SCRIPT = `(function(){try{var t=localStorage.getItem(${JSON.stringify(
  THEME_KEY,
)})||"system";var d=localStorage.getItem(${JSON.stringify(
  DENSITY_KEY,
)})||"comfortable";var r=t==="system"?(window.matchMedia("(prefers-color-scheme: dark)").matches?"dark":"light"):t;var n=localStorage.getItem(${JSON.stringify(
  NAV_KEY,
)})||"rail";var c={};try{c=JSON.parse(localStorage.getItem(${JSON.stringify(
  CHAT_KEY,
)})||"{}")}catch(_){}var cw=Math.min(Math.max(typeof c.width==="number"?c.width:${CHAT_MIN_WIDTH},${CHAT_MIN_WIDTH}),${CHAT_MAX_WIDTH});var e=document.documentElement;e.setAttribute("data-theme",r);e.setAttribute("data-density",d);e.setAttribute("data-nav",n);e.setAttribute("data-chat",c.collapsed===true?"collapsed":"open");e.style.setProperty("--chat-width",cw+"px");}catch(_){}})();`;
