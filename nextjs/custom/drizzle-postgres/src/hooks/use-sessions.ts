"use client";

import { useQuery } from "@tanstack/react-query";
import { QUERY_KEYS } from "@/constants/api";
import { getSessions } from "@/services/auth.service";

export function useSessions() {
  return useQuery({
    queryKey: QUERY_KEYS.sessions,
    queryFn: getSessions,
  });
}
