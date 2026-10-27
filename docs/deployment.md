# Deployment

The application is built as a multi-stage Docker image and published to GHCR by
`.github/workflows/deploy.yml` on pushes to `main` (production) and `develop`
(development). Dokploy runs the published image.

`.github/workflows/ci.yml` (workflow "CI") runs the `checks` job (typecheck,
lint, integration tests against a Postgres service; no unit tests) on every pull request and is reused by `deploy.yml`. Pull requests
also run the `e2e` job (see "E2E tests (Playwright)"), which is skipped when
`deploy.yml` reuses the workflow. On `main` and
`develop`, `checks` is followed by the `publish` job, which logs in to GHCR with the
built-in `GITHUB_TOKEN` (`packages: write` on that job) and pushes
`latest`/`sha-*` tags — the GHCR package inherits access from this repository,
so no separate registry credential is needed. The `deploy` job then POSTs the
Dokploy webhook, sending `CF-Access-Client-Id`/`CF-Access-Client-Secret`
headers with a Cloudflare Access service token (`parfam-mdq-deploy`),
because `dokploy.mateovalles.com/api/deploy*` is protected by Cloudflare
Access; the step fails if `DOKPLOY_WEBHOOK_URL`, `CF_ACCESS_CLIENT_ID`, or
`CF_ACCESS_CLIENT_SECRET` is missing. It then waits until `vars.HEALTH_URL`
reports status `ok` with the new commit SHA (failing if that repo variable is
missing), then smoke-tests that the site's home page returns `200`. The
`deploy` job runs in the `production` (main) or `development` (develop) GitHub
environment, and the secrets it uses (`DOKPLOY_WEBHOOK_URL`,
`CF_ACCESS_CLIENT_ID`, `CF_ACCESS_CLIENT_SECRET`) are defined per environment.

## Development environment

Pushes to `develop` build `ghcr.io/mvalles02/parfam-mdq:develop` (never
`latest`) and deploy it to the `development` environment of the Dokploy
project. It is served at https://dev.parfammdq.com behind Cloudflare Access;
the service token `github-actions-deploy` must be allowed by that policy
because the health check and smoke test send its headers.

The `develop` run uses these extra repo variables instead of the production
ones: `DEV_NEXT_PUBLIC_SITE_URL`, `DEV_R2_PUBLIC_URL`, and `DEV_HEALTH_URL`.
Its `DOKPLOY_WEBHOOK_URL` secret is set in the `development` environment, with
the same name as the production one in the `production` environment.

The dev database is a separate PostgreSQL service (`database-dev`) with no
backups. `parfam-dev-refresh.sh` (in the `infra` repo, `files/`, on the VPS)
rebuilds it from a production `pg_dump`; it only reads from production. The
script stops the dev app, drops and restores the dev database, replaces every
`User` row with the test user `test@parfammdq.com`, sets the WhatsApp number
to a test number, copies the product images referenced by `ProductImage` from
the public production image URL into the dev bucket, and starts the dev app so
its entrypoint applies any migration that `develop` has and production does
not. Orders are kept as copied. Run it on demand or from its schedule.

## Build stages

| Stage        | Responsibility                                                                                  |
| ------------ | ----------------------------------------------------------------------------------------------- |
| Dependencies | Installs pnpm dependencies from the lockfile.                                                   |
| Builder      | Copies the source, generates Prisma client, and runs `pnpm build`.                              |
| Runner       | Contains the Next standalone output, static assets, generated Prisma files, and the entrypoint. |

The Docker build needs public values that Next serializes into the output:

- `NEXT_PUBLIC_SITE_URL`
- `R2_PUBLIC_URL`

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

Production sits behind Cloudflare → Traefik → app. The VPS firewall's
`DOCKER-USER` chain must keep accepting new IPv4 connections to 80/443 only
from Cloudflare's published ranges (the `cf-v4` ipset) — every request then
necessarily passes through Cloudflare, which overwrites `CF-Connecting-IP`
with the real client IP. The VPS has no public IPv6 address: the
`ip6tables` `DOCKER-USER` chain drops every new connection arriving on
`ens3`, and Traefik publishes 80/443 on IPv4 only. `getClientIp()` in
`src/lib/rate-limit.ts` trusts
only that header for rate-limit keys (see "Rate limits" in
`docs/authentication.md`); relaxing this firewall rule without changing that
trust would let a spoofed header past the rate limiter again.

