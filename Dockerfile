# syntax=docker/dockerfile:1
#
# Parfam MDQ production image.
#
# GitHub Actions builds it and Dokploy deploys it from GHCR. The shared 4-vCPU
# VPS would otherwise compile alongside another application.
#
# The build does not need Postgres because no route queries the database while
# prerendering. The values that must be real are the ones Next inlines into the
# bundle: NEXT_PUBLIC_* and R2_PUBLIC_URL for `images.remotePatterns`.
#
# DATABASE_URL_BUILD and AUTH_SECRET_PLACEHOLDER_BUILD are placeholders, not
# secrets. src/lib/env.ts validates variables at import time, including builds,
# and prisma.config.ts resolves DATABASE_URL when the CLI loads. Both values
# therefore exist so pnpm install and pnpm build succeed. Nothing connects to
# this database URL or signs a cookie with this secret. Inline them per RUN so
# they do not remain in image environment metadata.
ARG DATABASE_URL_BUILD="postgresql://build:build@127.0.0.1:5432/build?schema=public"
ARG AUTH_SECRET_PLACEHOLDER_BUILD="build-placeholder-with-no-runtime-value"

FROM node:22-alpine AS base
ENV PNPM_HOME="/pnpm" \
    PATH="/pnpm:$PATH" \
    COREPACK_ENABLE_DOWNLOAD_PROMPT=0 \
    HUSKY=0
RUN corepack enable
WORKDIR /app


# ---------------------------------------------------------------------------
# deps — complete node_modules with generated Prisma client
# ---------------------------------------------------------------------------
FROM base AS deps
ARG DATABASE_URL_BUILD

# package.json postinstall runs `prisma generate`, so schema and prisma.config.ts
# must be present before install.
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml prisma.config.ts ./
COPY prisma ./prisma

RUN --mount=type=cache,id=pnpm-store,target=/pnpm/store \
    DATABASE_URL="$DATABASE_URL_BUILD" pnpm install --frozen-lockfile


# ---------------------------------------------------------------------------
# builder — next build with standalone output
# ---------------------------------------------------------------------------
FROM base AS builder
ARG DATABASE_URL_BUILD
ARG AUTH_SECRET_PLACEHOLDER_BUILD

# Next inlines these into the client bundle or standalone config. Changing one
# requires rebuilding the image; changing only the Dokploy variable is not enough.
ARG NEXT_PUBLIC_SITE_URL
ARG R2_PUBLIC_URL
ARG NEXT_PUBLIC_UMAMI_URL=""
ARG NEXT_PUBLIC_UMAMI_WEBSITE_ID=""

ENV NEXT_PUBLIC_SITE_URL=$NEXT_PUBLIC_SITE_URL \
    R2_PUBLIC_URL=$R2_PUBLIC_URL \
    NEXT_PUBLIC_UMAMI_URL=$NEXT_PUBLIC_UMAMI_URL \
    NEXT_PUBLIC_UMAMI_WEBSITE_ID=$NEXT_PUBLIC_UMAMI_WEBSITE_ID

ENV NEXT_TELEMETRY_DISABLED=1

# GHCR accepts a build with the default .env.example URL, which would only fail
# in production with canonical URLs pointing to localhost.
RUN test -n "$NEXT_PUBLIC_SITE_URL" || { echo "ERROR: NEXT_PUBLIC_SITE_URL build argument is required"; exit 1; }
RUN test -n "$R2_PUBLIC_URL" || { echo "ERROR: R2_PUBLIC_URL build argument is required because next/image rejects photos without it"; exit 1; }

COPY --from=deps /app/node_modules ./node_modules
COPY . .

# The repository has no public/ directory: src/app/icon.tsx generates the
# favicon, fonts live in src/assets/, and photos come from R2. Standalone serves
# public/ if it exists, but runner COPY fails otherwise, so ensure it exists.
RUN mkdir -p public

RUN DATABASE_URL="$DATABASE_URL_BUILD" AUTH_SECRET="$AUTH_SECRET_PLACEHOLDER_BUILD" pnpm build


# ---------------------------------------------------------------------------
# migrator — Prisma CLI for entrypoint `migrate deploy`
# ---------------------------------------------------------------------------
# Standalone output does not include the CLI or migrations, only request-traced
# files. Install the CLI alone at the package.json version instead of carrying
# the builder's full node_modules with hundreds of MB of development dependencies.
FROM base AS migrator
WORKDIR /migrator
COPY package.json ./package.json
RUN PRISMA_VERSION="$(node -p "require('./package.json').devDependencies.prisma")" \
 && rm package.json \
 && npm init -y > /dev/null \
 && npm install --omit=dev --no-audit --no-fund "prisma@${PRISMA_VERSION}" dotenv


# ---------------------------------------------------------------------------
# runner — the only published stage
# ---------------------------------------------------------------------------
FROM node:22-alpine AS runner
WORKDIR /app

ENV NODE_ENV=production \
    NEXT_TELEMETRY_DISABLED=1 \
    PORT=3000 \
    HOSTNAME=0.0.0.0

# Prisma schema engine requires openssl on musl.
RUN apk add --no-cache openssl \
 && addgroup --system --gid 1001 nodejs \
 && adduser --system --uid 1001 nextjs

# server.js calls process.chdir(__dirname), so runtime process.cwd() is /app.
# Font readers resolve src/assets/fonts/ from there. next.config.ts includes
# them through outputFileTracingIncludes.
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static
COPY --from=builder --chown=nextjs:nodejs /app/public ./public

# Migration assets live in /app/migrations. prisma.config.ts resolves dotenv and
# relative schema/migration paths from that entrypoint working directory.
COPY --from=migrator --chown=nextjs:nodejs /migrator ./migrations
COPY --chown=nextjs:nodejs prisma.config.ts ./migrations/prisma.config.ts
COPY --chown=nextjs:nodejs prisma/schema.prisma ./migrations/prisma/schema.prisma
COPY --chown=nextjs:nodejs prisma/migrations ./migrations/prisma/migrations

COPY --chown=nextjs:nodejs docker-entrypoint.sh /usr/local/bin/docker-entrypoint.sh
RUN chmod +x /usr/local/bin/docker-entrypoint.sh

USER nextjs
EXPOSE 3000

# Probe /api/health, which runs SELECT 1. A server that starts without reaching
# Postgres must fail so Dokploy can roll back. start-period allows migrations.
# A broken container becomes unhealthy after roughly 70 seconds, so the Swarm
# update Monitor must exceed that interval. Swarm inherits this HEALTHCHECK.
HEALTHCHECK --interval=10s --timeout=5s --start-period=40s --retries=3 \
  CMD node -e "fetch('http://127.0.0.1:'+(process.env.PORT||3000)+'/api/health').then(r=>{process.exit(r.ok?0:1)}).catch(()=>process.exit(1))"

ENTRYPOINT ["/usr/local/bin/docker-entrypoint.sh"]
