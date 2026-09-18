import { RouteEmptyState } from "@/components/ui/RouteEmptyState";

export default function SettingsPage() {
  return (
    <RouteEmptyState
      title="Settings"
      description="Org, team, integrations, AI, and billing settings will show here. Auth isn't wired up in this build — every page runs as Dana Whitfield."
      action="Configure"
    />
  );
}
