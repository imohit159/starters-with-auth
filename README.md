# starters-with-auth

Catalog of full-stack auth starter kits. One GitHub repo, one clone, multiple starter folders. Copy the folder that matches the stack you want.

Use **pnpm** only.

Folder names are `{transport}-{layout}-{orm?}-{db}`:

- **transport:** `rest` (JSON HTTP) or `trpc`
- **layout:** `apps` (independent `backend/` + `frontend/`) or `workspace` (pnpm + Turborepo)
- **orm/db:** `mongo` (Mongoose) or `drizzle-postgres`

## Starters

| Folder | Transport | Layout | Persistence |
|---|---|---|---|
| [`rest-apps-mongo`](rest-apps-mongo) | REST | Independent apps | MongoDB + Mongoose |
| [`rest-apps-drizzle-postgres`](rest-apps-drizzle-postgres) | REST | Independent apps | PostgreSQL + Drizzle |
| [`rest-workspace-mongo`](rest-workspace-mongo) | REST | pnpm workspace | MongoDB + Mongoose |
| [`rest-workspace-drizzle-postgres`](rest-workspace-drizzle-postgres) | REST | pnpm workspace | PostgreSQL + Drizzle |
| [`trpc-workspace-mongo`](trpc-workspace-mongo) | tRPC | pnpm workspace | MongoDB + Mongoose |
| [`trpc-workspace-drizzle-postgres`](trpc-workspace-drizzle-postgres) | tRPC | pnpm workspace | PostgreSQL + Drizzle |
| [`saas-trpc-workspace-drizzle-postgres`](saas-trpc-workspace-drizzle-postgres) | tRPC | pnpm workspace | PostgreSQL + Drizzle (SaaS: orgs + Stripe) |

SaaS variants (same product: orgs, memberships, Stripe, org-scoped todos) live under [`saas-kits/`](saas-kits):

| Folder | Transport | Layout | Persistence |
|---|---|---|---|
| [`saas-kits/saas-trpc-workspace-mongo`](saas-kits/saas-trpc-workspace-mongo) | tRPC | pnpm workspace | MongoDB + Mongoose |
| [`saas-kits/saas-workspace-mongo`](saas-kits/saas-workspace-mongo) | REST | pnpm workspace | MongoDB + Mongoose |
| [`saas-kits/saas-workspace-drizzle-postgres`](saas-kits/saas-workspace-drizzle-postgres) | REST | pnpm workspace | PostgreSQL + Drizzle |
| [`saas-kits/saas-rest-apps-mongo`](saas-kits/saas-rest-apps-mongo) | REST | Independent apps | MongoDB + Mongoose |
| [`saas-kits/saas-rest-apps-drizzle-postgres`](saas-kits/saas-rest-apps-drizzle-postgres) | REST | Independent apps | PostgreSQL + Drizzle |

Each folder is a complete starter, not its own git repository. Auth product is the same in every kit: email/password + Google OAuth, httpOnly access + rotating refresh cookies. SaaS kits add organizations, memberships, and Stripe billing on that auth base.

## Use a starter

```bash
git clone <this-repo>
cp -R trpc-workspace-mongo ../my-app
cd ../my-app
```

Then follow that starter's README.
