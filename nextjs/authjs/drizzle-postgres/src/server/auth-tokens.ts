import "server-only";
import { createHash, randomBytes } from "node:crypto";
import { and, eq, gt, isNull } from "drizzle-orm";
import { authTokens } from "@/server/db/schema";
import { db } from "@/server/db";

export function createRawToken() {
  return randomBytes(32).toString("hex");
}

export function hashToken(value: string) {
  return createHash("sha256").update(value).digest("hex");
}

export async function saveToken(userId: string, type: "email_verification" | "password_reset", rawToken: string) {
  await db.insert(authTokens).values({
    id: crypto.randomUUID(),
    userId,
    type,
    tokenHash: hashToken(rawToken),
    expiresAt: new Date(Date.now() + (type === "email_verification" ? 24 : 1) * 60 * 60 * 1000),
  });
}

export async function consumeToken(rawToken: string, type: "email_verification" | "password_reset") {
  const [token] = await db.select().from(authTokens).where(and(eq(authTokens.tokenHash, hashToken(rawToken)), eq(authTokens.type, type), isNull(authTokens.consumedAt))).limit(1);
  if (!token || token.expiresAt <= new Date()) return null;
  const [consumed] = await db.update(authTokens).set({ consumedAt: new Date() }).where(and(eq(authTokens.id, token.id), isNull(authTokens.consumedAt), gt(authTokens.expiresAt, new Date()))).returning();
  return consumed ? token : null;
}
