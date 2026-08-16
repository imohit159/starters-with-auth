import { AuthShell } from "@/features/auth/components/auth-shell";
import { ForgotPasswordForm } from "@/features/auth/components/forgot-password-form";

export default function ForgotPasswordPage() {
  return (
    <AuthShell title="Reset password" description="We'll email a reset link if the account exists.">
      <ForgotPasswordForm />
    </AuthShell>
  );
}
