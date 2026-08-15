"use client";

import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { ROUTES } from "@/constants/api";
import { getTrpcErrorMessage, trpc } from "@/lib/trpc";

export function useLogin() {
  const router = useRouter();
  const utils = trpc.useUtils();

  return trpc.auth.login.useMutation({
    onSuccess: async (data) => {
      utils.users.me.setData(undefined, data.user);
      toast.success("Signed in");
      router.push(ROUTES.dashboard);
      router.refresh();
    },
    onError: (error) => {
      toast.error(getTrpcErrorMessage(error, "Unable to sign in"));
    },
  });
}
