import { AuthShell } from "@/components/auth-shell";
import { ForgotPasswordForm } from "@/components/forgot-password-form";

export default function ForgotPasswordPage() {
  return <AuthShell title="Forgot password" description="We will send a one-time reset link if the account exists."><ForgotPasswordForm /></AuthShell>;
}
