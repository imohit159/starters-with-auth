import { eq } from "drizzle-orm";
import { z } from "zod";
import { db } from "@/server/db";
import { users } from "@/server/db/schema";
import { consumeToken } from "@/server/auth-tokens";

export async function POST(request: Request) {
  const parsed = z.object({ token: z.string().min(1) }).safeParse(await request.json().catch(() => null));
  if (!parsed.success) return Response.json({ message: "Invalid verification request." }, { status: 400 });
  const token = await consumeToken(parsed.data.token, "email_verification");
  if (!token) return Response.json({ message: "This verification link is invalid or expired." }, { status: 400 });
  await db.update(users).set({ emailVerified: new Date() }).where(eq(users.id, token.userId));
  return Response.json({ message: "Email verified." });
}
