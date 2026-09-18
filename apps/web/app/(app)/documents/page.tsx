import { RouteEmptyState } from "@/components/ui/RouteEmptyState";

export default function DocumentsPage() {
  return (
    <RouteEmptyState
      title="Documents"
      description="The firm-wide document vault — category rail, status, and source — will show here once documents start getting uploaded or synced."
      action="Upload a document"
    />
  );
}
