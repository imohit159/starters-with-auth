import { AdminPanel } from "@/features/admin/components/admin-panel";
import { WorkspaceShell } from "@/features/orgs/components/workspace-shell";

export default function AdminPage() {
  return (
    <WorkspaceShell title="Admin">
      <AdminPanel />
    </WorkspaceShell>
  );
}
