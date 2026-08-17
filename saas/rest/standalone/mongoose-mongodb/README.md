# saas-rest-apps-mongo

SaaS starter: Express 5 API + Next.js App Router as independent apps. Email/password and Google OAuth stay as in the auth kit. This folder adds organizations, memberships, Stripe billing, and an org-scoped todo sample. MongoDB + Mongoose. JSON REST. No pnpm workspace.

Product shape comes from a Next.js + Clerk + Prisma SaaS tutorial (webhooks, admin vs user, subscriptions, todos). Implementation follows this catalog's conventions, not the tutorial dump: no Clerk, no Prisma, no class services, no fake "POST subscribe" without a payment provider.

Use **pnpm** only. Never npm or yarn.

## Layout

```text
backend/     Express 5 modular monolith (own package.json)
frontend/    Next.js App Router + shadcn (own package.json)
postman/     Health, auth, orgs, billing webhook
```

Each app has its own `package.json` and `pnpm-lock.yaml`. Install and run inside `backend/` and `frontend/` separately.

## Quick start

```bash
docker compose up -d
cp backend/.env.example backend/.env
cp frontend/.env.example frontend/.env.local

cd backend && pnpm install && pnpm dev
cd frontend && pnpm install && pnpm dev
```

- API health: http://localhost:4000/health
- REST: http://localhost:4000/api/v1
- Stripe webhook: http://localhost:4000/api/v1/billing/webhook
- Web: http://localhost:3000

Set `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`, and the authorized redirect URI to `http://localhost:4000/api/v1/auth/google/callback` before using Google sign-in.

## Environment

| Variable | App | Purpose |
|---|---|---|
| `MONGODB_URI` | backend | Mongo connection string |
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

Root [`.env.example`](.env.example) documents both apps. Copy the backend block into `backend/.env` and the frontend block into `frontend/.env.local`.

## Auth model

Unchanged from the auth kit:

- `User` is the person (profile, status, roles).
- `AuthIdentity` is a login method (`password` or `google`). One user can have both.
- `Session` stores hashed refresh tokens in a rotation family. Reuse of an old refresh token revokes the family.
- `AuthChallenge` covers email verify, password reset, and OAuth `state`.

Tokens are httpOnly cookies (`access_token`, `refresh_token`). They are never stored in `localStorage`.

`users.roles` may include `admin` for the **platform** admin dashboard (search users, grant/revoke org access). That is separate from organization roles.

Promote a platform admin in mongosh:

```js
db.users.updateOne({ email: "you@example.com" }, { $set: { roles: ["user", "admin"] } })
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

JSON REST (cookies on session mutations):

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
| GET / POST | `/api/v1/orgs` | access |
| GET | `/api/v1/orgs/:organizationId` | access + membership |
| GET | `/api/v1/orgs/:organizationId/members` | access + membership |
| POST | `/api/v1/orgs/:organizationId/invites` | access + owner/admin |
| POST | `/api/v1/orgs/invites/accept` | access |
| DELETE | `/api/v1/orgs/:organizationId/invites/:inviteId` | access + owner/admin |
| PATCH / DELETE | `/api/v1/orgs/:organizationId/members/:userId` | access + owner/admin |
| GET | `/api/v1/orgs/:organizationId/billing` | access + membership |
| POST | `/api/v1/orgs/:organizationId/billing/checkout` | access + owner/admin |
| POST | `/api/v1/orgs/:organizationId/billing/portal` | access + owner/admin |
| POST | `/api/v1/billing/webhook` | Stripe signature |
| GET / POST | `/api/v1/orgs/:organizationId/todos` | access + membership (create: active subscription) |
| PATCH / DELETE | `/api/v1/orgs/:organizationId/todos/:todoId` | access + membership |
| GET | `/api/v1/admin/users` | platform admin |
| GET | `/api/v1/admin/users/:userId` | platform admin |
| POST / DELETE | `/api/v1/admin/organizations/:organizationId/access` | platform admin |

Errors: `{ "error": { "code": "...", "message": "..." } }`.

Postman: import [`postman/01-auth-starter.postman_collection.json`](postman/01-auth-starter.postman_collection.json) and [`postman/02-local.postman_environment.json`](postman/02-local.postman_environment.json). Register/login set httpOnly cookies; keep the same host so later requests send them.

## Frontend data path

Page → `features/<domain>/components` → `hooks` → `services` → `lib/api.ts` (axios). UI never calls axios.

`lib/api.ts` retries once on 401 by calling `/auth/refresh` (single-flight). Failed refresh sends the browser to `/login`.

Active org id is stored in `localStorage` for UX only. The API still checks membership on every request.

## Tests

```bash
cd backend && pnpm test
cd backend && pnpm check-types
```

Unit + Mongo memory-server integration + Supertest REST tests (auth, orgs, tenancy, Stripe webhook signature + idempotency). Google is mocked at `OAuth2Client`. Checkout is mocked at the Stripe client.

## Security notes

- Passwords: Argon2id
- Refresh tokens: hashed at rest, rotated, family reuse detection
- Google ID tokens verified with `google-auth-library` (`verifyIdToken`)
- Stripe webhooks verified with `Stripe.webhooks.constructEvent`
- Webhook event ids are unique; duplicates are acknowledged and not reapplied
- Login/register/refresh/forgotPassword are rate-limited
- Do not log passwords, tokens, OAuth codes, or Stripe secrets
- After `pnpm install`, if native builds are skipped, run `pnpm approve-builds argon2 esbuild mongodb-memory-server` in `backend/`

## Add a domain module

Keep HTTP and use cases in `backend/src/modules/<name>/`. Put Mongoose models in `backend/src/database/models/`.

- `backend/src/database/models/`
- `backend/src/modules/<name>/` with `<name>.route.ts`, `<name>.controller.ts`, `<name>.service.ts`, and `model.ts` (Input/Output)
- Re-export the model from `backend/src/database/index.ts`

Mount the router in `backend/src/app.ts`. Keep business logic in the service. Controllers stay thin. Do not add a repository layer unless the module truly needs one.

On the frontend, add UI under `frontend/src/features/<name>/components`, HTTP functions in `frontend/src/services`, TanStack Query wrappers in `frontend/src/hooks`.

## shadcn MCP

This repo includes `.cursor/mcp.json` for the shadcn MCP (`pnpm dlx shadcn@latest mcp`). Enable it in Cursor Settings, then add components with natural language.
