import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";
import Google from "next-auth/providers/google";
import { DrizzleAdapter } from "@auth/drizzle-adapter";
import { and, eq } from "drizzle-orm";
import { z } from "zod";
import { db } from "@/server/db";
import { accounts, sessions, users, verificationTokens } from "@/server/db/schema";
import { env } from "@/server/env";
import { verifyPassword } from "@/server/password";

const credentialsSchema = z.object({
  email: z.email(),
  password: z.string().min(1),
});

const providers = [
  Credentials({
    credentials: { email: { label: "Email", type: "email" }, password: { label: "Password", type: "password" } },
    async authorize(credentials) {
      const parsed = credentialsSchema.safeParse(credentials);
      if (!parsed.success) return null;
      const [user] = await db.select().from(users).where(eq(users.email, parsed.data.email.toLowerCase())).limit(1);
      if (!user?.passwordHash) return null;
      if (env.REQUIRE_EMAIL_VERIFICATION && !user.emailVerified) return null;
      if (!(await verifyPassword(user.passwordHash, parsed.data.password))) return null;
      return { id: user.id, name: user.name, email: user.email, image: user.image, roles: ["user"], sessionVersion: user.sessionVersion };
    },
  }),
  ...(env.GOOGLE_CLIENT_ID && env.GOOGLE_CLIENT_SECRET ? [Google({ clientId: env.GOOGLE_CLIENT_ID, clientSecret: env.GOOGLE_CLIENT_SECRET })] : []),
];

export const { handlers, auth, signIn, signOut } = NextAuth({
  adapter: DrizzleAdapter(db, {
    usersTable: users,
    accountsTable: accounts,
    sessionsTable: sessions,
    verificationTokensTable: verificationTokens,
  }),
  session: { strategy: "jwt", maxAge: 60 * 60 * 24 * 7 },
  secret: env.AUTH_SECRET,
  trustHost: true,
  pages: { signIn: "/login" },
  providers,
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.id = user.id;
        token.roles = "roles" in user && Array.isArray(user.roles) ? user.roles : ["user"];
        token.sessionVersion = "sessionVersion" in user ? user.sessionVersion : 0;
      }
      if (token.id) {
        const [current] = await db.select({ sessionVersion: users.sessionVersion }).from(users).where(and(eq(users.id, token.id), eq(users.sessionVersion, Number(token.sessionVersion ?? 0)))).limit(1);
        if (!current) return {};
      }
      return token;
    },
    async session({ session, token }) {
      if (!token.id || !session.user) return session;
      session.user.id = token.id;
      session.user.roles = Array.isArray(token.roles) ? token.roles : ["user"];
      return session;
    },
  },
});
