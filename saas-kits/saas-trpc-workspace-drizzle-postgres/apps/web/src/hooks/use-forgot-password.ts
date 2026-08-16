"use client";

import { toast } from "sonner";
import { getTrpcErrorMessage, trpc } from "@/lib/trpc";

export function useForgotPassword() {
  return trpc.auth.forgotPassword.useMutation({
    onSuccess: (data) => {
      toast.success(data.message);
    },
    onError: (error) => {
      toast.error(getTrpcErrorMessage(error, "Unable to send reset email"));
    },
  });
}
