import { AuthShell } from "@/components/auth-shell";
import { LoginForm } from "@/components/login-form";

export default function LoginPage() { return <AuthShell title="Sign in" description="Use your email or continue with Google."><LoginForm /></AuthShell>; }
