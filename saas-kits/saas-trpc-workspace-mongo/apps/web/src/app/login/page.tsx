import { AuthShell } from "@/features/auth/components/auth-shell";
import { LoginForm } from "@/features/auth/components/login-form";

export default function LoginPage() {
  return (
    <AuthShell title="Sign in" description="Use your email or continue with Google.">
      <LoginForm />
    </AuthShell>
  );
}
