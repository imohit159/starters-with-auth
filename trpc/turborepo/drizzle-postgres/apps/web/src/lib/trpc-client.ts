import { httpBatchLink } from "@trpc/client";
import { TRPC_URL, ROUTES } from "@/constants/api";
import { trpc } from "@/lib/trpc";

const SKIP_REFRESH = [
  "auth.login",
  "auth.register",
  "auth.refresh",
  "auth.forgotPassword",
  "auth.resetPassword",
  "auth.verifyEmail",
];

let refreshPromise: Promise<void> | null = null;

function requestUrl(url: RequestInfo | URL) {
  if (typeof url === "string") {
    return url;
  }
  if (url instanceof URL) {
    return url.href;
  }
  return url.url;
}

function shouldSkipRefresh(url: string) {
  return SKIP_REFRESH.some((path) => url.includes(path));
}

function redirectToLogin() {
  if (typeof window !== "undefined" && window.location.pathname !== ROUTES.login) {
    window.location.assign(ROUTES.login);
  }
}

async function refreshSession() {
  const response = await fetch(`${TRPC_URL}/auth.refresh`, {
    method: "POST",
    credentials: "include",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({}),
  });
  if (!response.ok) {
    throw new Error("refresh_failed");
  }
}

export function createTrpcClient() {
  return trpc.createClient({
    links: [
      httpBatchLink({
        url: TRPC_URL,
        headers() {
          return { "x-request-id": crypto.randomUUID() };
        },
        fetch(url, options) {
          return fetch(url, { ...options, credentials: "include" }).then(async (response) => {
            const href = requestUrl(url);
            if (response.status !== 401 || shouldSkipRefresh(href)) {
              return response;
            }

            try {
              if (!refreshPromise) {
                refreshPromise = refreshSession();
              }
              await refreshPromise;
              return fetch(url, { ...options, credentials: "include" });
            } catch {
              redirectToLogin();
              return response;
            } finally {
              refreshPromise = null;
            }
          });
        },
      }),
    ],
  });
}
