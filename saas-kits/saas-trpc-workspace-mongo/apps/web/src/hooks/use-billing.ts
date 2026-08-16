"use client";

import { toast } from "sonner";
import { getTrpcErrorMessage, trpc } from "@/lib/trpc";

export function useSubscription(organizationId: string | null) {
  return trpc.billing.getSubscription.useQuery(
    { organizationId: organizationId ?? "" },
    { enabled: Boolean(organizationId) },
  );
}

export function useCheckout() {
  return trpc.billing.createCheckoutSession.useMutation({
    onSuccess: (data) => {
      window.location.assign(data.url);
    },
    onError: (error) => {
      toast.error(getTrpcErrorMessage(error, "Unable to start checkout"));
    },
  });
}

export function useBillingPortal() {
  return trpc.billing.createPortalSession.useMutation({
    onSuccess: (data) => {
      window.location.assign(data.url);
    },
    onError: (error) => {
      toast.error(getTrpcErrorMessage(error, "Unable to open billing portal"));
    },
  });
}
