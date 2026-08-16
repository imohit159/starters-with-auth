"use client";

import { useCallback, useEffect, useState } from "react";

const STORAGE_KEY = "saas.activeOrganizationId";

export function useActiveOrg() {
  const [organizationId, setOrganizationIdState] = useState<string | null>(null);

  useEffect(() => {
    setOrganizationIdState(window.localStorage.getItem(STORAGE_KEY));
  }, []);

  const setOrganizationId = useCallback((id: string | null) => {
    setOrganizationIdState(id);
    if (id) {
      window.localStorage.setItem(STORAGE_KEY, id);
      return;
    }
    window.localStorage.removeItem(STORAGE_KEY);
  }, []);

  return { organizationId, setOrganizationId };
}
