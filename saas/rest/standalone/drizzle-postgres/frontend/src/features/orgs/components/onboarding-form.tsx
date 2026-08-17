"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ROUTES } from "@/constants/api";
import { useActiveOrg } from "@/hooks/use-active-org";
import { useCreateOrganization } from "@/hooks/use-org-mutations";

export function OnboardingForm() {
  const router = useRouter();
  const createOrg = useCreateOrganization();
  const { setOrganizationId } = useActiveOrg();
  const [name, setName] = useState("");

  return (
    <Card className="w-full max-w-md">
      <CardHeader>
        <CardTitle>Create your organization</CardTitle>
        <CardDescription>Billing, members, and todos live on this workspace — not on the user row.</CardDescription>
      </CardHeader>
      <CardContent>
        <form
          className="grid gap-4"
          onSubmit={(event) => {
            event.preventDefault();
            createOrg.mutate(
              { name },
              {
                onSuccess: (org) => {
                  setOrganizationId(org.id);
                  router.push(ROUTES.dashboard);
                },
              },
            );
          }}
        >
          <div className="grid gap-2">
            <Label htmlFor="org-name">Organization name</Label>
            <Input
              id="org-name"
              value={name}
              onChange={(event) => setName(event.target.value)}
              placeholder="Acme Inc"
              minLength={2}
              required
            />
          </div>
          <Button type="submit" disabled={createOrg.isPending || name.trim().length < 2}>
            {createOrg.isPending ? "Creating..." : "Create organization"}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}
