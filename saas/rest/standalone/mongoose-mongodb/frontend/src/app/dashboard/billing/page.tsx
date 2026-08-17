import { Suspense } from "react";
import { BillingPanel } from "@/features/billing/components/billing-panel";
import { WorkspaceShell } from "@/features/orgs/components/workspace-shell";

export default function BillingPage() {
  return (
    <WorkspaceShell title="Billing">
      <Suspense fallback={<p className="text-sm text-muted-foreground">Loading billing...</p>}>
        <BillingPanel />
      </Suspense>
    </WorkspaceShell>
  );
}
