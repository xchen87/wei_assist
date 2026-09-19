import { AppearanceControls } from "@/components/settings/appearance-controls";
import { Panel, Row, SettingsPage } from "@/components/settings/settings-panel";

/** Unlike the rest of Settings, both controls here are real: they set
 * data-theme and data-density on <html>, which is all the token system
 * needs to repaint the whole app. They persist to localStorage rather than
 * to a user record because there's no User table or auth yet (D-014) —
 * noted on the page rather than implied to be a synced account setting. */

const SWATCHES: { token: string; label: string }[] = [
  { token: "--ink", label: "Ink" },
  { token: "--ink-muted", label: "Ink muted" },
  { token: "--paper", label: "Paper" },
  { token: "--surface", label: "Surface" },
  { token: "--rule", label: "Rule" },
  { token: "--pine", label: "Pine" },
  { token: "--brass", label: "Brass" },
  { token: "--gain", label: "Gain" },
  { token: "--loss", label: "Loss" },
  { token: "--info", label: "Info" },
];

export default function AppearanceSettingsPage() {
  return (
    <SettingsPage
      title="Appearance"
      description="How the workspace renders on this device."
      note={
        <>
          These two settings take effect immediately and persist in this browser. They are not tied to
          an account yet — there&rsquo;s no User table or auth in this build (DECISIONS.md D-014), so
          they won&rsquo;t follow you to another device. Density changes table row height; cards, forms,
          and the nav keep their spacing in both modes.
        </>
      }
    >
      <Panel title="Display" subtitle="Applied as you choose — nothing to save.">
        <AppearanceControls />
      </Panel>

      <Panel title="Palette" subtitle="The tokens every surface and chart draws from, in the current theme.">
        <div className="grid grid-cols-5 gap-3 py-4">
          {SWATCHES.map((s) => (
            <div key={s.token}>
              <div
                className="h-10 rounded-control border border-rule"
                style={{ background: `var(${s.token})` }}
              />
              <div className="mt-1.5 text-xs">{s.label}</div>
              <div className="text-xs text-ink-muted">{s.token}</div>
            </div>
          ))}
        </div>
      </Panel>

      <Panel title="Type" subtitle="Fixed by the design system (CLAUDE.md §7), not configurable.">
        <Row label="Interface and data" description="Tabular lining figures on every numeric cell.">
          <span className="font-sans">Public Sans</span>
        </Row>
        <Row label="Long-form narrative" description="Plan summaries, AI-drafted letters, report body copy.">
          <span className="font-serif text-md">Source Serif 4</span>
        </Row>
        <Row label="Scale" description="12 / 13 / 14 / 16 / 20 / 26 / 34, body 14/1.5.">
          <span className="tabular text-ink-muted">7 sizes</span>
        </Row>
      </Panel>
    </SettingsPage>
  );
}
