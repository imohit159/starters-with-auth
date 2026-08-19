"use client";

import { useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";
import { signOut } from "next-auth/react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export function DashboardPanel({ user }: { user: { name?: string | null; email?: string | null; roles: string[] } }) {
  const router = useRouter();
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);
  async function changePassword(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setPending(true);
    setMessage(null);
    setError(null);
    const response = await fetch("/api/change-password", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ currentPassword, newPassword }) });
    const data = (await response.json().catch(() => null)) as { message?: string } | null;
    if (!response.ok) setError(data?.message ?? "Unable to change password.");
    else { setMessage(data?.message ?? "Password updated."); setCurrentPassword(""); setNewPassword(""); }
    setPending(false);
  }
  async function logout() { await signOut({ redirect: false }); router.push("/login"); router.refresh(); }
  return <Card className="w-full max-w-lg"><CardHeader><CardTitle>Signed in</CardTitle><CardDescription>This page is the protected sample surface for the Auth.js starter.</CardDescription></CardHeader><CardContent className="flex flex-col gap-6"><dl className="grid gap-2 text-sm"><div><dt className="text-muted-foreground">Name</dt><dd className="font-medium">{user.name}</dd></div><div><dt className="text-muted-foreground">Email</dt><dd className="font-medium">{user.email}</dd></div><div><dt className="text-muted-foreground">Roles</dt><dd className="font-medium">{user.roles.join(", ")}</dd></div></dl><section className="flex flex-col gap-3 border-t pt-4"><h2 className="text-sm font-medium">Change password</h2><form className="grid gap-3" onSubmit={changePassword}><div className="grid gap-2"><Label htmlFor="currentPassword">Current password</Label><Input id="currentPassword" type="password" required value={currentPassword} onChange={(event) => setCurrentPassword(event.target.value)} /></div><div className="grid gap-2"><Label htmlFor="newPassword">New password</Label><Input id="newPassword" type="password" minLength={8} required value={newPassword} onChange={(event) => setNewPassword(event.target.value)} /></div><Button type="submit" disabled={pending}>{pending ? "Updating..." : "Change password"}</Button></form></section>{message ? <p className="text-sm text-emerald-600">{message}</p> : null}{error ? <p className="text-sm text-destructive">{error}</p> : null}<Button type="button" variant="outline" onClick={logout}>Sign out</Button></CardContent></Card>;
}
