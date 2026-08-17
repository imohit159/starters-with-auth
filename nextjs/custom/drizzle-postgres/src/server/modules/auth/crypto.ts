import argon2 from "argon2";
import { createHash, randomBytes, randomUUID } from "node:crypto";
import jwt, { type JwtPayload } from "jsonwebtoken";
import { env } from "../../env";
import { AppError } from "@/server/logger";

const JWT_ALGORITHM = "HS256" as const;

export type AccessTokenPayload = JwtPayload & {
  sub: string;
  email: string;
};

export async function hashPassword(password: string) {
  return argon2.hash(password, { type: argon2.argon2id });
}

export async function verifyPassword(hash: string, password: string) {
  return argon2.verify(hash, password);
}

let decoyHash: Promise<string> | null = null;

/**
 * Burns the same Argon2 work as a real password check.
 * Called on credential lookups that found nothing, so a missing account and a
 * wrong password cost the same wall-clock time and cannot be told apart.
 */
export async function equalizePasswordTiming(password: string) {
  const hash = (decoyHash ??= hashPassword(randomBytes(32).toString("hex")));
  try {
    await verifyPassword(await hash, password);
  } catch {
    // A decoy mismatch is the expected outcome and carries no signal.
  }
}

export function generateOpaqueToken() {
  return randomBytes(32).toString("base64url");
}

export function hashToken(token: string) {
  return createHash("sha256").update(token).digest("hex");
}

export function newFamilyId() {
  return randomUUID();
}

export function signAccessToken(userId: string, email: string) {
  return jwt.sign({ sub: userId, email }, env.ACCESS_TOKEN_SECRET, {
    algorithm: JWT_ALGORITHM,
    expiresIn: env.ACCESS_TOKEN_EXPIRES_IN as jwt.SignOptions["expiresIn"],
    issuer: env.APP_URL,
    audience: env.APP_URL,
  });
}

export function verifyAccessToken(token: string): AccessTokenPayload {
  try {
    const payload = jwt.verify(token, env.ACCESS_TOKEN_SECRET, {
      algorithms: [JWT_ALGORITHM],
      issuer: env.APP_URL,
      audience: env.APP_URL,
    }) as AccessTokenPayload;
    if (!payload.sub || !payload.email) {
      throw new AppError(401, "UNAUTHORIZED", "Invalid access token");
    }
    return payload;
  } catch (error) {
    if (error instanceof AppError) {
      throw error;
    }
    throw new AppError(401, "UNAUTHORIZED", "Invalid or expired access token");
  }
}
