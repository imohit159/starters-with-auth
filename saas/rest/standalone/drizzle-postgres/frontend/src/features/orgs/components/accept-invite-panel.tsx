"use client";

import { useSearchParams } from "next/navigation";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { ROUTES } from "@/constants/api";
import { useActiveOrg } from "@/hooks/use-active-org";
import { useAcceptInvite } from "@/hooks/use-org-mutations";

export function AcceptInvitePanel() {
  const router = useRouter();
  const search = useSearchParams();
  const token = search.get("token") ?? "";
  const accept = useAcceptInvite();
  const { setOrganizationId } = useActiveOrg();

  return (
    <Card className="w-full max-w-md">
      <CardHeader>
        <CardTitle>Accept invite</CardTitle>
        <CardDescription>You must be signed in with the invited email.</CardDescription>
      </CardHeader>
      <CardContent>
        <Button
          type="button"
          className="w-full"
          disabled={!token || accept.isPending}
          onClick={() =>
            accept.mutate(
              { token },
              {
                onSuccess: (org) => {
                  setOrganizationId(org.id);
                  router.push(ROUTES.dashboard);
                },
              },
            )
          }
        >
          {accept.isPending ? "Joining..." : "Join organization"}
        </Button>
      </CardContent>
    </Card>
  );
}
