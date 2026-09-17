#!/bin/sh
# Entrypoint del contenedor de produccion (Fase 7).
#
# Las migraciones corren aca y no en el build por dos razones: la imagen se
# buildea en CI, donde no hay base, y el mismo artefacto tiene que poder
# promoverse a cualquier entorno. `prisma migrate deploy` es idempotente y
# toma un advisory lock de Postgres, asi que los dos contenedores que conviven
# durante un deploy `start-first` no se pisan.
set -e

echo "==> Aplicando migraciones pendientes (prisma migrate deploy)"
cd /app/migraciones
./node_modules/.bin/prisma migrate deploy
cd /app

echo "==> Arrancando Next.js en ${HOSTNAME:-0.0.0.0}:${PORT:-3000}"
exec node server.js
