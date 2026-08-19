# Next.js Auth.js + Drizzle + PostgreSQL

Single-app authentication starter using Next.js App Router, Auth.js, Drizzle ORM, PostgreSQL, and Tailwind CSS. It includes Google OAuth plus an explicitly implemented email/password flow with Argon2id password hashing, registration, email verification, password reset, password change, and a protected dashboard.

Use **pnpm** only.

## Quick start

```bash
docker compose up -d
./setup.sh
pnpm install
pnpm db:migrate
pnpm dev
```

- App: http://localhost:3000
- Health: http://localhost:3000/api/health
- Auth.js handler: http://localhost:3000/api/auth/*

When SMTP is not configured, verification and reset links are written to structured development logs. Google OAuth uses `http://localhost:3000/api/auth/callback/google`.

## Architecture

```text
src/auth.ts                    Auth.js providers, callbacks, and JWT session config
src/app/api/auth/              Auth.js route handler
src/app/api/{register,...}/    Application-owned credential lifecycle routes
src/components/                Auth forms and protected dashboard surface
src/server/db/                 Drizzle client and Auth.js schema
src/server/auth-tokens.ts      Hashed one-time verification/reset tokens
src/server/password.ts         Argon2id password hashing and verification
drizzle/                       Checked-in SQL migrations
```

Auth.js's Credentials provider intentionally does not persist users or passwords. This starter supplies that missing application logic explicitly. The Credentials flow uses JWT sessions, which keeps the provider compatible but means Auth.js database session rows are not used for those sessions. Password changes increment a session version so later JWT checks invalidate older tokens.

## Commands

```bash
pnpm dev
pnpm build
pnpm lint
pnpm check-types
pnpm db:generate
pnpm db:migrate
pnpm db:studio
```

Production requires a strong `AUTH_SECRET`, an HTTPS `APP_URL`, a reachable pooled PostgreSQL database, and configured SMTP if users need verification or reset emails.
