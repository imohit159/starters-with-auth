# next-fullstack-drizzle-postgres

Single-app full-stack auth starter: Next.js App Router and Route Handlers, PostgreSQL, Drizzle ORM, Tailwind CSS, shadcn/ui, TanStack Query, and Axios. It includes email/password auth, Google OAuth, email verification, password reset, password change, device/session management, httpOnly access cookies, and rotating refresh sessions.

Use **pnpm** only. The app is a modular monolith—not a workspace and not a separate API deployment—but the business logic is kept free of Next.js so it can be lifted out later. See [Splitting the backend out](#splitting-the-backend-out).

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

`./setup.sh` copies `.env.example` to `.env`. Put real credentials in `.env` only—`.env.example` is committed.

Set the Google authorized callback to `http://localhost:3000/api/v1/auth/google/callback`. Without SMTP, verification and reset links are written to structured logs in development only.

## Architecture

```text
src/app/                    Pages and thin REST Route Handlers
src/features/auth/          Feature-oriented auth UI
src/hooks/                  TanStack Query auth hooks
src/services/               Browser API services
src/lib/api.ts              Central Axios client and refresh retry
src/lib/origins.ts          Origin allowlist shared by the API and the proxy
src/proxy.ts                CORS preflight + signed-out page redirects
src/server/modules/         Auth and user use cases (no Next.js imports)
src/server/db/              Drizzle client and schema
src/server/http/            Cookies, CORS, validation/errors, auth, request IDs, rate limits
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

Docker must be available for PostgreSQL integration/API tests. Those tests skip when Docker is unavailable. CI runs lint, types, tests, and build on every push touching this folder.

## Auth API

| Method | Path | Notes |
|---|---|---|
| POST | `/api/v1/auth/register` | 201 with a session, 201 pending verification, or 202 with `user: null` |
| POST | `/api/v1/auth/login` | |
| POST | `/api/v1/auth/refresh` | Rotates the refresh family |
| POST | `/api/v1/auth/logout` | |
| POST | `/api/v1/auth/change-password` | Authenticated. Revokes all sessions, re-issues this one |
| GET | `/api/v1/auth/google` | |
| GET | `/api/v1/auth/google/callback` | |
| POST | `/api/v1/auth/forgot-password` | |
| POST | `/api/v1/auth/reset-password` | Sets a first password too |
| POST | `/api/v1/auth/verify-email` | |
| GET | `/api/v1/users/me` | |
| GET | `/api/v1/users/me/sessions` | Live devices, `current: true` on the caller's |
| DELETE | `/api/v1/users/me/sessions` | Signs out every other device |

Errors use `{ "error": { "code": "...", "message": "..." } }`. Tokens stay in httpOnly cookies and never appear in JSON or local storage.

### Registering against an existing passwordless account

Supplying an email address is not proof of owning it. When someone registers an address that already belongs to a verified Google-only account, the server writes no credential and issues no session: it mails the owner a one-time set-password link and answers `202` with `user: null`. The owner completes the link through `reset-password`, which creates the password identity. Anything else would let a stranger take over an account knowing only its email address.

## Database and security

The schema contains users, login identities, refresh sessions, one-time auth challenges, and PostgreSQL-backed auth rate limits.

- **Passwords** use Argon2id. A login for an unknown address burns the same Argon2 work as a real one, so response timing does not reveal which accounts exist.
- **Refresh tokens** are opaque 32-byte values, stored only as SHA-256 digests, and rotated on every use. Replaying a rotated token revokes the whole token family. The claim is a single conditional `UPDATE`, so two concurrent refreshes cannot both win.
- **Access tokens** are HS256 JWTs pinned to that algorithm and checked for issuer and audience. The access cookie's `Max-Age` is derived from `ACCESS_TOKEN_EXPIRES_IN`, so the two cannot drift apart.
- **One-time tokens** (verify, reset, OAuth state) are consumed by a single `UPDATE ... WHERE consumed_at IS NULL AND expires_at > now() RETURNING`, which closes the replay window between checking and marking.
- **Rate limits** live in PostgreSQL with per-endpoint budgets, counted per IP *and* per targeted account, so a distributed attack on one account is capped too. Responses carry `ratelimit-*` and `retry-after`.
- **CSRF**: state-changing requests must carry an `Origin` this deployment trusts. Cookies are `SameSite` (`lax` by default) and `secure` in production.
- **Session control**: users can list their live devices and sign out everywhere else. Changing or resetting a password revokes every session.
- **Env** is parsed by Zod at boot. Production additionally refuses placeholder secrets, reused secrets, and non-HTTPS `APP_URL`.

Production should use a pooled PostgreSQL URL. Route Handlers use the Node.js runtime and a conservative serverless connection limit. Run checked-in migrations during release/CI rather than during `next build` or request startup.

Required production variables are documented in `.env.example`. Use independent random values for both secrets, configure SMTP, and set `APP_URL` and the Google callback to the deployed HTTPS origin.

## Splitting the backend out

`src/server/modules/**` and `src/server/db/**` import no Next.js. Only `src/server/http/**` touches `NextRequest`/`NextResponse`, and it is a thin adapter. Moving to a standalone Express/Fastify API means porting that one directory.

The transport is configuration, not code:

| Variable | Purpose |
|---|---|
| `NEXT_PUBLIC_API_URL` | Where the browser sends API calls. Relative `/api/v1` by default; set an absolute origin to target a separate backend |
| `ALLOWED_ORIGINS` | Extra browser origins allowed to call the API with credentials. `APP_URL` is always trusted |
| `COOKIE_DOMAIN` | Set when the API and frontend are on different hosts of one domain |
| `COOKIE_SAME_SITE` | `lax` same-site; `none` for cross-domain, which forces `secure` and requires `COOKIE_DOMAIN` |

CORS preflights are answered in `src/proxy.ts`; credentialed responses echo the caller's origin from the same allowlist the CSRF check uses, never `*`.

One thing still needs code changes on a split: the `@/server/...` path aliases inside the server directories, and the refresh-cookie presence check in `src/proxy.ts`, which only works while the API shares a domain with the app.

## Vercel

Create a Vercel project rooted at this folder, configure the environment variables, and connect a reachable pooled PostgreSQL database. Run `pnpm db:migrate` against the production database as an explicit release step before routing traffic to schema-dependent code.

Import the Postman files from `postman/` for manual API checks.
