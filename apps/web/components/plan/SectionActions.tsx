import { Button } from "@/components/ui/Button";

export function SectionActions() {
  return (
    <>
      <Button variant="secondary" disabled title="Not wired up in this build">
        Refresh
      </Button>
      <Button variant="secondary" disabled title="Not wired up in this build">
        Export
      </Button>
      <Button variant="primary" disabled title="Not wired up in this build">
        Start review
      </Button>
    </>
  );
}
