import { Suspense } from "react";
import { AcceptInvitePanel } from "@/features/orgs/components/accept-invite-panel";

export default function AcceptInvitePage() {
  return (
    <main className="flex min-h-svh items-center justify-center bg-muted/40 px-4 py-10">
      <Suspense fallback={<p className="text-sm text-muted-foreground">Loading invite...</p>}>
        <AcceptInvitePanel />
      </Suspense>
    </main>
  );
}
