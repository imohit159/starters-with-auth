# syntax=docker/dockerfile:1

FROM node:22-bookworm-slim AS build
WORKDIR /app
ENV PNPM_HOME=/pnpm
ENV PATH=$PNPM_HOME:$PATH
RUN corepack enable && corepack prepare pnpm@11.5.2 --activate

COPY package.json pnpm-lock.yaml pnpm-workspace.yaml turbo.json ./
COPY apps ./apps
COPY packages ./packages

RUN pnpm install --frozen-lockfile
RUN pnpm --filter api build
RUN pnpm --filter api --prod deploy /out

FROM node:22-bookworm-slim AS runner
WORKDIR /app
ENV NODE_ENV=production

COPY --from=build /out/node_modules ./node_modules
COPY --from=build /app/apps/api/dist ./dist
COPY --from=build /out/package.json ./package.json
COPY --from=build /app/packages/database/drizzle ./drizzle

USER node
EXPOSE 4000
CMD ["sh", "-c", "node dist/migrate.js && node dist/server.js"]
