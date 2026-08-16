"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { ROUTES } from "@/constants/api";
import { useActiveOrg } from "@/hooks/use-active-org";
import { useOrganizations } from "@/hooks/use-orgs";
import { TodoPanel } from "@/features/todos/components/todo-panel";

export function DashboardPanel() {
  const router = useRouter();
  const orgs = useOrganizations();
  const { organizationId, setOrganizationId } = useActiveOrg();

  useEffect(() => {
    if (orgs.isLoading) {
      return;
    }
    if (!orgs.data?.length) {
      router.replace(ROUTES.onboarding);
      return;
    }
    const selected = orgs.data.find((org) => org.id === organizationId) ?? orgs.data[0];
    if (selected && selected.id !== organizationId) {
      setOrganizationId(selected.id);
    }
  }, [orgs.data, orgs.isLoading, organizationId, router, setOrganizationId]);

  if (orgs.isLoading || !orgs.data?.length) {
    return <p className="text-sm text-muted-foreground">Loading workspace...</p>;
  }

  const active = orgs.data.find((org) => org.id === organizationId) ?? orgs.data[0];

  return (
    <div className="grid gap-6">
      <Card>
        <CardHeader>
          <CardTitle>Organization</CardTitle>
          <CardDescription>Every query is scoped to the org you belong to, not a client-trusted header.</CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col gap-3">
          <label className="grid gap-1 text-sm">
            <span className="text-muted-foreground">Active workspace</span>
            <select
              className="h-9 rounded-lg border border-input bg-background px-2"
              value={active.id}
              onChange={(event) => setOrganizationId(event.target.value)}
            >
              {orgs.data.map((org) => (
                <option key={org.id} value={org.id}>
                  {org.name} ({org.role})
                </option>
              ))}
            </select>
          </label>
          <dl className="grid gap-2 text-sm sm:grid-cols-3">
            <div>
              <dt className="text-muted-foreground">Plan</dt>
              <dd className="font-medium capitalize">{active.subscriptionStatus.replace("_", " ")}</dd>
            </div>
            <div>
              <dt className="text-muted-foreground">Subscribed</dt>
              <dd className="font-medium">{active.isSubscribed ? "Yes" : "No"}</dd>
            </div>
            <div>
              <dt className="text-muted-foreground">Renews / ends</dt>
              <dd className="font-medium">
                {active.subscriptionEndsAt ? new Date(active.subscriptionEndsAt).toLocaleDateString() : "—"}
              </dd>
            </div>
          </dl>
          {!active.isSubscribed ? (
            <Button type="button" onClick={() => router.push(ROUTES.billing)}>
              Subscribe to unlock todos
            </Button>
          ) : null}
        </CardContent>
      </Card>
      <TodoPanel organizationId={active.id} isSubscribed={active.isSubscribed} />
    </div>
  );
}