## Startup

`docker-entrypoint.sh` applies pending Prisma migrations before starting the
Next standalone server. This makes each container responsible for compatible
schema setup. Migration files are immutable history and must already be present
in the image.

In production, `src/lib/env.ts` requires `R2_ACCOUNT_ID`, `R2_ACCESS_KEY_ID`,
`R2_SECRET_ACCESS_KEY`, `R2_BUCKET` and `R2_PUBLIC_URL`; the server fails to start
if any is missing. They stay optional in dev, test and during `next build`
(`NEXT_PHASE=phase-production-build`).

Deploys are start-first, so the old and new containers overlap on the same
database while the new one migrates. Every migration must therefore keep the
previous release working (expand/contract); drops and renames ship later.

The `overrides` in `pnpm-workspace.yaml` pin several transitive
dependencies (`lodash`, `mysql2`, `valibot`, `deepmerge-ts`, `fast-uri`) to versions that
patch `pnpm audit` advisories (`valibot` via `@t3-oss/env-nextjs` and
`@hookform/resolvers`; the rest via the Prisma CLI). The Dockerfile's
`migrator` stage (around line 92) installs the Prisma CLI with
`npm install` instead of `pnpm`, so it does not pick up those overrides; its
copies of `lodash`, `deepmerge-ts`, and `mysql2` stay at whatever version
`prisma` depends on. This is accepted because, in that stage, these packages
only handle trusted inputs: the repository's own `prisma.config.ts` (loaded
via `@prisma/config`, which uses `deepmerge-ts`) and schema, plus a
PostgreSQL connection — `mysql2` and Studio's `lodash` are never loaded.

The migration history currently has two migrations:
`20260921225316_initial_schema` (the initial schema, including the
`pg_trgm`/`unaccent` extensions) and `20260925201541_reference_dataset_v2`,
which adds several `NOT NULL` columns without a default
(`FragranceRef.slug`, `FragranceRefAccord.strength`, `Note.family`).
`migrate deploy` fails when it applies that second migration to a database
that already holds `FragranceRef`/`Note`/`FragranceRefAccord` rows from an
earlier reference import, because Postgres cannot backfill a `NOT NULL`
column with no default for existing rows. Production's reference tables were
empty when this migration shipped, so its release applied the migration
in place instead of resetting the database; see "Updating the reference
dataset in production" below for the exact steps actually used, and "Full
reset runbook" below that for the case where a future migration cannot apply
over already-populated reference tables. A reset recreates only this
application's database or schema, never the shared PostgreSQL server.

The health endpoint is `GET /api/health`. It performs a database probe and
returns a non-success status when PostgreSQL is unavailable; Docker and Dokploy
use it to decide whether the release is healthy.

## Updating the reference dataset in production (in-place, used for the v2 release)

Use this procedure when the pending migration applies cleanly over the
current production data — for example because the reference tables
(`FragranceRef`, `Note`, `Accord`, and related tables) are still empty, or the
migration itself supplies a safe default/backfill for any new `NOT NULL`
column. It updates the running database in place, without dropping it. This
is the actual procedure used to ship `20260925201541_reference_dataset_v2` on
2026-09-26: production's reference tables were empty, so the full reset in
"Full reset runbook" below (written for the case where migrating over
existing rows would fail) was not needed.

Production Postgres runs as its own Dokploy service — appName/host
`parfammdq-db-v2-guduob`, database and user both `parfam` — on the
attachable overlay network `dokploy-network`, with no port published to the
host. Reach it with `docker exec` from the VPS, not a client connecting over a
published port. Dokploy already backs up this database to the private
`vps-dokploy-backups` R2 bucket: hourly (`0 * * * *`, 48 kept) and daily at
03:30 UTC (30 kept), under
`parfammdq-db-v2-guduob/postgres/parfam/{hourly,daily}/`, with a 60-day bucket
lifecycle and a 14-day bucket lock on the daily prefix. **Never restore with
Dokploy's "Duplicate/copy"** — restore into a newly created DB instead (see
`infra/backups.md` for the full schedule, lock, and restore details). A manual
dump before a release is an extra safety margin, not the only backup.

