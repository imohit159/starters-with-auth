import { DashboardPanel } from "@/features/orgs/components/dashboard-panel";
import { WorkspaceShell } from "@/features/orgs/components/workspace-shell";

export default function DashboardPage() {
  return (
    <WorkspaceShell title="Workspace">
      <DashboardPanel />
    </WorkspaceShell>
  );
}
