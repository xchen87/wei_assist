import { RouteEmptyState } from "@/components/ui/RouteEmptyState";

export default function TasksPage() {
  return (
    <RouteEmptyState
      title="Tasks"
      description="Your task inbox, grouped by household, will show here once tasks start getting created."
      action="Create a task"
    />
  );
}
