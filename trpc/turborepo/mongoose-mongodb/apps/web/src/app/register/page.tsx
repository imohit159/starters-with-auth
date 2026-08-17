import { AuthShell } from "@/features/auth/components/auth-shell";
import { RegisterForm } from "@/features/auth/components/register-form";

export default function RegisterPage() {
  return (
    <AuthShell title="Create account" description="Start with email and password, or Google.">
      <RegisterForm />
    </AuthShell>
  );
}
