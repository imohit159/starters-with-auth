# rest-workspace-drizzle-postgres

Auth-only starter: Express 5 API + Next.js App Router in a pnpm workspace, orchestrated by Turborepo. JSON REST (not tRPC). Email/password and Google OAuth, access + rotating refresh cookies, PostgreSQL + Drizzle ORM. Same auth architecture as `rest-workspace-mongo`; the difference is Postgres/Drizzle instead of MongoDB/Mongoose, plus shared `packages/database` and `packages/services`.

Use **pnpm** only. Never npm or yarn.

## Layout

```text
apps/api/                    Express 5 host: HTTP, cookies, Google OAuth redirects, tsup bundle
apps/web/                    Next.js App Router + shadcn + axios REST client
packages/database/           Drizzle schema, client, checked-in SQL migrations
packages/eslint-config/      Shared ESLint config
packages/logger/             Structured JSON logger + AppError
packages/services/           Domain use cases, env, clients
packages/typescript-config/  Shared tsconfig bases
postman/                     Numbered Postman collection + local environment
```

Install and run from this folder. Do not install inside `apps/api` or `apps/web`.

## Quick start

```bash
docker compose up -d
./setup.sh

pnpm install
pnpm db:migrate
pnpm dev
```

- API: http://localhost:4000/health
- Web: http://localhost:3000

Useful filters:

```bash
pnpm dev:api
pnpm dev:web
pnpm test
pnpm check-types
pnpm --filter api build
./clean-install.sh
```

Set `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`, and the authorized redirect URI to `http://localhost:4000/api/v1/auth/google/callback` before using Google sign-in.

Production API image (Postgres must already be reachable; the image runs migrations on boot):

```bash
docker compose --profile full up -d --build
```

## Environment

| Variable | App | Purpose |
|---|---|---|
| `DATABASE_URL` | api | Postgres connection URL |
| `ACCESS_TOKEN_SECRET` | api | JWT signing secret (min 32 chars) |
| `ACCESS_TOKEN_EXPIRES_IN` | api | Access JWT TTL, default `15m` |
| `REFRESH_TOKEN_EXPIRES_DAYS` | api | Refresh session TTL |
| `WEB_ORIGIN` | api | Frontend origin for CORS + redirects |
| `COOKIE_SAMESITE` | api | `lax` locally; `none` if API and web are different sites in production |
| `REQUIRE_EMAIL_VERIFICATION` | api | If `true`, register does not issue cookies until verify |
| `GOOGLE_CLIENT_ID` / `GOOGLE_CLIENT_SECRET` | api | Google OAuth |
| `GOOGLE_REDIRECT_URI` | api | Must match the Google console redirect |
| `SMTP_HOST` | api | Optional. Empty = log email to the console |
| `NEXT_PUBLIC_API_URL` | web | `http://localhost:4000/api/v1` |

Root [`.env.example`](.env.example) documents both apps. `./setup.sh` copies it to `.env` and symlinks that file into each `apps/*` and `packages/*` directory.

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

```bash
pnpm db:generate   # drizzle-kit generate after schema changes
pnpm db:migrate    # apply checked-in SQL in packages/database/drizzle
pnpm db:studio     # Drizzle Studio
```

## Tests

```bash
pnpm test
```

Unit + Testcontainers Postgres integration + Supertest REST API tests in `apps/api`. Google is mocked at `OAuth2Client`. Docker must be running so Testcontainers can start Postgres; you do not start Postgres yourself. If Docker is not running, the 11 Testcontainers tests are skipped.

## Security notes

- Passwords: Argon2id
- Refresh tokens: hashed at rest, rotated, family reuse detection
- Google ID tokens verified with `google-auth-library` (`verifyIdToken`)
- Login/register/refresh/forgot-password are rate-limited
- Do not log passwords, tokens, or OAuth codes
- After `pnpm install`, if native builds are skipped, run `pnpm approve-builds argon2 esbuild cpu-features protobufjs ssh2` from this folder. Testcontainers needs the last three so `pnpm test` can start Postgres.

## Add a domain module

Keep HTTP in `apps/api`. Put persistence in `packages/database` and use cases in `@repo/services` as domain folders (`env.ts` and `clients/` at the services source root).

- `packages/database/src/models/` (tables) and `src/schema.ts` (barrel for drizzle-kit)
- `packages/services/src/<domain>/index.ts` (use cases) and `model.ts`
- `apps/api/src/modules/<name>/` with `<name>.route.ts` and `<name>.controller.ts`

Mount the router in `apps/api/src/app.ts`. Keep business logic in the service. Controllers stay thin. Do not add a repository layer unless the module truly needs one. Do not turn each domain into its own workspace package.

On the frontend, add UI under `apps/web/src/features/<name>/components`, HTTP functions in `apps/web/src/services`, TanStack Query wrappers in `apps/web/src/hooks`.

## shadcn MCP

This repo includes `.cursor/mcp.json` for the shadcn MCP (`pnpm dlx shadcn@latest mcp`). Enable it in Cursor Settings, then add components with natural language.
