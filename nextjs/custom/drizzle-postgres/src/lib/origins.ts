/**
 * Origin allowlist shared by the API handlers and the proxy.
 * Kept free of server-only imports so the Edge proxy can use it too.
 */
export function parseAllowedOrigins(appUrl: string, allowedOrigins: string | undefined) {
  const extra = (allowedOrigins ?? "")
    .split(",")
    .map((entry) => entry.trim())
    .filter((entry) => entry.length > 0);

  const origins = new Set<string>();
  for (const candidate of [appUrl, ...extra]) {
    try {
      origins.add(new URL(candidate).origin);
    } catch {
      throw new Error(`Not a valid origin: ${candidate}`);
    }
  }
  return [...origins];
}
