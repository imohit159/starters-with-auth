# Modular monolith auth starter (pnpm workspace + tRPC)

Auth-only starter: Express 5 API + Next.js App Router in a pnpm workspace, orchestrated by Turborepo. JSON REST is replaced by tRPC. Email/password and Google OAuth, access + rotating refresh cookies, MongoDB/Mongoose. Google OAuth start/callback stay HTTP because they are browser redirects.

Use **pnpm** only. Never npm or yarn.

## Layout

```text
apps/api/                    Express 5 host: HTTP, cookies, Google OAuth redirects
apps/web/                    Next.js App Router + shadcn + tRPC client
packages/database/           Mongoose models + Mongo connection
packages/eslint-config/      Shared ESLint config
packages/logger/             Structured JSON logger + AppError
packages/services/auth/      Auth use cases, env, crypto, mail, Google client
packages/services/users/     User profile use cases
packages/trpc/               AppRouter, procedures, cookie helpers
packages/typescript-config/  Shared tsconfig bases
postman/                     Health + Google OAuth HTTP only
```

Install and run from this folder. Do not install inside `apps/api` or `apps/web`.

## Quick start

```bash
docker compose up -d
cp apps/api/.env.example apps/api/.env
cp apps/web/.env.example apps/web/.env.local

pnpm install
pnpm dev
```

- API health: http://localhost:4000/health
- tRPC: http://localhost:4000/trpc
- Web: http://localhost:3000

Useful filters:

```bash
pnpm dev:api
pnpm dev:web
pnpm test
pnpm check-types
```

Set `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`, and the authorized redirect URI to `http://localhost:4000/api/v1/auth/google/callback` before using Google sign-in.

## Environment

| Variable | App | Purpose |
|---|---|---|
| `MONGODB_URI` | api | Mongo connection string |
| `ACCESS_TOKEN_SECRET` | api | JWT signing secret (min 32 chars) |
| `ACCESS_TOKEN_EXPIRES_IN` | api | Access JWT TTL, default `15m` |
| `REFRESH_TOKEN_EXPIRES_DAYS` | api | Refresh session TTL |
| `WEB_ORIGIN` | api | Frontend origin for CORS + redirects |
| `COOKIE_SAMESITE` | api | `lax` locally; `none` if API and web are different sites in production |
| `REQUIRE_EMAIL_VERIFICATION` | api | If `true`, register does not issue cookies until verify |
| `GOOGLE_CLIENT_ID` / `GOOGLE_CLIENT_SECRET` | api | Google OAuth |
| `GOOGLE_REDIRECT_URI` | api | Must match the Google console redirect |
| `SMTP_HOST` | api | Optional. Empty = log email to the console |
| `NEXT_PUBLIC_API_URL` | web | `http://localhost:4000` (no `/api/v1` suffix) |

Root [`.env.example`](.env.example) documents both apps. Copy into `apps/api/.env` and `apps/web/.env.local`.

## Auth model

- `User` is the person (profile, status, roles).
- `AuthIdentity` is a login method (`password` or `google`). One user can have both.
- `Session` stores hashed refresh tokens in a rotation family. Reuse of an old refresh token revokes the family.
- `AuthChallenge` covers email verify, password reset, and OAuth `state`.

Tokens are httpOnly cookies (`access_token`, `refresh_token`). They are never stored in `localStorage`.

## API

tRPC router (cookies on session mutations):

| Procedure | Auth |
|---|---|
| `auth.register` | public |
| `auth.login` | public |
| `auth.refresh` | refresh cookie |
| `auth.logout` | refresh cookie |
| `auth.forgotPassword` | public |
| `auth.resetPassword` | public |
| `auth.verifyEmail` | public |
| `users.me` | access cookie or Bearer |

HTTP (not tRPC):

| Method | Path | Auth |
|---|---|---|
| GET | `/health` | public |
| GET | `/api/v1/auth/google` | public redirect |
| GET | `/api/v1/auth/google/callback` | Google |

`AppRouter` is exported from `@repo/trpc` for the web client.

Postman: import [`postman/01-auth-starter.postman_collection.json`](postman/01-auth-starter.postman_collection.json) for health + Google start. tRPC procedures are covered by `pnpm test`.

## Frontend data path

Page → `features/auth/components` → `hooks` → `trpc.<router>.<proc>` (`@trpc/react-query`). UI never calls fetch.

`lib/trpc-client.ts` retries once on 401 by calling `auth.refresh` (single-flight). Failed refresh sends the browser to `/login`.

## Tests

```bash
pnpm test
```

Unit + Mongo memory-server integration + Supertest tRPC HTTP tests. Google is mocked at `OAuth2Client`.

## Security notes

- Passwords: Argon2id
- Refresh tokens: hashed at rest, rotated, family reuse detection
- Google ID tokens verified with `google-auth-library` (`verifyIdToken`)
- Login/register/refresh/forgotPassword are rate-limited in tRPC middleware
- Do not log passwords, tokens, or OAuth codes
- After `pnpm install`, if native builds are skipped, run `pnpm approve-builds argon2 esbuild mongodb-memory-server` from this folder

## Add a domain module

Keep HTTP in `apps/api`. Put persistence in `packages/database`, each bounded context in `packages/services/<domain>` as its own package (`@repo/<domain>`), and procedures in `packages/trpc`.

- `packages/database/src/models/<name>.ts`
- `packages/services/<domain>/` with `package.json`, use cases, and Zod DTOs
- `packages/trpc/src/routers/<name>.ts`

Mount the router in `packages/trpc/src/root.ts`. Keep business logic in the domain package. Procedures stay thin. Do not add a repository layer unless the module truly needs one. Do not put a `package.json` on `packages/services/` itself.

On the frontend, add UI under `apps/web/src/features/<name>/components` and TanStack Query wrappers in `apps/web/src/hooks` via `trpc.<name>.*`. Web imports types from `@repo/trpc`, not from domain packages.

## shadcn MCP

This repo includes `.cursor/mcp.json` for the shadcn MCP (`pnpm dlx shadcn@latest mcp`). Enable it in Cursor Settings, then add components with natural language.
