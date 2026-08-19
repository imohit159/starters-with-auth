import { AuthShell } from "@/components/auth-shell";
import { VerifyEmailForm } from "@/components/verify-email-form";

export default async function VerifyEmailPage({ searchParams }: { searchParams: Promise<{ token?: string }> }) {
  const { token } = await searchParams;
  return <AuthShell title="Verify your email" description="Confirm ownership of the address used for your account."><VerifyEmailForm token={token} /></AuthShell>;
}
