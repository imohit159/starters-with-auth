# syntax=docker/dockerfile:1

FROM node:22-bookworm-slim AS build
WORKDIR /app
ENV PNPM_HOME=/pnpm
ENV PATH=$PNPM_HOME:$PATH
RUN corepack enable && corepack prepare pnpm@11.5.2 --activate

COPY . .
RUN pnpm install --frozen-lockfile
RUN pnpm --filter api build

FROM node:22-bookworm-slim AS runner
WORKDIR /app
ENV NODE_ENV=production

# Keep the pnpm layout so externals (argon2, mongoose, express) resolve.
# Workspace TypeScript is already compiled into apps/api/dist.
COPY --from=build /app/package.json /app/pnpm-lock.yaml /app/pnpm-workspace.yaml ./
COPY --from=build /app/node_modules ./node_modules
COPY --from=build /app/apps/api ./apps/api
COPY --from=build /app/packages ./packages

WORKDIR /app/apps/api
USER node
EXPOSE 4000
CMD ["node", "dist/server.js"]
