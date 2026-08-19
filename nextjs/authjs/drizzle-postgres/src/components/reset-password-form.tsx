"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export function ResetPasswordForm({ token }: { token?: string }) {
  const router = useRouter();
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(token ? null : "This reset link is missing its token.");
  const [pending, setPending] = useState(false);
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!token) return;
    setPending(true);
    const response = await fetch("/api/reset-password", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ token, password }) });
    const data = (await response.json().catch(() => null)) as { message?: string } | null;
    if (!response.ok) setError(data?.message ?? "Unable to reset the password.");
    else router.push("/login?reset=1");
    setPending(false);
  }
  return <form className="flex flex-col gap-4" onSubmit={submit}><div className="grid gap-2"><Label htmlFor="password">New password</Label><Input id="password" type="password" minLength={8} required value={password} onChange={(event) => setPassword(event.target.value)} /></div>{error ? <p className="text-sm text-destructive">{error}</p> : null}<Button type="submit" className="w-full" disabled={pending || !token}>{pending ? "Updating..." : "Update password"}</Button><Link href="/login" className="text-center text-sm text-muted-foreground hover:text-foreground">Back to sign in</Link></form>;
}
