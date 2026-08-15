# starters-with-auth

Catalog of full-stack auth starter kits. One GitHub repo, one clone, multiple starter folders. Copy the folder that matches the stack you want.

Use **pnpm** only.

## Starters

| Folder | Stack |
|---|---|
| `modular-monolith` | Express 5 + Next.js, independent apps, MongoDB, custom JWT cookies |
| `modular-monolith-pnpm-workspace` | Same architecture with a pnpm workspace + Turborepo |
| `trpc-pnpm-workspace` | pnpm workspace + Turborepo + tRPC + MongoDB |
| `trpc-pnpm-drizzle-postgres` | pnpm workspace + Turborepo + tRPC + PostgreSQL + Drizzle |

Each folder is a complete starter, not its own git repository.

## Use a starter

```bash
git clone <this-repo>
cp -R trpc-pnpm-workspace ../my-app
cd ../my-app
```

Then follow that starter's README.
