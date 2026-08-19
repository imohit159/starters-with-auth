"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { GoogleButton } from "@/components/google-button";

export function RegisterForm() {
  const router = useRouter();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setPending(true);
    setError(null);
    const response = await fetch("/api/register", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ name, email, password }) });
    const data = (await response.json().catch(() => null)) as { message?: string } | null;
    if (!response.ok) {
      setError(data?.message ?? "Unable to create the account.");
      setPending(false);
      return;
    }
    router.push("/login?registered=1");
  }

  return <div className="grid gap-4"><form className="flex flex-col gap-4" onSubmit={submit}><div className="grid gap-2"><Label htmlFor="name">Name</Label><Input id="name" autoComplete="name" required value={name} onChange={(event) => setName(event.target.value)} /></div><div className="grid gap-2"><Label htmlFor="email">Email</Label><Input id="email" type="email" autoComplete="email" required value={email} onChange={(event) => setEmail(event.target.value)} /></div><div className="grid gap-2"><Label htmlFor="password">Password</Label><Input id="password" type="password" autoComplete="new-password" minLength={8} required value={password} onChange={(event) => setPassword(event.target.value)} /></div>{error ? <p className="text-sm text-destructive">{error}</p> : null}<Button type="submit" className="w-full" disabled={pending}>{pending ? "Creating account..." : "Create account"}</Button></form><GoogleButton /><p className="text-center text-sm text-muted-foreground">Already have an account? <Link href="/login" className="font-medium text-foreground hover:underline">Sign in</Link></p></div>;
}
