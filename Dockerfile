# syntax=docker/dockerfile:1
#
# Imagen de produccion de Parfam MDQ (PLAN.md, Fase 7).
#
# Se buildea en GitHub Actions y se despliega en Dokploy desde GHCR: la VPS es
# compartida (4 vCPU) y compilar ahi competiria con la otra app que corre en el
# mismo server.
#
# El build NO necesita Postgres: ninguna ruta consulta la base en tiempo de
# prerender (ver src/lib/configuracion.ts y src/app/sitemap.ts). Los unicos
# valores que si tienen que ser reales aca son los que Next inlinea en el
# bundle: NEXT_PUBLIC_* y R2_PUBLIC_URL (que alimenta `images.remotePatterns`
# y queda serializado en el output standalone).
#
# DATABASE_URL_BUILD y FIRMA_PLACEHOLDER_BUILD son placeholders, NO secretos
# (el nombre evita "SECRET" a proposito: el linter de BuildKit avisa por ARG/ENV
# con nombres que suenan a credencial -- AUTH, SECRET, KEY -- y este no lo es):
# `src/lib/env.ts` valida todas las variables al importarse (tambien durante el
# build) y `prisma.config.ts` resuelve `env("DATABASE_URL")` apenas la CLI lo
# carga, asi que las dos tienen que existir para que `pnpm install` y
# `pnpm build` no fallen. No se conecta nadie a esa URL ni se firma ninguna
# cookie con ese secreto: si algun dia el build volviera a necesitar la base de
# verdad, fallaria aca con un ECONNREFUSED ruidoso, que es lo que queremos.
# Van inline en cada RUN y no como ENV para que no queden en el entorno de la
# imagen ni en sus metadatos.
ARG DATABASE_URL_BUILD="postgresql://build:build@127.0.0.1:5432/build?schema=public"
ARG FIRMA_PLACEHOLDER_BUILD="placeholder-de-build-sin-valor-en-runtime"

FROM node:22-alpine AS base
ENV PNPM_HOME="/pnpm" \
    PATH="/pnpm:$PATH" \
    COREPACK_ENABLE_DOWNLOAD_PROMPT=0 \
    HUSKY=0
RUN corepack enable
WORKDIR /app


# ---------------------------------------------------------------------------
# deps — node_modules completo, con el cliente de Prisma generado
# ---------------------------------------------------------------------------
FROM base AS deps
ARG DATABASE_URL_BUILD

# El `postinstall` del package.json corre `prisma generate`, asi que el schema
# y el prisma.config.ts tienen que estar ANTES del install o el install falla.
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml prisma.config.ts ./
COPY prisma ./prisma

RUN --mount=type=cache,id=pnpm-store,target=/pnpm/store \
    DATABASE_URL="$DATABASE_URL_BUILD" pnpm install --frozen-lockfile


# ---------------------------------------------------------------------------
# builder — next build con output standalone
# ---------------------------------------------------------------------------
FROM base AS builder
ARG DATABASE_URL_BUILD
ARG FIRMA_PLACEHOLDER_BUILD

# Reales: Next los inlinea en el bundle del cliente / los serializa en el
# config del standalone. Cambiar cualquiera de estos obliga a rebuildear la
# imagen: no alcanza con tocar la variable en Dokploy.
ARG NEXT_PUBLIC_SITE_URL
ARG R2_PUBLIC_URL
ARG NEXT_PUBLIC_UMAMI_URL=""
ARG NEXT_PUBLIC_UMAMI_WEBSITE_ID=""

ENV NEXT_PUBLIC_SITE_URL=$NEXT_PUBLIC_SITE_URL \
    R2_PUBLIC_URL=$R2_PUBLIC_URL \
    NEXT_PUBLIC_UMAMI_URL=$NEXT_PUBLIC_UMAMI_URL \
    NEXT_PUBLIC_UMAMI_WEBSITE_ID=$NEXT_PUBLIC_UMAMI_WEBSITE_ID

ENV NEXT_TELEMETRY_DISABLED=1

