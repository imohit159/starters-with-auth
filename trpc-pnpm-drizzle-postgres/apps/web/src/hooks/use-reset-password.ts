"use client";

import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { ROUTES } from "@/constants/api";
import { getTrpcErrorMessage, trpc } from "@/lib/trpc";

export function useResetPassword() {
  const router = useRouter();

  return trpc.auth.resetPassword.useMutation({
    onSuccess: (data) => {
      toast.success(data.message);
      router.push(ROUTES.login);
    },
    onError: (error) => {
      toast.error(getTrpcErrorMessage(error, "Unable to reset password"));
    },
  });
}
