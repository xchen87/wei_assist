"use client";

import { useRouter, useSearchParams, usePathname } from "next/navigation";

/** A `<select>` that pushes its choice into the URL's search params on
 * change, so a filtered view stays shareable (CLAUDE.md §6's URL-state
 * rule) without needing a submit button. */
export function FilterSelect({
  paramKey,
  label,
  options,
}: {
  paramKey: string;
  label: string;
  options: { value: string; label: string }[];
}) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const current = searchParams.get(paramKey) ?? "";

  function onChange(e: React.ChangeEvent<HTMLSelectElement>) {
    const params = new URLSearchParams(searchParams.toString());
    if (e.target.value) {
      params.set(paramKey, e.target.value);
    } else {
      params.delete(paramKey);
    }
    router.push(`${pathname}?${params.toString()}`);
  }

  return (
    <select
      value={current}
      onChange={onChange}
      aria-label={label}
      className="rounded-control border border-rule bg-surface px-2.5 py-1.5 text-xs text-ink"
    >
      <option value="">
        {label}: All
      </option>
      {options.map((o) => (
        <option key={o.value} value={o.value}>
          {label}: {o.label}
        </option>
      ))}
    </select>
  );
}
