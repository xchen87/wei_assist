import type { Config } from "tailwindcss";

// Tokens mirror CLAUDE.md §7 exactly. Do not add colors, radii, or font
// sizes here that aren't in that section — the whole point of a small,
// named scale is that nothing needs to be invented per-component.
const config: Config = {
  darkMode: ["class"],
  content: ["./app/**/*.{ts,tsx}", "./components/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        ink: "var(--ink)",
        "ink-muted": "var(--ink-muted)",
        paper: "var(--paper)",
        surface: "var(--surface)",
        rule: "var(--rule)",
        pine: "var(--pine)",
        "pine-tint": "var(--pine-tint)",
        brass: "var(--brass)",
        "brass-tint": "var(--brass-tint)",
        gain: "var(--gain)",
        loss: "var(--loss)",
        "loss-tint": "var(--loss-tint)",
        info: "var(--info)",
        "on-accent": "var(--on-accent)",
      },
      fontFamily: {
        sans: ["var(--font-public-sans)", "system-ui", "-apple-system", "sans-serif"],
        serif: ["var(--font-source-serif)", "Georgia", "serif"],
      },
      fontSize: {
        xs: ["12px", { lineHeight: "1.5" }],
        sm: ["13px", { lineHeight: "1.5" }],
        base: ["14px", { lineHeight: "1.5" }],
        md: ["16px", { lineHeight: "1.5" }],
        lg: ["20px", { lineHeight: "1.3" }],
        xl: ["26px", { lineHeight: "1.2" }],
        "2xl": ["34px", { lineHeight: "1.15" }],
      },
      borderRadius: {
        control: "6px",
        card: "10px",
        cell: "0px",
      },
      spacing: {
        row: "40px",
        "row-compact": "32px",
        "nav-logo": "22px", // gap below the nav-rail logo mark, per design/*.dc.html
      },
    },
  },
  plugins: [],
};

export default config;
