# starters-with-auth

Catalog of full-stack authentication starter kits. One repository, one clone, and multiple independently usable starters. Copy the leaf folder that matches the stack you want.

Use **pnpm** only.

## Naming convention

Paths describe decisions from broadest to most specific:

```text
domain → architecture or auth provider → ORM/database
```

- **Domain:** `nextjs`, `rest`, `trpc`, or `saas`
- **Architecture:** `standalone` or `turborepo`
- **Auth provider:** `custom`, `clerk`, `better-auth`, `authjs`, or `supabase`
- **Persistence:** `drizzle-postgres` or `mongoose-mongodb`

`standalone` contains independent frontend and backend pnpm projects. `turborepo` contains a pnpm workspace orchestrated by Turborepo.

## Next.js starters

| Folder | Authentication | Persistence | Status |
|---|---|---|---|
| [`nextjs/custom/drizzle-postgres`](nextjs/custom/drizzle-postgres) | Custom email/password + Google OAuth | PostgreSQL + Drizzle | Available |
| [`nextjs/clerk/drizzle-postgres`](nextjs/clerk/drizzle-postgres) | Clerk | PostgreSQL + Drizzle | In development |
| [`nextjs/better-auth/drizzle-postgres`](nextjs/better-auth/drizzle-postgres) | Better Auth | PostgreSQL + Drizzle | Available |
| [`nextjs/authjs/drizzle-postgres`](nextjs/authjs/drizzle-postgres) | Auth.js | PostgreSQL + Drizzle | Available |
| [`nextjs/supabase`](nextjs/supabase) | Supabase Auth | Supabase PostgreSQL | Planned |

## REST starters

| Folder | Architecture | Persistence |
|---|---|---|
| [`rest/standalone/drizzle-postgres`](rest/standalone/drizzle-postgres) | Independent frontend/backend | PostgreSQL + Drizzle |
| [`rest/standalone/mongoose-mongodb`](rest/standalone/mongoose-mongodb) | Independent frontend/backend | MongoDB + Mongoose |
| [`rest/turborepo/drizzle-postgres`](rest/turborepo/drizzle-postgres) | pnpm workspace + Turborepo | PostgreSQL + Drizzle |
| [`rest/turborepo/mongoose-mongodb`](rest/turborepo/mongoose-mongodb) | pnpm workspace + Turborepo | MongoDB + Mongoose |

## tRPC starters

| Folder | Architecture | Persistence |
|---|---|---|
| [`trpc/turborepo/drizzle-postgres`](trpc/turborepo/drizzle-postgres) | pnpm workspace + Turborepo | PostgreSQL + Drizzle |
| [`trpc/turborepo/mongoose-mongodb`](trpc/turborepo/mongoose-mongodb) | pnpm workspace + Turborepo | MongoDB + Mongoose |

## SaaS starters

SaaS variants add organizations, memberships, Stripe billing, and organization-scoped todos to the authentication base.

| Folder | API | Architecture | Persistence |
|---|---|---|---|
| [`saas/rest/standalone/drizzle-postgres`](saas/rest/standalone/drizzle-postgres) | REST | Independent frontend/backend | PostgreSQL + Drizzle |
| [`saas/rest/standalone/mongoose-mongodb`](saas/rest/standalone/mongoose-mongodb) | REST | Independent frontend/backend | MongoDB + Mongoose |
| [`saas/rest/turborepo/drizzle-postgres`](saas/rest/turborepo/drizzle-postgres) | REST | pnpm workspace + Turborepo | PostgreSQL + Drizzle |
| [`saas/rest/turborepo/mongoose-mongodb`](saas/rest/turborepo/mongoose-mongodb) | REST | pnpm workspace + Turborepo | MongoDB + Mongoose |
| [`saas/trpc/turborepo/drizzle-postgres`](saas/trpc/turborepo/drizzle-postgres) | tRPC | pnpm workspace + Turborepo | PostgreSQL + Drizzle |
| [`saas/trpc/turborepo/mongoose-mongodb`](saas/trpc/turborepo/mongoose-mongodb) | tRPC | pnpm workspace + Turborepo | MongoDB + Mongoose |

Each leaf folder is a complete starter, not its own Git repository. Follow the README inside the selected starter.

## Use a starter

```bash
git clone <this-repo>
cp -R starters-with-auth/trpc/turborepo/mongoose-mongodb ../my-app
cd ../my-app
```
