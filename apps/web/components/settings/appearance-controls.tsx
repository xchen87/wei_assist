"use client";

import { useEffect, useState } from "react";
import {
  applyPreferences,
  DENSITIES,
  DENSITY_KEY,
  THEME_KEY,
  THEMES,
  type Density,
  type Theme,
} from "@/lib/preferences";

/** The two display preferences that actually take effect. Both write to
 * localStorage and re-apply the <html> attributes immediately, so the
 * change is visible on this page as you make it — no Save button, because
 * there's nothing to submit. */
export function AppearanceControls() {
  const [theme, setTheme] = useState<Theme>("system");
  const [density, setDensity] = useState<Density>("comfortable");
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    const storedTheme = localStorage.getItem(THEME_KEY) as Theme | null;
    const storedDensity = localStorage.getItem(DENSITY_KEY) as Density | null;
    if (storedTheme && THEMES.some((t) => t.value === storedTheme)) setTheme(storedTheme);
    if (storedDensity && DENSITIES.some((d) => d.value === storedDensity)) setDensity(storedDensity);
    setMounted(true);
  }, []);

  // On "System", follow the OS while the page is open, not just at boot.
  useEffect(() => {
    if (theme !== "system") return;
    const media = window.matchMedia("(prefers-color-scheme: dark)");
    const onChange = () => applyPreferences("system", density);
    media.addEventListener("change", onChange);
    return () => media.removeEventListener("change", onChange);
  }, [theme, density]);

  const choose = (nextTheme: Theme, nextDensity: Density) => {
    setTheme(nextTheme);
    setDensity(nextDensity);
    try {
      localStorage.setItem(THEME_KEY, nextTheme);
      localStorage.setItem(DENSITY_KEY, nextDensity);
    } catch {
      // Private browsing or blocked storage: the change still applies for
      // this session, it just won't survive a reload.
    }
    applyPreferences(nextTheme, nextDensity);
  };

  return (
    <>
      <Segmented
        legend="Color theme"
        name="theme"
        options={THEMES}
        value={mounted ? theme : null}
        onChange={(v) => choose(v as Theme, density)}
      />
      <Segmented
        legend="Density"
        name="density"
        options={DENSITIES}
        value={mounted ? density : null}
        onChange={(v) => choose(theme, v as Density)}
      />
    </>
  );
}

/** Radio inputs rather than buttons: arrow-key navigation and the
 * checked state come free, and there's no primitive for this in
 * components/ui yet (no Radix — see D-014). */
function Segmented({
  legend,
  name,
  options,
  value,
  onChange,
}: {
  legend: string;
  name: string;
  options: readonly { value: string; label: string; description: string }[];
  value: string | null;
  onChange: (value: string) => void;
}) {
  return (
    <fieldset className="border-b border-rule py-3.5 last:border-b-0">
      <legend className="sr-only">{legend}</legend>
      <div className="flex items-center justify-between gap-6">
        <div className="min-w-0">
          <div className="text-sm">{legend}</div>
          <div className="mt-0.5 text-xs text-ink-muted">
            {/* Before mount, storage hasn't been read yet — say so rather than
                describing whichever option happens to be the default. */}
            {value ? options.find((o) => o.value === value)?.description : " "}
          </div>
        </div>
        <div className="flex shrink-0 overflow-hidden rounded-control border border-rule">
          {options.map((o) => {
            const active = value === o.value;
            return (
              <label
                key={o.value}
                className={`cursor-pointer border-r border-rule px-3 py-1.5 text-xs font-semibold last:border-r-0 focus-within:outline focus-within:outline-2 focus-within:outline-offset-[-2px] focus-within:outline-pine ${
                  active ? "bg-pine text-on-accent" : "bg-surface text-ink-muted hover:text-ink"
                }`}
              >
                <input
                  type="radio"
                  name={name}
                  value={o.value}
                  checked={active}
                  onChange={() => onChange(o.value)}
                  className="sr-only"
                />
                {o.label}
              </label>
            );
          })}
        </div>
      </div>
    </fieldset>
  );
}
