# Next.js Better Auth + Drizzle + PostgreSQL

Single-app authentication starter using Next.js App Router, Better Auth, Drizzle ORM, PostgreSQL, and Tailwind CSS. Better Auth owns the email/password, Google OAuth, verification, password reset, and database-backed session lifecycle.

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
- Auth handler: http://localhost:3000/api/auth/*

When SMTP is not configured, verification and reset links are written to structured development logs. Google OAuth uses `http://localhost:3000/api/auth/callback/google`.

## Architecture

```text
src/app/                 Pages and Better Auth route handler
src/components/          Auth forms and protected dashboard surface
src/lib/auth.ts          Server Better Auth configuration
src/lib/auth-client.ts   Browser Better Auth client
src/server/db/           Drizzle client and Better Auth schema
src/server/mailer.ts     SMTP adapter with development log fallback
drizzle/                 Checked-in SQL migrations
```

The protected dashboard validates the session server-side with `auth.api.getSession`. `proxy.ts` only performs an optimistic cookie check for early redirects; it is not the authorization boundary.

## Better Auth docs MCP

This starter includes `mcp.json`, which connects MCP-capable coding clients to Better Auth's official documentation server. To regenerate it with the official CLI, run:

```bash
pnpm dlx auth@latest mcp --manual
```

Restart or reload the MCP client after changing the configuration.

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

Production requires a strong `BETTER_AUTH_SECRET`, an HTTPS `APP_URL`, a reachable pooled PostgreSQL database, and configured SMTP if users need email verification or password reset.
