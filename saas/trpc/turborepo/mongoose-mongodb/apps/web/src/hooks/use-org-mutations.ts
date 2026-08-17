"use client";

import { toast } from "sonner";
import { getTrpcErrorMessage, trpc } from "@/lib/trpc";

export function useCreateOrganization() {
  const utils = trpc.useUtils();
  return trpc.orgs.create.useMutation({
    onSuccess: async () => {
      await utils.orgs.list.invalidate();
      toast.success("Organization created");
    },
    onError: (error) => {
      toast.error(getTrpcErrorMessage(error, "Unable to create organization"));
    },
  });
}

export function useInviteMember() {
  const utils = trpc.useUtils();
  return trpc.orgs.invite.useMutation({
    onSuccess: async (_data, variables) => {
      await utils.orgs.members.invalidate({ organizationId: variables.organizationId });
      toast.success("Invite sent");
    },
    onError: (error) => {
      toast.error(getTrpcErrorMessage(error, "Unable to send invite"));
    },
  });
}

export function useAcceptInvite() {
  const utils = trpc.useUtils();
  return trpc.orgs.acceptInvite.useMutation({
    onSuccess: async () => {
      await utils.orgs.list.invalidate();
      toast.success("Invite accepted");
    },
    onError: (error) => {
      toast.error(getTrpcErrorMessage(error, "Unable to accept invite"));
    },
  });
}

export function useRemoveMember() {
  const utils = trpc.useUtils();
  return trpc.orgs.removeMember.useMutation({
    onSuccess: async (_data, variables) => {
      await utils.orgs.members.invalidate({ organizationId: variables.organizationId });
      toast.success("Member removed");
    },
    onError: (error) => {
      toast.error(getTrpcErrorMessage(error, "Unable to remove member"));
    },
  });
}
