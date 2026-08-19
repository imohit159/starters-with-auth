import { eq, sql } from "drizzle-orm";
import { z } from "zod";
import { db } from "@/server/db";
import { users } from "@/server/db/schema";
import { consumeToken } from "@/server/auth-tokens";
import { hashPassword } from "@/server/password";

export async function POST(request: Request) {
  const parsed = z.object({ token: z.string().min(1), password: z.string().min(8).max(128) }).safeParse(await request.json().catch(() => null));
  if (!parsed.success) return Response.json({ message: "Invalid reset request." }, { status: 400 });
  const token = await consumeToken(parsed.data.token, "password_reset");
  if (!token) return Response.json({ message: "This reset link is invalid or expired." }, { status: 400 });
  await db.update(users).set({ passwordHash: await hashPassword(parsed.data.password), sessionVersion: sql`${users.sessionVersion} + 1` }).where(eq(users.id, token.userId));
  return Response.json({ message: "Password updated." });
}
