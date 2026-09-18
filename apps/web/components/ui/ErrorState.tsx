/** A widget that fails renders this instead of taking down the grid (§5). */
export function ErrorState({ title = "Couldn't load this", onRetry }: { title?: string; onRetry?: () => void }) {
  return (
    <div className="flex items-center justify-between rounded-card border border-rule bg-surface p-4">
      <div className="text-sm text-ink-muted">{title}</div>
      {onRetry ? (
        <button onClick={onRetry} className="text-xs font-semibold text-pine hover:underline">
          Retry
        </button>
      ) : null}
    </div>
  );
}
