"use client";

import Link from "next/link";
import { useState, type FormEvent } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export function ForgotPasswordForm() {
  const [email, setEmail] = useState("");
  const [message, setMessage] = useState<string | null>(null);
  const [pending, setPending] = useState(false);
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setPending(true);
    const response = await fetch("/api/forgot-password", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ email }) });
    const data = (await response.json()) as { message?: string };
    setMessage(data.message ?? "If that address exists, a reset link is on its way.");
    setPending(false);
  }
  return <form className="flex flex-col gap-4" onSubmit={submit}><div className="grid gap-2"><Label htmlFor="email">Email</Label><Input id="email" type="email" required value={email} onChange={(event) => setEmail(event.target.value)} /></div>{message ? <p className="text-sm text-emerald-600">{message}</p> : null}<Button type="submit" className="w-full" disabled={pending}>{pending ? "Sending..." : "Send reset link"}</Button><Link href="/login" className="text-center text-sm text-muted-foreground hover:text-foreground">Back to sign in</Link></form>;
}
