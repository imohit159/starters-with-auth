"use client";

import { useSearchParams } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useActiveOrg } from "@/hooks/use-active-org";
import { useBillingPortal, useCheckout, useSubscription } from "@/hooks/use-billing";

export function BillingPanel() {
  const search = useSearchParams();
  const status = search.get("status");
  const { organizationId } = useActiveOrg();
  const subscription = useSubscription(organizationId);
  const checkout = useCheckout();
  const portal = useBillingPortal();

  if (!organizationId) {
    return <p className="text-sm text-muted-foreground">Select an organization first.</p>;
  }

  const data = subscription.data;

  return (
    <Card>
      <CardHeader>
        <CardTitle>Subscription</CardTitle>
        <CardDescription>
          Stripe Checkout and the customer portal. Access is applied by a signed webhook, not the success URL.
        </CardDescription>
      </CardHeader>
      <CardContent className="grid gap-4">
        {status === "success" ? (
          <p className="text-sm text-muted-foreground">Checkout finished. Status updates when Stripe delivers the webhook.</p>
        ) : null}
        {status === "canceled" ? (
          <p className="text-sm text-muted-foreground">Checkout was canceled. No charge was made.</p>
        ) : null}
        <dl className="grid gap-2 text-sm sm:grid-cols-2">
          <div>
            <dt className="text-muted-foreground">Status</dt>
            <dd className="font-medium capitalize">{data?.status.replace("_", " ") ?? "loading"}</dd>
          </div>
          <div>
            <dt className="text-muted-foreground">Period end</dt>
            <dd className="font-medium">
              {data?.subscriptionEndsAt ? new Date(data.subscriptionEndsAt).toLocaleString() : "—"}
            </dd>
          </div>
        </dl>
        <div className="flex flex-wrap gap-2">
          <Button
            type="button"
            onClick={() => checkout.mutate({ organizationId })}
            disabled={checkout.isPending || Boolean(data?.isSubscribed)}
          >
            {checkout.isPending ? "Redirecting..." : "Subscribe with Stripe"}
          </Button>
          <Button
            type="button"
            variant="outline"
            onClick={() => portal.mutate({ organizationId })}
            disabled={portal.isPending || !data?.stripeCustomerId}
          >
            {portal.isPending ? "Opening..." : "Customer portal"}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
