"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { QUERY_KEYS } from "@/constants/api";
import { getApiErrorMessage } from "@/lib/api";
import { acceptInvite, createOrganization, inviteMember, removeMember } from "@/services/orgs.service";

export function useCreateOrganization() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: { name: string }) => createOrganization(input.name),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: QUERY_KEYS.orgs });
      toast.success("Organization created");
    },
    onError: (error) => {
      toast.error(getApiErrorMessage(error, "Unable to create organization"));
    },
  });
}

export function useInviteMember() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: inviteMember,
    onSuccess: async (_data, variables) => {
      await queryClient.invalidateQueries({ queryKey: QUERY_KEYS.members(variables.organizationId) });
      toast.success("Invite sent");
    },
    onError: (error) => {
      toast.error(getApiErrorMessage(error, "Unable to send invite"));
    },
  });
}

export function useAcceptInvite() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: { token: string }) => acceptInvite(input.token),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: QUERY_KEYS.orgs });
      toast.success("Invite accepted");
    },
    onError: (error) => {
      toast.error(getApiErrorMessage(error, "Unable to accept invite"));
    },
  });
}

export function useRemoveMember() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: removeMember,
    onSuccess: async (_data, variables) => {
      await queryClient.invalidateQueries({ queryKey: QUERY_KEYS.members(variables.organizationId) });
      toast.success("Member removed");
    },
    onError: (error) => {
      toast.error(getApiErrorMessage(error, "Unable to remove member"));
    },
  });
}
