#!/bin/sh
# Production container entrypoint.
#
# Migrations run here because CI builds without a database and the same image
# must be promotable to every environment. `prisma migrate deploy` is
# idempotent and uses a PostgreSQL advisory lock, so containers overlapping
# during a `start-first` deployment do not conflict.
set -e

echo "==> Applying pending migrations (prisma migrate deploy)"
cd /app/migrations
./node_modules/.bin/prisma migrate deploy
cd /app

echo "==> Starting Next.js at ${HOSTNAME:-0.0.0.0}:${PORT:-3000}"
exec node server.js
