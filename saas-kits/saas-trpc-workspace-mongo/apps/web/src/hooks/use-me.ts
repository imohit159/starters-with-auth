"use client";

import { trpc } from "@/lib/trpc";

export function useMe() {
  return trpc.users.me.useQuery();
}
