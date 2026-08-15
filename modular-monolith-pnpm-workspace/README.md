# Modular monolith auth starter (pnpm workspace)

Auth-only starter: Express 5 API + Next.js App Router in a pnpm workspace, orchestrated by Turborepo. Email/password and Google OAuth, access + rotating refresh cookies, MongoDB/Mongoose. Same auth architecture as `modular-monolith`; the difference is one lockfile and `turbo run`.

Use **pnpm** only. Never npm or yarn.

## Layout

```text
apps/api/                    Express 5 modular monolith
apps/web/                    Next.js App Router + shadcn
packages/eslint-config/      Shared ESLint config
packages/typescript-config/  Shared tsconfig bases
postman/                     Numbered Postman collection + local environment
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

- API: http://localhost:4000/health
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
| `NEXT_PUBLIC_API_URL` | web | `http://localhost:4000/api/v1` |

Root [`.env.example`](.env.example) documents both apps. Copy into `apps/api/.env` and `apps/web/.env.local`.

## Auth model

- `User` is the person (profile, status, roles).
- `AuthIdentity` is a login method (`password` or `google`). One user can have both.
- `Session` stores hashed refresh tokens in a rotation family. Reuse of an old refresh token revokes the family.
- `AuthChallenge` covers email verify, password reset, and OAuth `state`.

Tokens are httpOnly cookies (`access_token`, `refresh_token`). They are never stored in `localStorage`.

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

## Tests

```bash
pnpm test
```

Unit + Mongo memory-server integration + Supertest API tests in `apps/api`. Google is mocked at `OAuth2Client`.

## Security notes

- Passwords: Argon2id
- Refresh tokens: hashed at rest, rotated, family reuse detection
- Google ID tokens verified with `google-auth-library` (`verifyIdToken`)
- Login/register/refresh are rate-limited
- Do not log passwords, tokens, or OAuth codes
- After `pnpm install`, if native builds are skipped, run `pnpm approve-builds argon2 esbuild mongodb-memory-server` from this folder

## Add a domain module

Create `apps/api/src/modules/<name>/` with flat files only:

- `<name>.route.ts`
- `<name>.controller.ts`
- `<name>.service.ts`
- `<name>.dto.ts`
- models beside them if needed

Mount the router in `apps/api/src/app.ts`. Keep business logic in the service. Do not add a repository layer unless the module truly needs one.

On the frontend, add UI under `apps/web/src/features/<name>/components`, HTTP functions in `apps/web/src/services`, TanStack Query wrappers in `apps/web/src/hooks`.

## shadcn MCP

This repo includes `.cursor/mcp.json` for the shadcn MCP (`pnpm dlx shadcn@latest mcp`). Enable it in Cursor Settings, then add components with natural language.