0. **Preconditions.** The dataset file and translations are ready (see
   `docs/modules/reference-data.md`), `pnpm db:check-translations` passes
   locally, and the migration is committed on the PR that will be merged in
   step 3.

1. **Optional: take a manual backup before changing anything**, in addition to
   Dokploy's automatic daily backup:

   ```bash
   docker exec <db-container> pg_dump -U parfam -d parfam -Fc \
     > /home/<vps-user>/backups/parfam/parfam-$(date +%F).dump
   pg_restore -l /home/<vps-user>/backups/parfam/parfam-$(date +%F).dump | head
   ```

2. **Optional: clear test orders and reset the order-number sequence**, if a
   go-live needs order numbers to start clean. Checkout formats `PM-` plus a
   zero-padded `nextval('"Order_number_seq"')`
   (`formatOrderNumber` in `src/lib/whatsapp.ts`, called from
   `src/app/(store)/checkout/actions.ts`) — only reset the sequence after
   removing (or intentionally keeping) every existing order, or a future
   order can collide with an old one's number:

   ```bash
   docker exec -i <db-container> psql -U parfam -d parfam \
     -c 'DELETE FROM "Order" WHERE id = <order-id>;'
   docker exec -i <db-container> psql -U parfam -d parfam \
     -c 'SELECT setval('"'"'"Order_number_seq"'"'"', 1, false);'
   ```

3. **Merge the PR into `main`.** `.github/workflows/deploy.yml` builds and
   deploys the image; `docker-entrypoint.sh` runs `prisma migrate deploy` on
   startup and applies the pending migration automatically. This is safe
   specifically because step 0 confirmed the migration applies over the
   current data (see the section intro above) — do not merge first and check
   this after.

4. **Run the importer from the VPS, in a temporary container attached to
   `dokploy-network`**, reusing the deployed app's own `DATABASE_URL` so
   nothing hardcodes credentials on the command line:

   ```bash
   docker run -d --name parfam-import \
     --network dokploy-network \
     -e DATABASE_URL="$(docker exec <web-container> printenv DATABASE_URL)" \
     -v <repo-path-on-vps>:/app -w /app \
     node:24-bookworm-slim \
     node node_modules/tsx/dist/cli.mjs scripts/import-references.ts --limit 1000
   ```

   Notes learned running this for real:

   - `node_modules/.bin/tsx` is a shell shim, not a Node script — running it
     as `node node_modules/.bin/tsx ...` fails. Invoke
     `node_modules/tsx/dist/cli.mjs` with `node` instead, as above.
   - The image must be glibc-based (`bookworm`, not `alpine`): the mounted
     `<repo-path-on-vps>/node_modules` was installed on the host and includes
     native binaries (e.g. `sharp`), which an Alpine (musl) container cannot
     load.
   - The script's `dotenv` call never overrides an already-set environment
     variable, so the `-e DATABASE_URL=...` passed to `docker run` safely
     wins over any `.env` file present in the mounted repo.
   - Run a smoke test with `--limit 1000` first, as above. Once it succeeds,
     rerun the same command without `--limit` for the full dataset — the
     import is idempotent (see "Importer usage" in
     `docs/modules/reference-data.md`), so re-running the smoke-tested batch
     again does no harm.
   - Track the container and clean it up when done:

     ```bash
     docker wait parfam-import
     docker logs parfam-import
     docker rm parfam-import
     ```

   The v2 release's full run (140,228 records) took about 597 seconds (~10
   minutes) and reported 8,287 brands, 3,083 perfumers, 2,581 notes, 92
   accords, and 2 out-of-range years — matching the counts in
   `docs/modules/reference-data.md`.

