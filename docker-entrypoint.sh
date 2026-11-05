#!/bin/sh
set -e

# Apply pending migrations before starting (idempotent).
if [ "${RUN_MIGRATIONS:-true}" = "true" ]; then
  node_modules/.bin/prisma migrate deploy
fi

# Optional idempotent seeds (platform admin + LatAm templates).
if [ "${RUN_SEED:-false}" = "true" ]; then
  node_modules/.bin/tsx prisma/seed.ts || true
  if [ -f prisma/seed-templates.ts ]; then
    node_modules/.bin/tsx prisma/seed-templates.ts || true
  fi
fi

exec node dist/src/main
