"use client";

import { useMutation, useQuery } from "@tanstack/react-query";
import { toast } from "sonner";
import { QUERY_KEYS } from "@/constants/api";
import { getApiErrorMessage } from "@/lib/api";
import { createCheckoutSession, createPortalSession, getSubscription } from "@/services/billing.service";

export function useSubscription(organizationId: string | null) {
  return useQuery({
    queryKey: QUERY_KEYS.subscription(organizationId ?? ""),
    queryFn: () => getSubscription(organizationId!),
    enabled: Boolean(organizationId),
  });
}

export function useCheckout() {
  return useMutation({
    mutationFn: (input: { organizationId: string }) => createCheckoutSession(input.organizationId),
    onSuccess: (data) => {
      window.location.assign(data.url);
    },
    onError: (error) => {
      toast.error(getApiErrorMessage(error, "Unable to start checkout"));
    },
  });
}

export function useBillingPortal() {
  return useMutation({
    mutationFn: (input: { organizationId: string }) => createPortalSession(input.organizationId),
    onSuccess: (data) => {
      window.location.assign(data.url);
    },
    onError: (error) => {
      toast.error(getApiErrorMessage(error, "Unable to open billing portal"));
    },
  });
}
