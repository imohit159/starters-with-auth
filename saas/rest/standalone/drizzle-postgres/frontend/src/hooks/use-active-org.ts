"use client";

import { useCallback, useSyncExternalStore } from "react";

const STORAGE_KEY = "saas.activeOrganizationId";
const ACTIVE_ORG_EVENT = "saas:active-organization-change";

function subscribe(onStoreChange: () => void) {
  window.addEventListener("storage", onStoreChange);
  window.addEventListener(ACTIVE_ORG_EVENT, onStoreChange);

  return () => {
    window.removeEventListener("storage", onStoreChange);
    window.removeEventListener(ACTIVE_ORG_EVENT, onStoreChange);
  };
}

function getSnapshot() {
  return window.localStorage.getItem(STORAGE_KEY);
}

function getServerSnapshot() {
  return null;
}

export function useActiveOrg() {
  const organizationId = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);

  const setOrganizationId = useCallback((id: string | null) => {
    if (id) {
      window.localStorage.setItem(STORAGE_KEY, id);
    } else {
      window.localStorage.removeItem(STORAGE_KEY);
    }
    window.dispatchEvent(new Event(ACTIVE_ORG_EVENT));
  }, []);

  return { organizationId, setOrganizationId };
}
