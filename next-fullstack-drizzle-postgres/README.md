# next-fullstack-drizzle-postgres

Single-app full-stack auth starter: Next.js App Router and Route Handlers, PostgreSQL, Drizzle ORM, Tailwind CSS, shadcn/ui, TanStack Query, and Axios. It includes email/password auth, Google OAuth, email verification, password reset, httpOnly access cookies, and rotating refresh sessions.

Use **pnpm** only. The app is a modular monolith—not a workspace and not a separate API deployment.

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

Set the Google authorized callback to `http://localhost:3000/api/v1/auth/google/callback`. Without SMTP, verification and reset links are written to structured logs in development only.

## Architecture

```text
src/app/                    Pages and thin REST Route Handlers
src/features/auth/          Feature-oriented auth UI
src/hooks/                  TanStack Query auth hooks
src/services/               Browser API services
src/lib/api.ts              Central Axios client and refresh retry
src/server/modules/         Auth and user use cases
src/server/db/              Drizzle client and schema
src/server/http/            Cookies, validation/errors, auth, request IDs, rate limits
drizzle/                    Checked-in SQL migrations
tests/                      Unit, PostgreSQL integration, and Route Handler API tests
postman/                    Numbered collection and local environment
```

Browser data follows: page → feature component → hook → service → Axios → `/api/v1` Route Handler. Route Handlers own HTTP only; business logic remains in `src/server/modules`.

## Commands

```bash
pnpm dev
pnpm build
pnpm lint
pnpm check-types
pnpm test
pnpm db:generate
pnpm db:migrate
pnpm db:studio
```

Docker must be available for PostgreSQL integration/API tests. Those tests skip when Docker is unavailable.

## Auth API

| Method | Path |
|---|---|
| POST | `/api/v1/auth/register` |
| POST | `/api/v1/auth/login` |
| POST | `/api/v1/auth/refresh` |
| POST | `/api/v1/auth/logout` |
| GET | `/api/v1/auth/google` |
| GET | `/api/v1/auth/google/callback` |
| POST | `/api/v1/auth/forgot-password` |
| POST | `/api/v1/auth/reset-password` |
| POST | `/api/v1/auth/verify-email` |
| GET | `/api/v1/users/me` |

Errors use `{ "error": { "code": "...", "message": "..." } }`. Tokens stay in httpOnly cookies and never appear in JSON or local storage.

## Database and security

The schema contains users, login identities, refresh sessions, one-time auth challenges, and PostgreSQL-backed auth rate limits. Passwords use Argon2id; refresh/challenge tokens are hashed at rest; refresh reuse revokes the entire token family.

Production should use a pooled PostgreSQL URL. Route Handlers use the Node.js runtime and a conservative serverless connection limit. Run checked-in migrations during release/CI rather than during `next build` or request startup.

Required production variables are documented in `.env.example`. Use independent random values for both secrets, configure SMTP, and set `APP_URL` and the Google callback to the deployed HTTPS origin.

## Vercel

Create a Vercel project rooted at this folder, configure the environment variables, and connect a reachable pooled PostgreSQL database. Run `pnpm db:migrate` against the production database as an explicit release step before routing traffic to schema-dependent code.

Import the Postman files from `postman/` for manual API checks.
