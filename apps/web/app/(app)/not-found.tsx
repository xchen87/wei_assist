import Link from "next/link";
import { EmptyState } from "@/components/ui/empty-state";

/** Household detail calls notFound() for an id that isn't on file — which
 * until now rendered Next's bare 404 outside the shell. */
export default function WorkspaceNotFound() {
  return (
    <div className="px-8 py-7">
      <h1 className="mb-4 text-lg font-semibold">Not found</h1>
      <EmptyState
        title="That record isn't on file"
        description="It may have been removed, or the link may be out of date. Household ids change when the demo database is reseeded."
        action={
          <Link
            href="/clients"
            className="inline-flex items-center rounded-control bg-pine px-3 py-1.5 text-xs font-semibold text-on-accent"
          >
            Back to Clients
          </Link>
        }
      />
    </div>
  );
}
