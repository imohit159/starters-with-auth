"use client";

import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { ROUTES } from "@/constants/api";
import { getTrpcErrorMessage, trpc } from "@/lib/trpc";

export function useRegister() {
  const router = useRouter();
  const utils = trpc.useUtils();

  return trpc.auth.register.useMutation({
    onSuccess: async (data) => {
      if (data.message) {
        toast.success(data.message);
        router.push(ROUTES.login);
        return;
      }
      utils.users.me.setData(undefined, data.user);
      toast.success("Account created");
      router.push(ROUTES.dashboard);
      router.refresh();
    },
    onError: (error) => {
      toast.error(getTrpcErrorMessage(error, "Unable to create account"));
    },
  });
}
