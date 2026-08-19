import { eq, sql } from "drizzle-orm";
import { z } from "zod";
import { auth } from "@/auth";
import { db } from "@/server/db";
import { users } from "@/server/db/schema";
import { hashPassword, verifyPassword } from "@/server/password";

export async function POST(request: Request) {
  const session = await auth();
  if (!session?.user?.id) return Response.json({ message: "You are not signed in." }, { status: 401 });
  const parsed = z.object({ currentPassword: z.string().min(1), newPassword: z.string().min(8).max(128) }).safeParse(await request.json().catch(() => null));
  if (!parsed.success) return Response.json({ message: "Enter valid passwords." }, { status: 400 });
  const [user] = await db.select({ passwordHash: users.passwordHash }).from(users).where(eq(users.id, session.user.id)).limit(1);
  if (!user?.passwordHash || !(await verifyPassword(user.passwordHash, parsed.data.currentPassword))) return Response.json({ message: "Current password is incorrect." }, { status: 401 });
  await db.update(users).set({ passwordHash: await hashPassword(parsed.data.newPassword), sessionVersion: sql`${users.sessionVersion} + 1` }).where(eq(users.id, session.user.id));
  return Response.json({ message: "Password updated. Sign in again on other devices." });
}
