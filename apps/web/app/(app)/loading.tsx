/** Two jobs. The obvious one is not showing a blank column while a page's
 * queries run. The less obvious one is that this creates the Suspense
 * boundary the workspace column was missing: without it a server component
 * that throws takes down the whole document — the nav and chat dock with
 * it — because the failure happens while the shell is still rendering and
 * React has nothing to fall back to. With it, the shell streams first and
 * a failure lands in error.tsx instead. Verified by pointing the app at an
 * unreachable database.
 *
 * The trade-off, which is deliberate: once the shell has streamed, the
 * response status is already sent, so a missing household returns 200 with
 * the not-found UI rather than a 404, and a failed page returns 200 rather
 * than a 500. For an advisor tool behind a login that is the better half of
 * the bargain — nobody is crawling these URLs, and an error that keeps the
 * nav and the chat dock alive is worth more than a status code no human
 * sees. Anything that later asserts on HTTP status (monitoring, e2e) has to
 * know this. */
export default function WorkspaceLoading() {
  return (
    <div className="px-8 py-7" aria-busy="true" aria-live="polite">
      <div className="sr-only">Loading</div>
      <div className="mb-5 h-5 w-40 animate-pulse rounded-control bg-rule" />
      <div className="flex flex-col gap-2.5">
        {[88, 96, 72, 92, 64].map((width, i) => (
          <div
            key={i}
            className="h-9 animate-pulse rounded-control bg-rule opacity-60"
            style={{ width: `${width}%` }}
          />
        ))}
      </div>
    </div>
  );
}
