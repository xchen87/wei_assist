import { RouteEmptyState } from "@/components/ui/RouteEmptyState";

export default function IntakePage() {
  return (
    <RouteEmptyState
      title="Intake"
      description="The guided onboarding flow for turning a prospect into a household will live here."
      action="Start intake"
    />
  );
}