5. **Post-import checks.** Run the same queries as step 8 of the full reset
   runbook below, through `docker exec <db-container> psql -U parfam -d parfam
-c '...'` instead of a tunneled `psql "$APP_URL"`.

6. **Verify health.** Cloudflare's Bot Fight Mode was turned OFF for
   `parfammdq.com` on 2026-09-28 so non-browser clients — `curl`, CI, uptime
   monitors — can reach the app instead of being challenged. `HEALTH_URL` is
   set to `https://parfammdq.com/api/health` for this repo's CI, which is
   what `deploy.yml` uses for the post-deploy health check and smoke test.
   You can check health the same way:

   ```bash
   curl -fsS https://parfammdq.com/api/health
   ```

   Checking from inside the server still works too:

   ```bash
   docker exec <web-container> node -e \
     "fetch('http://127.0.0.1:3000/api/health').then(async r => console.log(r.status, await r.text()))"
   ```

### Release log

- **2026-09-26** — Shipped `20260925201541_reference_dataset_v2` in place
  (reference tables were empty, so the full reset runbook below was not
  needed): imported 140,228 references / 8,287 brands / 3,083 perfumers /
  2,581 notes / 92 accords (2 out-of-range years); AVIF generation confirmed
  working in production; the R2 cleanup step was skipped because dev and prod
  still pointed at the same bucket at the time (since resolved; see "R2
  bucket isolation" in `docs/findings.md`).

## Full reset runbook (when a migration cannot apply over existing reference rows)

This is the runbook for the case the section above assumes did not apply this
time: a migration that adds a `NOT NULL` column without a default over
`FragranceRef`/`Note`/`FragranceRefAccord` rows that already exist (`migrate
deploy` cannot backfill those from Postgres alone). Keep it as the template
for a future migration in that situation. Steps that touch the shared
database or R2 are destructive and are run manually by whoever operates the
release, never by an agent.

The database must be ready **before** anything reaches `main`: `.github/workflows/deploy.yml`
builds and deploys on every push to `main` that touches a non-`.md` file, and
`docker-entrypoint.sh` runs `prisma migrate deploy` on container start. If that
image starts against the still-populated database, the migration fails
partway through (it adds `NOT NULL` columns with no default) and Prisma
records a failed row for it in `_prisma_migrations`. That is why the reset
(steps 1–8) happens on a feature branch first, and the merge to `main` (step 9)
comes only after the import and its checks succeed.

0. **Preconditions.** The work is committed on a feature branch, **not merged
   to `main`**, so `.github/workflows/deploy.yml` has not built or deployed it
   yet. `new-database/perfumes.jsonl` is present on the machine that will run
   the import (see `docs/modules/reference-data.md`). `pnpm db:check-translations`
   passes locally with zero missing note/accord slugs. The feature branch is
   checked out locally — the migration files and the importer used in steps 5
   and 7 come from it, not from `main`.

   > **If the new image was already deployed before this reset** (for example,
   > someone pushed the migration to `main` before reading this runbook): stop
   > the app in Dokploy first. Then either proceed with steps 1–8 below — the
   > app database gets dropped and recreated in step 4 anyway, so the failed
   > `_prisma_migrations` row disappears with it — or, if the old database must
   > be kept as-is instead, mark the failed migration resolved and put the
   > previous image back:
   >
   > ```bash
   > DATABASE_URL="$APP_URL" pnpm exec prisma migrate resolve --rolled-back 20260925201541_reference_dataset_v2
   > ```
   >
   > then redeploy the previous image tag in Dokploy.

1. **Stop the app in Dokploy.** Stop, not just redeploy, the running
   application service so the old container does not keep writing to the
   database while it is dropped and recreated, and so its entrypoint does not
   race the reset by trying `migrate deploy` again.

2. **Open an SSH tunnel to Postgres.** Find the internal host/port of the
   Dokploy Postgres service — its detail page in the Dokploy UI shows an
   "Internal Host" (the Docker service name on the Swarm overlay network,
   reachable at port 5432 from other containers), or, from the VPS itself,
   `docker service ls` / `docker network inspect <network>` locates the
   service name if the UI does not show it directly.

   ```bash
   ssh -N -L 15432:<postgres-container-or-host>:5432 <ssh-user>@<vps>
   ```

   Leave that running, then in another terminal define:

   ```bash
   export ADMIN_URL="postgresql://<appuser>:<password>@localhost:15432/postgres"
   export APP_URL="postgresql://<appuser>:<password>@localhost:15432/<appdb>"
   ```

   `ADMIN_URL` targets the `postgres` maintenance database because
   `DROP`/`CREATE DATABASE` cannot run against the database being dropped. If
   `<appuser>` lacks the privilege to drop/create databases or extensions, ask
   whoever manages the Dokploy Postgres instance for a role that has it,
   rather than granting the application role superuser permanently.

3. **Backup.**

   ```bash
   pg_dump "$APP_URL" -Fc -f "parfam-$(date +%F).dump"
   pg_restore -l "parfam-$(date +%F).dump" | head
   ```

   Keep the dump until step 10 verifies the new deploy; it is the rollback
   path in step 12.

   Optional: also back up the R2 `products/` prefix, so a rollback can restore
   images alongside the database — without this, a database rollback can leave
   `ProductImage` rows pointing at objects step 11 later deleted. Requires the
   exports shown in step 11:

   ```bash
   aws s3 sync "s3://$R2_BUCKET/products/" ./r2-products-backup/ \
     --endpoint-url "https://$R2_ACCOUNT_ID.r2.cloudflarestorage.com"
   ```

4. **Drop and recreate only the app database.**

   ```bash
   psql "$ADMIN_URL" -c 'DROP DATABASE "<appdb>" WITH (FORCE);'
   psql "$ADMIN_URL" -c 'CREATE DATABASE "<appdb>" OWNER "<appuser>";'
   ```

   This drops only `<appdb>`, never the shared PostgreSQL server or any other
   database on it. The initial migration
   (`prisma/migrations/20260921225316_initial_schema/migration.sql`) runs
   `CREATE EXTENSION IF NOT EXISTS pg_trgm WITH SCHEMA public;` and
   `CREATE EXTENSION IF NOT EXISTS unaccent WITH SCHEMA public;` as part of
   step 5. If `<appuser>` cannot create extensions, run those two statements
   as a superuser against `<appdb>` before step 5 — check that migration file
   for the exact statements.

5. **Apply migrations from the feature branch.** Run this from the feature
   branch checked out in step 0, not from `main` — its migration files are
   what step 9 later merges.

   ```bash
   DATABASE_URL="$APP_URL" pnpm db:deploy
   ```

6. **Seed the administrator user and site settings.**

   ```bash
   DATABASE_URL="$APP_URL" ADMIN_SEED_EMAIL="<admin-email>" ADMIN_SEED_PASSWORD="<admin-password>" pnpm db:seed
   ```

   `ADMIN_SEED_EMAIL` and `ADMIN_SEED_PASSWORD` are the exact variable names
   `prisma/seed.ts` reads (see `.env.example`); without them the script skips
   creating the admin user.

7. **Import the reference dataset.**

   ```bash
   pnpm db:check-translations
   DATABASE_URL="$APP_URL" pnpm db:import-references
   ```

   Flags are forwarded without a leading `--` (see
   `docs/modules/reference-data.md`). The import is rerunnable: if the tunnel
   drops mid-import, rerun the same command — each batch upserts by `pid`, so
   a completed batch is not corrupted by rerunning it. Expect roughly 140,228
   imported references and 2 out-of-range years reported as warnings. Running
   this over the tunnel is slower than the ~10 minutes it takes locally;
   each batch's transaction already carries a 120-second timeout for that
   reason (see `scripts/lib/reference-writes.ts`) — lower `--batch-size` if a
   single batch is timing out over the tunnel's added latency.

8. **Post-import checks.**

   ```bash
   psql "$APP_URL" -c 'SELECT count(*) FROM "FragranceRef";'
   psql "$APP_URL" -c 'SELECT count(*) FROM "Note";'
   psql "$APP_URL" -c 'SELECT count(*) FROM "Accord";'
   psql "$APP_URL" -c 'SELECT count(*) FROM "Perfumer";'
   psql "$APP_URL" -c "SELECT count(*) FROM \"Note\" WHERE \"nameEs\" = '';"
   psql "$APP_URL" -c '\di "FragranceRef_search_trgm_idx"'
   psql "$APP_URL" -c '\di "Brand_name_trgm_idx"'
   psql "$APP_URL" -c '\di "Note_family_idx"'
   ```

   `\di` without quotes lowercases an unquoted identifier before matching, so
   it reports these mixed-case index names as "not found" even though they
   exist — quote them, or query `pg_indexes` instead:
   `psql "$APP_URL" -c "SELECT indexname FROM pg_indexes WHERE indexname IN ('FragranceRef_search_trgm_idx', 'Brand_name_trgm_idx', 'Note_family_idx');"`.

   The empty-`nameEs` count must be zero — the translation gate in step 7
   refuses to write otherwise. All three indexes must exist; migrations
   create them, not the importer.

9. **Merge the feature branch into `main` and push.** Only now does the code
   reach `main`: `.github/workflows/deploy.yml` builds the image and POSTs
   the Dokploy webhook to deploy it (the `deploy` job fails if
   `DOKPLOY_WEBHOOK_URL`, `CF_ACCESS_CLIENT_ID`, or `CF_ACCESS_CLIENT_SECRET`
   is not configured).
   The new container's entrypoint runs `prisma migrate deploy` again, but it
   is now a no-op — step 5 already applied every migration in this branch to
   `$APP_URL`, so there is nothing pending. If auto-deploy is disabled or the
   webhook is not configured yet, deploy the built image manually in Dokploy.
   Start (or confirm) the application service is running before moving on.

10. **Verify.**

    - `GET /api/health` returns `200`.
    - Admin login works with the account seeded in step 6.
    - Searching "aventus creed" in the product form's reference search
      returns Creed Aventus first.
    - Adopting that reference and requesting its picture
      (`importReferencePicture`) shows the photo in the panel. Use a
      throwaway reference for this — step 11 deletes any bucket key that is
      not referenced by the database, so an adoption made here is safe, but
      **do not adopt more references for real use until after step 11**
      finishes, or their freshly uploaded images will look orphaned to that
      step's key comparison (they are not orphaned, just not accounted for
      yet — re-run step 11's listing if that happens).
    - The home page hero loads.
    - Requesting a `/_next/image?...` URL with header `Accept: image/avif`
      returns `content-type: image/avif` (confirmed working in production as
      of the v2 release). If it instead returns `image/webp` or a JPEG, open
      a finding in `docs/findings.md` describing the regression.

    If verification fails, go to step 12 (rollback) instead of continuing.

11. **Clean up R2 product images**, only after step 10 succeeds. The old
    catalog's images are still in the bucket, but rows referencing them are
    gone from the reset database, so deletion must be scoped to keys the new
    database does **not** reference — not to the whole `products/` prefix —
    because step 10's verification adoption (and any real adoption made after
    it) already wrote new keys there. Scope is still limited to the
    `products/` prefix (see `PRODUCT_STORAGE_PREFIX` in `src/lib/r2.ts`) —
    nothing else lives in the bucket.

    > Dev and prod use separate buckets (`parfam-mdq-imagenes-dev` and
    > `parfam-mdq-imagenes`; see "R2 bucket isolation" in
    > `docs/findings.md`), so the `referenced-keys.txt` query below only
    > needs `$APP_URL` — no dev-only key can appear as unreferenced here.

    ```bash
    export R2_BUCKET="<r2-bucket-name>"
    export R2_ACCOUNT_ID="<r2-account-id>"
    export AWS_ACCESS_KEY_ID="<r2-access-key-id>"
    export AWS_SECRET_ACCESS_KEY="<r2-secret-access-key>"

    # Keys the new database still references.
    psql "$APP_URL" -tA -c 'SELECT "storageKey" FROM "ProductImage";' \
      | sort -u > referenced-keys.txt

    # Keys actually in the bucket.
    aws s3api list-objects-v2 --bucket "$R2_BUCKET" --prefix "products/" \
      --endpoint-url "https://$R2_ACCOUNT_ID.r2.cloudflarestorage.com" \
      --query 'Contents[].Key' --output text | tr '\t' '\n' | sort -u \
      > bucket-keys.txt

    # Bucket keys with no referencing row: safe to delete.
    comm -23 bucket-keys.txt referenced-keys.txt > deletable-keys.txt
    wc -l deletable-keys.txt   # sanity-check the count before deleting anything
    ```

    Dry-run, reviewing the listed keys:

    ```bash
    xargs -a deletable-keys.txt -I{} echo aws s3 rm "s3://$R2_BUCKET/{}" \
      --endpoint-url "https://$R2_ACCOUNT_ID.r2.cloudflarestorage.com"
    ```

    Then rerun without the leading `echo` to delete them:

    ```bash
    xargs -a deletable-keys.txt -I{} aws s3 rm "s3://$R2_BUCKET/{}" \
      --endpoint-url "https://$R2_ACCOUNT_ID.r2.cloudflarestorage.com"
    ```

    `rclone` with an `s3`-type remote pointed at the same endpoint is an
    equivalent alternative if `aws s3`/`aws s3api` is not installed.

