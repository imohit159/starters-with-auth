import { eq } from "drizzle-orm";
import { z } from "zod";
import { db } from "@/server/db";
import { users } from "@/server/db/schema";
import { env } from "@/server/env";
import { createRawToken, saveToken } from "@/server/auth-tokens";
import { sendMail } from "@/server/mailer";

export async function POST(request: Request) {
  const parsed = z.object({ email: z.email() }).safeParse(await request.json().catch(() => null));
  if (parsed.success) {
    const email = parsed.data.email.toLowerCase();
    const [user] = await db.select({ id: users.id }).from(users).where(eq(users.email, email)).limit(1);
    if (user) {
      const token = createRawToken();
      await saveToken(user.id, "password_reset", token);
      void sendMail({ to: email, subject: "Reset your password", text: `Reset your password: ${env.APP_URL}/reset-password?token=${token}` });
    }
  }
  return Response.json({ message: "If that address exists, a reset link is on its way." });
}
