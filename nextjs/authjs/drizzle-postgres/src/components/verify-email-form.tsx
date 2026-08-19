"use client";

import Link from "next/link";
import { useState, type FormEvent } from "react";
import { Button } from "@/components/ui/button";

export function VerifyEmailForm({ token }: { token?: string }) {
  const [message, setMessage] = useState(token ? "" : "This verification link is missing its token.");
  const [pending, setPending] = useState(false);
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!token) return;
    setPending(true);
    const response = await fetch("/api/verify-email", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ token }) });
    const data = (await response.json().catch(() => null)) as { message?: string } | null;
    setMessage(data?.message ?? (response.ok ? "Email verified." : "Unable to verify this email."));
    setPending(false);
  }
  return <div className="grid gap-4"><form onSubmit={submit}><Button type="submit" className="w-full" disabled={pending || !token}>{pending ? "Verifying..." : "Verify email"}</Button></form>{message ? <p className="text-center text-sm text-muted-foreground">{message}</p> : null}<Link href="/login" className="text-center text-sm text-muted-foreground hover:text-foreground">Back to sign in</Link></div>;
}
