"use client";

import { useQuery } from "@tanstack/react-query";
import { QUERY_KEYS } from "@/constants/api";
import { getMe } from "@/services/auth.service";

export function useMe() {
  return useQuery({
    queryKey: QUERY_KEYS.me,
    queryFn: getMe,
  });
}
