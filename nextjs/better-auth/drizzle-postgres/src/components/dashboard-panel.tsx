"use client";

import { useRouter } from "next/navigation";
import { FormEvent, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { authClient } from "@/lib/auth-client";
import { clientErrorMessage } from "@/lib/client-error";

type SessionRecord = {
  id?: string;
  token?: string;
  userAgent?: string | null;
  ipAddress?: string | null;
  createdAt?: string | Date;
  expiresAt?: string | Date;
};

export function DashboardPanel({ user }: { user: { name: string; email: string; emailVerified: boolean } }) {
  const router = useRouter();
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);
  const [sessions, setSessions] = useState<SessionRecord[] | null>(null);

  async function changePassword(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setPending(true);
    setMessage(null);
    setError(null);
    const result = await authClient.changePassword({ currentPassword, newPassword, revokeOtherSessions: true });
    if (result.error) setError(clientErrorMessage(result.error));
    else {
      setMessage("Password changed. Other sessions were signed out.");
      setCurrentPassword("");
      setNewPassword("");
    }
    setPending(false);
  }

  async function loadSessions() {
    const result = await authClient.listSessions();
    if (result.error) setError(clientErrorMessage(result.error));
    else setSessions((result.data ?? []) as SessionRecord[]);
  }

  async function revokeOtherSessions() {
    const result = await authClient.revokeOtherSessions();
    if (result.error) setError(clientErrorMessage(result.error));
    else {
      setMessage("Other sessions revoked.");
      await loadSessions();
    }
  }

  async function signOut() {
    await authClient.signOut();
    router.push("/login");
    router.refresh();
  }

  return (
    <Card className="w-full max-w-lg">
      <CardHeader><CardTitle>Signed in</CardTitle><CardDescription>This page is the protected sample surface for the Better Auth starter.</CardDescription></CardHeader>
      <CardContent className="flex flex-col gap-6">
        <dl className="grid gap-2 text-sm"><div><dt className="text-muted-foreground">Name</dt><dd className="font-medium">{user.name}</dd></div><div><dt className="text-muted-foreground">Email</dt><dd className="font-medium">{user.email}</dd></div><div><dt className="text-muted-foreground">Email status</dt><dd className="font-medium">{user.emailVerified ? "Verified" : "Unverified"}</dd></div></dl>
        <section className="flex flex-col gap-3 border-t pt-4"><h2 className="text-sm font-medium">Change password</h2><form className="grid gap-3" onSubmit={changePassword}><div className="grid gap-2"><Label htmlFor="currentPassword">Current password</Label><Input id="currentPassword" type="password" required value={currentPassword} onChange={(event) => setCurrentPassword(event.target.value)} /></div><div className="grid gap-2"><Label htmlFor="newPassword">New password</Label><Input id="newPassword" type="password" minLength={8} required value={newPassword} onChange={(event) => setNewPassword(event.target.value)} /></div><Button type="submit" disabled={pending}>{pending ? "Updating..." : "Change password"}</Button></form></section>
        <section className="flex flex-col gap-3 border-t pt-4"><div className="flex items-center justify-between"><h2 className="text-sm font-medium">Active sessions</h2><Button type="button" variant="outline" onClick={loadSessions}>Load sessions</Button></div>{sessions ? <div className="grid gap-2 text-xs text-muted-foreground">{sessions.map((session, index) => <div key={session.id ?? session.token ?? index} className="rounded-md border p-2"><p>{session.userAgent ?? "Unknown device"}</p><p>{session.ipAddress ?? "Unknown IP"}</p></div>)}</div> : null}<Button type="button" variant="outline" onClick={revokeOtherSessions}>Revoke other sessions</Button></section>
        {message ? <p className="text-sm text-emerald-600">{message}</p> : null}{error ? <p className="text-sm text-destructive">{error}</p> : null}
        <Button type="button" variant="outline" onClick={signOut}>Sign out</Button>
      </CardContent>
    </Card>
  );
}
