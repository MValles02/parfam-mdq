# Parfam MDQ

Online perfume store for Mar del Plata (bottles and decants) with an
administration panel. Checkout does not charge: it saves the order and hands the
customer a prewritten WhatsApp link, where payment and delivery are arranged.

One Next.js application backed by PostgreSQL and a Cloudflare R2 bucket. The
technical documentation lives in [`docs/`](docs/README.md); agent and coding
rules are in [`AGENTS.md`](AGENTS.md).

## Development setup

Requirements: Node 24+, pnpm (the version pinned in `package.json`, via
`corepack enable`), and Docker Desktop for the local database.

```bash
pnpm install
cp .env.example .env    # then fill in the values
pnpm db:up              # PostgreSQL in Docker (docker-compose.dev.yml)
pnpm db:deploy          # apply migrations
pnpm db:seed            # optional: pnpm db:seed:fixtures for sample data
pnpm dev
```

## Scripts

| Script                               | Purpose                                       |
| ------------------------------------ | --------------------------------------------- |
| `pnpm dev` / `build` / `start`       | Run, build, and serve the app                 |
| `pnpm typecheck` / `lint` / `format` | Static checks and formatting                  |
| `pnpm test`                          | Integration tests (needs a migrated local DB) |
| `pnpm test:e2e`                      | Playwright E2E tests (needs a seeded DB)      |
| `pnpm db:up` / `db:down`             | Start/stop the local PostgreSQL container     |
| `pnpm db:migrate` / `db:deploy`      | Create a migration / apply pending migrations |
| `pnpm db:seed` / `db:seed:fixtures`  | Seed base data / sample fixtures              |
| `pnpm smoke`                         | Smoke test against `pnpm start`               |

## Branching and deploys

- Feature branches (`feat/`, `fix/`, `chore/`, `docs/`, `ci/`) merge into
  `develop` with a **squash** merge.
- `develop` is promoted to `main` through a PR with a **merge commit**.
- CI builds a Docker image, publishes it to GHCR, and triggers the Dokploy
  webhook: `develop` deploys the development environment, `main` deploys
  production. Migrations run at container start.

See [`docs/WORKFLOW.md`](docs/WORKFLOW.md) for the full workflow and
[`docs/deployment.md`](docs/deployment.md) for the pipeline.
