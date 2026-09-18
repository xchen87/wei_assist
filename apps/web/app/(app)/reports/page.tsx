import { RouteEmptyState } from "@/components/ui/RouteEmptyState";

export default function ReportsPage() {
  return (
    <RouteEmptyState
      title="Reports"
      description="The report builder — section picker, branding, and delivery — will show here once a household and template are selected."
      action="New report"
    />
  );
}
