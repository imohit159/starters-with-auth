# starters-with-auth

Catalog of full-stack auth starter kits. One GitHub repo, one clone, multiple starter folders. Copy the folder that matches the stack you want.

Use **pnpm** only.

## Starters

| Folder | Stack |
|---|---|
| `modular monolith` | Express 5 + Next.js, independent apps, MongoDB, custom JWT cookies |
| `modular monolith with pnpm workspace` | Same architecture with a pnpm workspace |
| `pnpm workspace with trpc` | pnpm workspace + tRPC |

Each folder is a complete starter, not its own git repository.

## Use a starter

```bash
git clone <this-repo>
cp -R "modular monolith" ../my-app
cd ../my-app
```

Then follow that starter's README.
