# syntax=docker/dockerfile:1

# ---- base: Node + pnpm ----
FROM node:24-alpine AS base
RUN apk add --no-cache openssl && npm install -g pnpm@10.7.1
WORKDIR /app

# ---- deps: full install (dev deps are needed to build and to run prisma migrate/seed) ----
FROM base AS deps
COPY package.json pnpm-lock.yaml ./
RUN pnpm install --frozen-lockfile

# ---- build ----
FROM deps AS build
COPY . .
RUN pnpm exec prisma generate && pnpm build

# ---- runtime ----
FROM base AS runtime
ENV NODE_ENV=production \
    PORT=3600
COPY --from=build --chown=node:node /app/node_modules ./node_modules
COPY --from=build --chown=node:node /app/dist ./dist
COPY --chown=node:node package.json prisma.config.ts ./
COPY --chown=node:node prisma ./prisma
COPY --chown=node:node docs ./docs
COPY --chown=node:node docker-entrypoint.sh ./docker-entrypoint.sh
RUN chmod +x ./docker-entrypoint.sh
USER node
EXPOSE 3600
HEALTHCHECK --interval=15s --timeout=5s --start-period=30s --retries=5 \
  CMD wget -qO- "http://127.0.0.1:${PORT}/api/verify" > /dev/null || exit 1
ENTRYPOINT ["./docker-entrypoint.sh"]
