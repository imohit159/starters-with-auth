"use client";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useLogout } from "@/hooks/use-logout";
import { useMe } from "@/hooks/use-me";
import { ChangePasswordForm } from "./change-password-form";
import { SessionList } from "./session-list";

export function DashboardPanel() {
  const me = useMe();
  const logout = useLogout();

  if (me.isLoading) {
    return <p className="text-sm text-muted-foreground">Loading your session...</p>;
  }

  if (!me.data) {
    return <p className="text-sm text-destructive">You are not signed in.</p>;
  }

  return (
    <Card className="w-full max-w-lg">
      <CardHeader>
        <CardTitle>Signed in</CardTitle>
        <CardDescription>This page is the protected sample surface for the starter.</CardDescription>
      </CardHeader>
      <CardContent className="flex flex-col gap-6">
        <dl className="grid gap-2 text-sm">
          <div>
            <dt className="text-muted-foreground">Name</dt>
            <dd className="font-medium">{me.data.displayName}</dd>
          </div>
          <div>
            <dt className="text-muted-foreground">Email</dt>
            <dd className="font-medium">{me.data.email}</dd>
          </div>
          <div>
            <dt className="text-muted-foreground">Roles</dt>
            <dd className="font-medium">{me.data.roles.join(", ")}</dd>
          </div>
        </dl>

        <section className="flex flex-col gap-3 border-t pt-4">
          <h2 className="text-sm font-medium">Change password</h2>
          <ChangePasswordForm />
        </section>

        <section className="flex flex-col gap-3 border-t pt-4">
          <h2 className="text-sm font-medium">Active devices</h2>
          <SessionList />
        </section>

        <Button
          type="button"
          variant="outline"
          onClick={() => logout.mutate()}
          disabled={logout.isPending}
        >
          {logout.isPending ? "Signing out..." : "Sign out"}
        </Button>
      </CardContent>
    </Card>
  );
}
