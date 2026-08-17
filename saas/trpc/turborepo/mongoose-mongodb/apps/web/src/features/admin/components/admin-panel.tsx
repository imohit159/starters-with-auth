"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useAdminSearch, useAdminUser, useGrantAccess, useRevokeAccess } from "@/hooks/use-admin";
import { useMe } from "@/hooks/use-me";

export function AdminPanel() {
  const me = useMe();
  const [email, setEmail] = useState("");
  const [selectedUserId, setSelectedUserId] = useState<string | null>(null);
  const search = useAdminSearch(email);
  const detail = useAdminUser(selectedUserId);
  const grant = useGrantAccess();
  const revoke = useRevokeAccess();

  if (me.isLoading) {
    return <p className="text-sm text-muted-foreground">Loading...</p>;
  }
  if (!me.data?.roles.includes("admin")) {
    return <p className="text-sm text-destructive">Platform admin required.</p>;
  }

  return (
    <div className="grid gap-6">
      <Card>
        <CardHeader>
          <CardTitle>Find a user</CardTitle>
          <CardDescription>Search by email, then grant or revoke org access. Matches the video admin dashboard.</CardDescription>
        </CardHeader>
        <CardContent className="grid gap-3">
          <div className="grid gap-2">
            <Label htmlFor="admin-email">Email</Label>
            <Input
              id="admin-email"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              placeholder="ada@example.com"
            />
          </div>
          <ul className="grid gap-2">
            {search.data?.users.map((user) => (
              <li key={user.id}>
                <Button type="button" variant="outline" onClick={() => setSelectedUserId(user.id)}>
                  {user.displayName} · {user.email}
                </Button>
              </li>
            ))}
          </ul>
        </CardContent>
      </Card>

      {detail.data ? (
        <Card>
          <CardHeader>
            <CardTitle>{detail.data.user.displayName}</CardTitle>
            <CardDescription>{detail.data.user.email}</CardDescription>
          </CardHeader>
          <CardContent className="grid gap-3">
            {detail.data.organizations.map((org) => (
              <div key={org.organizationId} className="flex flex-wrap items-center justify-between gap-3 rounded-lg border px-3 py-2">
                <div>
                  <p className="font-medium">{org.name}</p>
                  <p className="text-xs text-muted-foreground">
                    {org.role} · {org.subscriptionStatus}
                    {org.subscriptionEndsAt ? ` · ${new Date(org.subscriptionEndsAt).toLocaleDateString()}` : ""}
                  </p>
                </div>
                <div className="flex gap-2">
                  <Button
                    type="button"
                    size="sm"
                    onClick={() => grant.mutate({ organizationId: org.organizationId, days: 30 })}
                  >
                    Grant 30 days
                  </Button>
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    onClick={() => revoke.mutate({ organizationId: org.organizationId })}
                  >
                    Revoke
                  </Button>
                </div>
              </div>
            ))}
            {detail.data.organizations.length === 0 ? (
              <p className="text-sm text-muted-foreground">This user has no organizations.</p>
            ) : null}
          </CardContent>
        </Card>
      ) : null}
    </div>
  );
}
