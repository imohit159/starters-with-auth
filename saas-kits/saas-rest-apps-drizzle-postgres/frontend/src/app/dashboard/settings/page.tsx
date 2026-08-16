import { MembersPanel } from "@/features/orgs/components/members-panel";
import { WorkspaceShell } from "@/features/orgs/components/workspace-shell";

export default function SettingsPage() {
  return (
    <WorkspaceShell title="Members">
      <MembersPanel />
    </WorkspaceShell>
  );
}
