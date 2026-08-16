import { Suspense } from "react";
import { AuthShell } from "@/features/auth/components/auth-shell";
import { VerifyEmailPanel } from "@/features/auth/components/verify-email-panel";

export default function VerifyEmailPage() {
  return (
    <AuthShell title="Verify email" description="Confirming the address on your account.">
      <Suspense fallback={<p className="text-sm text-muted-foreground">Loading...</p>}>
        <VerifyEmailPanel />
      </Suspense>
    </AuthShell>
  );
}
