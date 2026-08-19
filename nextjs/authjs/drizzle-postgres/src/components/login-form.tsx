"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";
import { signIn } from "next-auth/react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { GoogleButton } from "@/components/google-button";

export function LoginForm() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setPending(true);
    setError(null);
    const result = await signIn("credentials", { email, password, redirect: false });
    if (!result || result.error) {
      setError(result?.error === "CredentialsSignin" ? "Email or password is incorrect." : result?.error ?? "Unable to sign in.");
      setPending(false);
      return;
    }
    router.push("/dashboard");
    router.refresh();
  }

  return <div className="grid gap-4"><form className="flex flex-col gap-4" onSubmit={submit}><div className="grid gap-2"><Label htmlFor="email">Email</Label><Input id="email" type="email" autoComplete="email" required value={email} onChange={(event) => setEmail(event.target.value)} /></div><div className="grid gap-2"><div className="flex items-center justify-between"><Label htmlFor="password">Password</Label><Link href="/forgot-password" className="text-xs text-muted-foreground hover:text-foreground">Forgot password?</Link></div><Input id="password" type="password" autoComplete="current-password" required value={password} onChange={(event) => setPassword(event.target.value)} /></div>{error ? <p className="text-sm text-destructive">{error}</p> : null}<Button type="submit" className="w-full" disabled={pending}>{pending ? "Signing in..." : "Sign in"}</Button></form><GoogleButton /><p className="text-center text-sm text-muted-foreground">No account? <Link href="/register" className="font-medium text-foreground hover:underline">Create one</Link></p></div>;
}
