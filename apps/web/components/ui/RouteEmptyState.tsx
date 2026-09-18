import { EmptyState } from "./EmptyState";
import { Button } from "./Button";

export function RouteEmptyState({ title, description, action = "Get started" }: { title: string; description: string; action?: string }) {
  return (
    <div className="px-8 py-7">
      <h1 className="mb-4 text-lg font-semibold">{title}</h1>
      <EmptyState
        title={`No ${title.toLowerCase()} yet`}
        description={description}
        action={
          <Button variant="primary" disabled title="Not wired up in this build">
            {action}
          </Button>
        }
      />
    </div>
  );
}
