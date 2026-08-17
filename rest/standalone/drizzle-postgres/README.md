# rest-apps-drizzle-postgres

Auth-only starter: Express 5 API + Next.js App Router. Email/password and Google OAuth, access + rotating refresh cookies, PostgreSQL + Drizzle ORM. JSON REST (not tRPC). No workspace, no extra domain features.

Use **pnpm** only. Never npm or yarn.

## Layout

```text
backend/     Express 5 modular monolith + Drizzle persistence
frontend/    Next.js App Router + shadcn
postman/     Numbered Postman collection + local environment
```

Each app has its own `package.json` and `pnpm-lock.yaml`.

## Quick start

```bash
docker compose up -d
cp backend/.env.example backend/.env
cp frontend/.env.example frontend/.env.local

cd backend && pnpm install && pnpm db:migrate && pnpm dev
cd frontend && pnpm install && pnpm dev
```

- API: http://localhost:4000/health
- Web: http://localhost:3000

Set `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`, and the authorized redirect URI to `http://localhost:4000/api/v1/auth/google/callback` before using Google sign-in.

## Environment

| Variable | App | Purpose |
|---|---|---|
| `DATABASE_URL` | backend | Postgres connection URL |
| `ACCESS_TOKEN_SECRET` | backend | JWT signing secret (min 32 chars) |
| `ACCESS_TOKEN_EXPIRES_IN` | backend | Access JWT TTL, default `15m` |
| `REFRESH_TOKEN_EXPIRES_DAYS` | backend | Refresh session TTL |
| `WEB_ORIGIN` | backend | Frontend origin for CORS + redirects |
| `COOKIE_SAMESITE` | backend | `lax` locally; `none` if API and web are different sites in production |
| `REQUIRE_EMAIL_VERIFICATION` | backend | If `true`, register does not issue cookies until verify |
| `GOOGLE_CLIENT_ID` / `GOOGLE_CLIENT_SECRET` | backend | Google OAuth |
| `GOOGLE_REDIRECT_URI` | backend | Must match the Google console redirect |
| `SMTP_HOST` | backend | Optional. Empty = log email to the console |
| `NEXT_PUBLIC_API_URL` | frontend | `http://localhost:4000/api/v1` |

Root [`.env.example`](.env.example) documents both apps. Copy the backend block to `backend/.env` and the frontend line to `frontend/.env.local`.

## Auth model

- `User` is the person (profile, status, roles).
- `AuthIdentity` is a login method (`password` or `google`). One user can have both.
- `Session` stores hashed refresh tokens in a rotation family. Reuse of an old refresh token revokes the family.
- `AuthChallenge` covers email verify, password reset, and OAuth `state`.

Tokens are httpOnly cookies (`access_token`, `refresh_token`). They are never stored in `localStorage`.

Tables: `users`, `auth_identities`, `sessions`, `auth_challenges`. IDs are UUIDs. Refresh `token_hash` is unique.

## API

| Method | Path | Auth |
|---|---|---|
| POST | `/api/v1/auth/register` | public |
| POST | `/api/v1/auth/login` | public |
| POST | `/api/v1/auth/refresh` | refresh cookie |
| POST | `/api/v1/auth/logout` | refresh cookie |
| GET | `/api/v1/auth/google` | public redirect |
| GET | `/api/v1/auth/google/callback` | Google |
| POST | `/api/v1/auth/forgot-password` | public |
| POST | `/api/v1/auth/reset-password` | public |
| POST | `/api/v1/auth/verify-email` | public |
| GET | `/api/v1/users/me` | access cookie or Bearer |

Errors: `{ "error": { "code": "...", "message": "..." } }`.

Postman: import [`postman/01-auth-starter.postman_collection.json`](postman/01-auth-starter.postman_collection.json) and [`postman/02-local.postman_environment.json`](postman/02-local.postman_environment.json). Register/login set httpOnly cookies; keep the same host so later requests send them.

## Frontend data path

Page → `features/auth/components` → `hooks` → `services` → `lib/api.ts` (axios). UI never calls axios.

`lib/api.ts` retries once on 401 by calling `/auth/refresh` (single-flight). Failed refresh sends the browser to `/login`.

## Database

Persistence lives in `backend/src/database/`:

- `client.ts` — postgres.js pool (`connectDb` / `migrateDb` / `disconnectDb`)
- `schema.ts` — barrel over `models/`
- `models/` — Drizzle tables + `Select*` / `Insert*` types
- `env.ts` — `createEnv(input)` for `DATABASE_URL`
- `drizzle.config.ts` — dotenv + `schema: "./schema.ts"`
- `drizzle/` — checked-in SQL migrations

```bash
cd backend
pnpm db:generate   # drizzle-kit generate after schema changes
pnpm db:migrate    # apply checked-in SQL in src/database/drizzle
pnpm db:studio     # Drizzle Studio
```

## Tests

```bash
cd backend && pnpm test
cd backend && pnpm test:unit   # crypto + identity rules; no Docker
```

Unit + Testcontainers Postgres integration + Supertest API tests. Google is mocked at `OAuth2Client`. Docker must be running so Testcontainers can start Postgres; you do not start Postgres yourself. If the daemon is down, `pnpm test` still runs unit tests and skips the container suites.

## Security notes

- Passwords: Argon2id
- Refresh tokens: hashed at rest, rotated, family reuse detection
- Google ID tokens verified with `google-auth-library` (`verifyIdToken`)
- Login/register/refresh are rate-limited
- Do not log passwords, tokens, or OAuth codes
- After `pnpm install`, if native builds are skipped, run `pnpm approve-builds argon2 esbuild cpu-features protobufjs ssh2` in `backend/`. Testcontainers needs the last three so `pnpm test` can start Postgres.

## Add a domain module

Create `backend/src/modules/<name>/` with flat files only:

- `<name>.route.ts`
- `<name>.controller.ts`
- `<name>.service.ts`
- `model.ts` (`*InputSchema` / `*OutputSchema`, mapper `to<Name>Output`)
- tables in `backend/src/database/models/` and re-export from `schema.ts`

Mount the router in `backend/src/app.ts`. Keep business logic in the service. Do not add a repository layer unless the module truly needs one.

On the frontend, add UI under `src/features/<name>/components`, HTTP functions in `src/services`, TanStack Query wrappers in `src/hooks`.

## shadcn MCP

This repo includes `.cursor/mcp.json` for the shadcn MCP (`pnpm dlx shadcn@latest mcp`). Enable it in Cursor Settings, then add components with natural language.
