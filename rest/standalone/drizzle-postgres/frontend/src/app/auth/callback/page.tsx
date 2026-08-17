import { AuthShell } from "@/features/auth/components/auth-shell";
import { AuthCallbackPanel } from "@/features/auth/components/auth-callback-panel";

export default function AuthCallbackPage() {
  return (
    <AuthShell title="Almost there" description="Completing your Google sign-in.">
      <AuthCallbackPanel />
    </AuthShell>
  );
}
