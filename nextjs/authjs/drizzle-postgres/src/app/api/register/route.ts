import { eq } from "drizzle-orm";
import { z } from "zod";
import { db } from "@/server/db";
import { users } from "@/server/db/schema";
import { env } from "@/server/env";
import { createRawToken, saveToken } from "@/server/auth-tokens";
import { sendMail } from "@/server/mailer";
import { hashPassword } from "@/server/password";

const registerSchema = z.object({ name: z.string().trim().min(1).max(80), email: z.email(), password: z.string().min(8).max(128) });

export async function POST(request: Request) {
  const parsed = registerSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return Response.json({ message: "Enter a valid name, email, and password." }, { status: 400 });

  const email = parsed.data.email.toLowerCase();
  const [existing] = await db.select({ id: users.id }).from(users).where(eq(users.email, email)).limit(1);
  if (existing) return Response.json({ message: "An account with this email already exists." }, { status: 409 });

  const [user] = await db.insert(users).values({ id: crypto.randomUUID(), name: parsed.data.name, email, passwordHash: await hashPassword(parsed.data.password), emailVerified: env.REQUIRE_EMAIL_VERIFICATION ? null : new Date() }).returning();
  if (!user) return Response.json({ message: "Could not create the account." }, { status: 500 });

  if (env.REQUIRE_EMAIL_VERIFICATION) {
    const token = createRawToken();
    await saveToken(user.id, "email_verification", token);
    void sendMail({ to: email, subject: "Verify your email", text: `Verify your email: ${env.APP_URL}/verify-email?token=${token}` });
  }

  return Response.json({ user: { id: user.id, name: user.name, email: user.email }, verificationRequired: env.REQUIRE_EMAIL_VERIFICATION }, { status: 201 });
}
