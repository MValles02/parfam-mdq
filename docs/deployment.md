# Deployment

The application is built as a multi-stage Docker image and published to GHCR by
`.github/workflows/deploy.yml`. Dokploy runs the published image.

## Build stages

| Stage        | Responsibility                                                                                  |
| ------------ | ----------------------------------------------------------------------------------------------- |
| Dependencies | Installs pnpm dependencies from the lockfile.                                                   |
| Builder      | Copies the source, generates Prisma client, and runs `pnpm build`.                              |
| Runner       | Contains the Next standalone output, static assets, generated Prisma files, and the entrypoint. |

The Docker build needs public values that Next serializes into the output:

- `NEXT_PUBLIC_SITE_URL`
- `R2_PUBLIC_URL`
- `NEXT_PUBLIC_UMAMI_*`

The Dockerfile uses `AUTH_SECRET_PLACEHOLDER_BUILD`, a non-secret placeholder
build argument for `AUTH_SECRET`, only because build validation requires a
value. Runtime authentication always uses the real deployment secret.

## Runtime configuration

Provide at runtime:

- `DATABASE_URL`
- `AUTH_SECRET`
- `AUTH_TRUST_HOST`
- R2 credentials and R2 bucket configuration
- any integration value not compiled into the public bundle

Do not rename these environment variables during internal refactors. Docker,
CI, Dokploy, and third-party SDKs consume them as external contracts.

## Startup

`docker-entrypoint.sh` applies pending Prisma migrations before starting the
Next standalone server. This makes each container responsible for compatible
schema setup. Migration files are immutable history and must already be present
in the image.

The prelaunch migration history was reset to the single
`20260921225316_initial_schema` migration. Any database that still contains
the earlier tables or `_prisma_migrations` records must be recreated before
deploying this version; `migrate deploy` cannot apply a fresh initial migration
over existing tables. Recreate only this application's database or schema, not
the shared PostgreSQL server. Then run the administrator/settings seed and any
desired reference-data import.

The health endpoint is `GET /api/health`. It performs a database probe and
returns a non-success status when PostgreSQL is unavailable; Docker and Dokploy
use it to decide whether the release is healthy.

## Release checks

Before shipping a repository change, run:

```bash
pnpm format
pnpm typecheck
pnpm lint
pnpm test
pnpm build
```

A build needs the public build-time values above and a generated Prisma client.
The CI workflow currently builds and publishes; its validation coverage should
not be treated as a substitute for the local checks.