12. **Rollback**, if verification in step 10 fails:

    ```bash
    psql "$ADMIN_URL" -c 'DROP DATABASE "<appdb>" WITH (FORCE);'
    psql "$ADMIN_URL" -c 'CREATE DATABASE "<appdb>" OWNER "<appuser>";'
    pg_restore -d "$APP_URL" "parfam-<date>.dump"
    ```

    If step 3's optional R2 backup was taken, restore it too before letting
    the app serve traffic again:

    ```bash
    aws s3 sync ./r2-products-backup/ "s3://$R2_BUCKET/products/" \
      --endpoint-url "https://$R2_ACCOUNT_ID.r2.cloudflarestorage.com"
    ```

    Then revert the merge on `main` (or redeploy the previous image tag in
    Dokploy) so a subsequent push does not repeat the failed deploy.

### Local development reset

```bash
docker compose -f docker-compose.dev.yml down -v
pnpm db:up
pnpm db:deploy
pnpm db:seed
pnpm db:import-references --limit 1000   # --limit is optional; omit it for the full dataset
```

To reach a `pnpm dev` server running against this reset database from another
machine, open the same kind of SSH tunnel, but for the dev port:
`ssh -N -L 3100:localhost:3100 user@host`, then browse
`http://localhost:3100` — the dev server blocks non-localhost origins
otherwise (see AGENTS.md's "Commands" section).

## Release checks

Before shipping a repository change, run:

```bash
pnpm format
pnpm typecheck
pnpm lint
pnpm test
pnpm db:check-translations
pnpm build
```

`pnpm test` runs the integration tests (see "Integration tests (Vitest)"), so it
needs a migrated local database: `pnpm db:up && pnpm db:deploy`.

A build needs the public build-time values above and a generated Prisma client.
The CI workflow (`checks` job) runs `pnpm typecheck`, `pnpm lint`, and `pnpm
test`; it does not run `pnpm format`, `pnpm db:check-translations`, or `pnpm
build`, so it should not be treated as a substitute for the local checks
above.

## Local smoke check

`pnpm smoke` (`scripts/smoke.ts`) loads every store and admin page in real
headless Chromium over the Chrome DevTools Protocol, and fails on CSP
violations, console errors, uncaught exceptions, or an unexpected HTTP status.
It is optional, not part of the required checks above, and needs a running
production server plus the dev-only fixture catalog:

```bash
pnpm db:up && pnpm db:seed && pnpm db:seed:fixtures && pnpm build
pnpm start   # in another shell
pnpm smoke
```

Env vars: `SMOKE_BASE_URL` (default `http://localhost:3000`),
`SMOKE_ADMIN_EMAIL` / `SMOKE_ADMIN_PASSWORD` (default to `ADMIN_SEED_EMAIL` /
`ADMIN_SEED_PASSWORD`; admin routes are skipped with a warning if neither pair
is set), `CHROMIUM_PATH` (default `/usr/bin/chromium`), and `SMOKE_TIMEOUT_MS`
(overall run timeout, default `180000`).

## Integration tests (Vitest)

The repository has integration and E2E tests only; there are no unit tests (no
isolated function tests and no mocking of internal modules). `pnpm test` runs
`tests/integration/*.int.test.ts` with Vitest against a real, migrated
Postgres:

```bash
pnpm db:up && pnpm db:deploy
pnpm test
```

The tests run the reference importer and translation-check scripts as
subprocesses on the JSONL fixtures in `tests/integration/fixtures/` and read
back the resulting rows (including `src/lib/admin/references.ts`). Fixture rows
use `fixture-` slugs and pids from 990000000, and each file deletes them
afterwards. `tests/integration/setup.ts` loads `.env` and refuses a
`DATABASE_URL` whose host is not local. Code that needs a Next request context
(`headers()`, `unstable_cache`, `requireAdmin`) is covered by the E2E specs
instead. The CI `checks` job provides a `postgres:17-alpine` service and runs
`pnpm db:deploy` before the tests.

## E2E tests (Playwright)

`pnpm test:e2e` runs user-flow specs in Chromium: catalog (starting price and
sorting), product page ("Se parece a"), checkout and thank-you page, and admin
login, throttling and image upload. Specs live in `e2e/*.e2e.ts`; `testMatch`
in `playwright.config.ts` limits Playwright to that suffix, so Vitest ignores
them.

Prerequisites: a migrated and seeded database plus environment variables. The
fixture products' slugs and names that the specs, `pnpm smoke`, and
`prisma/seed-fixtures.ts` share live in `scripts/lib/fixture-catalog.ts`.

```bash
pnpm db:up && pnpm db:migrate && pnpm db:seed && pnpm db:seed:fixtures
pnpm test:e2e
```

- `DATABASE_URL`, `AUTH_SECRET`, and `ADMIN_SEED_EMAIL` / `ADMIN_SEED_PASSWORD`
  (used by `db:seed` and by the admin spec).
- `R2_*` placeholders: the webServer runs `next start` in production mode, where
  `src/lib/env.ts` requires every R2 variable. `playwright.config.ts` supplies
  placeholders for any that are unset, so no real credentials are needed.
- Fake services: Playwright first starts `e2e/fake-services.mjs` on
  `127.0.0.1:4599` (a fake fimgs.net plus an in-memory S3 path-style endpoint)
  and always sets `R2_ENDPOINT` and `REFERENCE_PICTURE_BASE_URL` to it for the
  app, so E2E never reaches real R2 or fimgs.net. Both variables are also read
  at `next build` time (the CSP), which the same webServer command performs.
- Chromium: set `CHROMIUM_PATH=/usr/bin/chromium` to use the system browser,
  otherwise run `pnpm exec playwright install chromium`.

The `webServer` runs `pnpm build && pnpm start` on port 3000 and, outside CI,
reuses a server that is already listening there. A `pnpm dev -p 3100` server is
not reused, so a local run without a server on port 3000 includes a full
production build.

The config sends a random `cf-connecting-ip` header on every request. Login and
checkout are rate limited in memory per client IP; without the header all
requests share one bucket and the specs would throttle each other.

The checkout specs create real `Order` rows and leave them in the database. That
is fine for CI and local dev databases; never run them against a real one. The
admin spec is skipped when `ADMIN_SEED_EMAIL` / `ADMIN_SEED_PASSWORD` are unset.

In CI, the `e2e` job in `ci.yml` runs only on pull requests (not when
`deploy.yml` reuses the workflow). It starts a throwaway Postgres service,
applies `db:deploy`, `db:seed`, and `db:seed:fixtures`, then runs
`pnpm test:e2e` with fixed placeholder env values, and uploads
`playwright-report/` on failure.

Relation to `pnpm smoke`: smoke visits every page looking for CSP violations
and console errors; E2E exercises user flows. Neither replaces the other.
