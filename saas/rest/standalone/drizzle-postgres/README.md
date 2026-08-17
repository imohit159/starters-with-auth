# saas-rest-apps-drizzle-postgres

SaaS starter: Express 5 API + Next.js App Router. Email/password and Google OAuth stay as in the auth kit. This folder adds organizations, memberships, Stripe billing, and an org-scoped todo sample.

Product shape comes from a Next.js + Clerk + Prisma SaaS tutorial (webhooks, admin vs user, subscriptions, todos). Implementation follows this catalog's conventions, not the tutorial dump: no Clerk, no Prisma, no class services, no fake "POST subscribe" without a payment provider.

JSON REST (not tRPC). Independent `backend/` + `frontend/` apps — not a pnpm workspace. Use **pnpm** only. Never npm or yarn.

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

Run backend and frontend in two terminals.

- API: http://localhost:4000/health
- JSON REST: http://localhost:4000/api/v1
- Stripe webhook: http://localhost:4000/api/v1/billing/webhook
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
| `STRIPE_SECRET_KEY` | backend | Stripe secret (`sk_test_...` in test mode) |
| `STRIPE_WEBHOOK_SECRET` | backend | Signing secret (`whsec_...`). Required to accept webhooks |
| `STRIPE_PRICE_ID` | backend | Recurring Price id (`price_...`) used by Checkout |
| `STRIPE_SUCCESS_URL` / `STRIPE_CANCEL_URL` | backend | Checkout return URLs |
| `NEXT_PUBLIC_API_URL` | frontend | `http://localhost:4000/api/v1` |

Root [`.env.example`](.env.example) documents both apps. Copy the backend block to `backend/.env` and the frontend line to `frontend/.env.local`.

## Auth model

- `User` is the person (profile, status, roles).
- `AuthIdentity` is a login method (`password` or `google`). One user can have both.
- `Session` stores hashed refresh tokens in a rotation family. Reuse of an old refresh token revokes the family.
- `AuthChallenge` covers email verify, password reset, and OAuth `state`.

Tokens are httpOnly cookies (`access_token`, `refresh_token`). They are never stored in `localStorage`.

`users.roles` may include `admin` for the **platform** admin dashboard (search users, grant/revoke org access). That is separate from organization roles.

Promote a platform admin in SQL:

```sql
UPDATE users SET roles = ARRAY['user','admin'] WHERE email = 'you@example.com';
```

## Organizations and billing

- `Organization` is the tenant. Subscription status lives here, not on the user.
- `Membership` is `owner` | `admin` | `member`. Every SaaS query loads membership for `(userId, organizationId)` and ignores a client-supplied org id without that check.
- `OrganizationInvite` is a hashed, expiring email invite (admin/member). The last owner cannot be removed.
- `StripeEvent` stores Stripe event ids so webhook deliveries are idempotent.
- `Todo` is the sample product feature, scoped to the org. Create requires an active or trialing subscription that has not ended.

Stripe Checkout and the customer portal are owner/admin only. Entitlement is applied by `POST /api/v1/billing/webhook` after signature verification (`checkout.session.completed`, `customer.subscription.*`, `invoice.paid`, `invoice.payment_failed`). Do not trust the Checkout success URL.

### Stripe test mode

1. Create a Product + recurring Price in the Stripe Dashboard (test mode). Copy the `price_...` id into `STRIPE_PRICE_ID`.
2. Copy the test secret key into `STRIPE_SECRET_KEY`.
3. Forward webhooks:

```bash
stripe listen --forward-to localhost:4000/api/v1/billing/webhook
```

4. Paste the CLI `whsec_...` into `STRIPE_WEBHOOK_SECRET` (this differs from the Dashboard endpoint secret).
5. Use test cards such as `4242 4242 4242 4242`.

Without Stripe keys, auth, orgs, and invites still work. Checkout returns `STRIPE_NOT_CONFIGURED`. Platform admins can grant complimentary access for local demos.

## API

JSON REST under `/api/v1`. Errors: `{ "error": { "code": "...", "message": "..." } }`.

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
| GET | `/api/v1/orgs` | access |
| POST | `/api/v1/orgs` | access |
| GET | `/api/v1/orgs/:organizationId` | access + membership |
| GET | `/api/v1/orgs/:organizationId/members` | access + membership |
| POST | `/api/v1/orgs/:organizationId/invites` | access + owner/admin |
| POST | `/api/v1/orgs/invites/accept` | access |
| DELETE | `/api/v1/orgs/:organizationId/invites/:inviteId` | access + owner/admin |
| PATCH | `/api/v1/orgs/:organizationId/members/:userId` | access + owner/admin |
| DELETE | `/api/v1/orgs/:organizationId/members/:userId` | access + owner/admin |
| GET | `/api/v1/orgs/:organizationId/billing` | access + membership |
| POST | `/api/v1/orgs/:organizationId/billing/checkout` | access + owner/admin |
| POST | `/api/v1/orgs/:organizationId/billing/portal` | access + owner/admin |
| POST | `/api/v1/billing/webhook` | Stripe signature |
| GET | `/api/v1/orgs/:organizationId/todos` | access + membership |
| POST | `/api/v1/orgs/:organizationId/todos` | access + membership + active subscription |
| PATCH | `/api/v1/orgs/:organizationId/todos/:todoId` | access + membership |
| DELETE | `/api/v1/orgs/:organizationId/todos/:todoId` | access + membership |
| GET | `/api/v1/admin/users?email=` | platform admin |
| GET | `/api/v1/admin/users/:userId` | platform admin |
| POST | `/api/v1/admin/orgs/:organizationId/grant` | platform admin |
| POST | `/api/v1/admin/orgs/:organizationId/revoke` | platform admin |

Postman: import [`postman/01-auth-starter.postman_collection.json`](postman/01-auth-starter.postman_collection.json) and [`postman/02-local.postman_environment.json`](postman/02-local.postman_environment.json). Register/login set httpOnly cookies; keep the same host so later requests send them.

## Frontend data path

Page → `features/<domain>/components` → `hooks` → `services` → `lib/api.ts` (axios). UI never calls axios.

`lib/api.ts` retries once on 401 by calling `/auth/refresh` (single-flight). Failed refresh sends the browser to `/login`.

Active org id is stored in `localStorage` for UX only. The API still checks membership on every request.

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

Tables: `users`, `auth_identities`, `sessions`, `auth_challenges`, `organizations`, `memberships`, `organization_invites`, `stripe_events`, `todos`. IDs are UUIDs.

## Tests

```bash
cd backend && pnpm test
cd backend && pnpm test:unit   # crypto + identity + org/billing rules; no Docker
```

Unit + Testcontainers Postgres integration + Supertest API tests (auth, orgs, tenancy, Stripe webhook signature + idempotency). Google is mocked at `OAuth2Client`. Checkout is mocked at the Stripe client. Docker must be running so Testcontainers can start Postgres; you do not start Postgres yourself. If the daemon is down, `pnpm test` still runs unit tests and skips the container suites.

## Security notes

- Passwords: Argon2id
- Refresh tokens: hashed at rest, rotated, family reuse detection
- Google ID tokens verified with `google-auth-library` (`verifyIdToken`)
- Stripe webhooks verified with `Stripe.webhooks.constructEvent`
- Webhook event ids are unique; duplicates are acknowledged and not reapplied
- Login/register/refresh/forgot-password are rate-limited
- Do not log passwords, tokens, OAuth codes, or Stripe secrets
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
