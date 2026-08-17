import { execFileSync } from "node:child_process";
import { and, eq, sql } from "drizzle-orm";
import { PostgreSqlContainer, type StartedPostgreSqlContainer } from "@testcontainers/postgresql";
import {
  authChallenges,
  authIdentities,
  connectDb,
  db,
  disconnectDb,
  IDENTITY_PROVIDER,
  migrateDb,
  sessions,
  users,
  type ChallengeType,
} from "@/server/db";

let container: StartedPostgreSqlContainer | undefined;

export function isDockerAvailable() {
  try {
    execFileSync("docker", ["info"], { stdio: "ignore", timeout: 10_000 });
    return true;
  } catch {
    return false;
  }
}

export async function startTestDb() {
  container = await new PostgreSqlContainer("postgres:16-alpine")
    .withDatabase("auth_starter_test")
    .withUsername("postgres")
    .withPassword("postgres")
    .start();
  const url = container.getConnectionUri();
  process.env.DATABASE_URL = url;
  await connectDb(url);
  await migrateDb();
}

export async function stopTestDb() {
  await disconnectDb();
  await container?.stop();
  container = undefined;
}

export async function resetTestDb() {
  await db.execute(sql`TRUNCATE TABLE auth_rate_limits, auth_challenges, sessions, auth_identities, users RESTART IDENTITY CASCADE`);
}

export async function findSessionsByUserId(userId: string) {
  return db.select().from(sessions).where(eq(sessions.userId, userId));
}

export async function findPasswordResetChallenge() {
  const [challenge] = await db
    .select()
    .from(authChallenges)
    .where(eq(authChallenges.type, "password_reset"))
    .limit(1);
  return challenge ?? null;
}

export async function findChallengeByType(type: ChallengeType) {
  const [challenge] = await db
    .select()
    .from(authChallenges)
    .where(eq(authChallenges.type, type))
    .limit(1);
  return challenge ?? null;
}

export async function countChallengesByType(type: ChallengeType) {
  const rows = await db.select().from(authChallenges).where(eq(authChallenges.type, type));
  return rows.length;
}

export async function setChallengeTokenHash(id: string, tokenHash: string) {
  await db.update(authChallenges).set({ tokenHash }).where(eq(authChallenges.id, id));
}

/**
 * Replaces a pending challenge's hash with one the test controls, so the flow
 * can be driven end to end without reading the mailed token out of a log line.
 */
export async function claimChallengeToken(type: ChallengeType, tokenHash: string) {
  const challenge = await findChallengeByType(type);
  if (!challenge) {
    throw new Error(`No ${type} challenge was created`);
  }
  await setChallengeTokenHash(challenge.id, tokenHash);
  return challenge;
}

export async function findUserByEmail(email: string) {
  const [user] = await db.select().from(users).where(eq(users.email, email)).limit(1);
  return user ?? null;
}

export async function findPasswordIdentity(userId: string) {
  const [identity] = await db
    .select()
    .from(authIdentities)
    .where(
      and(eq(authIdentities.userId, userId), eq(authIdentities.provider, IDENTITY_PROVIDER.password)),
    )
    .limit(1);
  return identity ?? null;
}

/** Inserts a verified account that signs in with Google only — no password identity. */
export async function seedGoogleOnlyUser(email: string, displayName = "Google User") {
  const [user] = await db
    .insert(users)
    .values({
      email,
      displayName,
      status: "active",
      emailVerifiedAt: new Date(),
    })
    .returning();
  await db.insert(authIdentities).values({
    userId: user.id,
    provider: IDENTITY_PROVIDER.google,
    providerUserId: `google-${user.id}`,
    email,
    emailVerified: true,
  });
  return user;
}
