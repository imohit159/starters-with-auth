import Link from "next/link";
import { AuthShell } from "@/components/auth-shell";

export default function VerifyEmailPage() {
  return <AuthShell title="Check your email" description="Follow the verification link we sent you. The Better Auth endpoint will return you here when it is complete."><div className="grid gap-4 text-sm text-muted-foreground"><p>In development, the link is printed as a structured log when SMTP is not configured.</p><Link href="/login" className="text-center font-medium text-foreground hover:underline">Back to sign in</Link></div></AuthShell>;
}
