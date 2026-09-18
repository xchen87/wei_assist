import { RouteEmptyState } from "@/components/ui/RouteEmptyState";

export default function SchedulePage() {
  return (
    <RouteEmptyState
      title="Schedule"
      description="Calendar views and meeting prep packets will show here once calendar sync is connected."
      action="Connect calendar"
    />
  );
}