# Un build con la URL por defecto del .env.example se sube a GHCR igual y
# recien se nota en produccion, con los canonical apuntando a localhost.
RUN test -n "$NEXT_PUBLIC_SITE_URL" || { echo "ERROR: falta el build arg NEXT_PUBLIC_SITE_URL"; exit 1; }
RUN test -n "$R2_PUBLIC_URL" || { echo "ERROR: falta el build arg R2_PUBLIC_URL (sin el, next/image rechaza las fotos)"; exit 1; }

COPY --from=deps /app/node_modules ./node_modules
COPY . .

RUN DATABASE_URL="$DATABASE_URL_BUILD" AUTH_SECRET="$FIRMA_PLACEHOLDER_BUILD" pnpm build


# ---------------------------------------------------------------------------
# migrador — CLI de Prisma sola, para el `migrate deploy` del entrypoint
# ---------------------------------------------------------------------------
# El output standalone no trae la CLI ni las migraciones: trae solo lo que el
# trace considera necesario para servir requests. En vez de arrastrar el
# node_modules entero del builder (cientos de MB de dev deps), se instala la
# CLI sola, con la version exacta que declara el package.json del repo para que
# no se desincronice del `prisma migrate dev` de desarrollo.
FROM base AS migrador
WORKDIR /migrador
COPY package.json ./package.json
RUN PRISMA_VERSION="$(node -p "require('./package.json').devDependencies.prisma")" \
 && rm package.json \
 && npm init -y > /dev/null \
 && npm install --omit=dev --no-audit --no-fund "prisma@${PRISMA_VERSION}" dotenv


# ---------------------------------------------------------------------------
# runner — lo unico que se publica
# ---------------------------------------------------------------------------
FROM node:22-alpine AS runner
WORKDIR /app

ENV NODE_ENV=production \
    NEXT_TELEMETRY_DISABLED=1 \
    PORT=3000 \
    HOSTNAME=0.0.0.0

# openssl lo pide el schema engine de Prisma en musl.
RUN apk add --no-cache openssl \
 && addgroup --system --gid 1001 nodejs \
 && adduser --system --uid 1001 nextjs

# `server.js` hace `process.chdir(__dirname)`, asi que el `process.cwd()` de
# runtime es /app: por eso las fuentes que leen `src/assets/fonts/` (el favicon
# y las OG images) resuelven desde aca. Entran al standalone via
# `outputFileTracingIncludes` en next.config.ts, no copiadas a mano.
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static
COPY --from=builder --chown=nextjs:nodejs /app/public ./public

# Todo lo de las migraciones vive junto en /app/migraciones: el prisma.config.ts
# del repo resuelve `dotenv/config` y las rutas relativas (`prisma/schema.prisma`,
# `prisma/migrations`) contra ese directorio, que es el cwd del entrypoint.
COPY --from=migrador --chown=nextjs:nodejs /migrador ./migraciones
COPY --chown=nextjs:nodejs prisma.config.ts ./migraciones/prisma.config.ts
COPY --chown=nextjs:nodejs prisma/schema.prisma ./migraciones/prisma/schema.prisma
COPY --chown=nextjs:nodejs prisma/migrations ./migraciones/prisma/migrations

COPY --chown=nextjs:nodejs docker-entrypoint.sh /usr/local/bin/docker-entrypoint.sh
RUN chmod +x /usr/local/bin/docker-entrypoint.sh

USER nextjs
EXPOSE 3000

# Pega contra /api/health, que hace un SELECT 1: un servidor que levanta pero
# no llega a Postgres tiene que dar rojo, o el rollback de Dokploy no se
# dispara nunca. `start-period` le da aire a las migraciones.
#
# Los tiempos importan para el rollback: un contenedor roto queda `unhealthy`
# a los ~70s (40s de start-period + 3 reintentos cada 10s), y el `Monitor` del
# update config de Swarm tiene que ser MAS largo que eso o el deploy se da por
# bueno antes de que el healthcheck alcance a fallar. Swarm hereda este
# HEALTHCHECK, asi que estos son los valores de verdad; lo que se cargue en
# Dokploy tiene que decir lo mismo.
HEALTHCHECK --interval=10s --timeout=5s --start-period=40s --retries=3 \
  CMD node -e "fetch('http://127.0.0.1:'+(process.env.PORT||3000)+'/api/health').then(r=>{process.exit(r.ok?0:1)}).catch(()=>process.exit(1))"

ENTRYPOINT ["/usr/local/bin/docker-entrypoint.sh"]
