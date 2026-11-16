<!-- BEGIN:nextjs-agent-rules -->

# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->

# Parfam MDQ

Perfume store for Mar del Plata (bottles and decants), with a
WhatsApp checkout and an administration panel. It **does not charge**: checkout
persists the order, assigns a sequential number (`PM-0042`), and returns a
prewritten `wa.me` link. Payment and delivery are arranged in chat.

This is one Next.js application, not a monorepo. One process serves the store
and the panel, backed by PostgreSQL and a Cloudflare R2 bucket.

## Documentation

`docs/` is the technical map of the system and is maintained against the code.
Start with [`docs/README.md`](docs/README.md), which contains the index and a
"where to change X" table.

| Need                                       | Read                     |
| ------------------------------------------ | ------------------------ |
| Understand layers, modules, and boundaries | `docs/architecture.md`   |
| Find a route or its file                   | `docs/routes.md`         |
| Server Actions and endpoints               | `docs/api.md`            |
| Follow an end-to-end use case              | `docs/flows/`            |
| Understand a domain in depth               | `docs/modules/`          |
| Data model, indexes, and migrations        | `docs/persistence.md`    |
| Login, session, guards, and permissions    | `docs/authentication.md` |
| Caches, revalidation, and state            | `docs/data-flow.md`      |
| R2, WhatsApp, and environment variables    | `docs/integrations.md`   |
| Docker, CI, and runtime migrations         | `docs/deployment.md`     |
| Known debt and open risks                  | `docs/findings.md`       |

If `docs/` contradicts the code, **the code wins**. Correcting the document is
part of the change.

## Stack

Next.js 16 (App Router, Server Actions) · React 19 · TypeScript ·
Tailwind v4 · shadcn/ui (preset `radix-nova`, Lucide icons) ·
Prisma 7 + PostgreSQL · Auth.js v5 (JWT, provider Credentials + argon2) ·
`nuqs` (URL state) · `zustand` (cart) · `zod` (validation) ·
`react-hook-form` · Cloudflare R2.
Deploy: Docker multi-stage → GHCR → Dokploy.

## Rules

### Non-negotiable

- **Use Prisma `Decimal` for ARS prices; never `float`.** Prices cross to the
  client as `string` because `Decimal` is not Client Component serializable;
  persisted calculations use `Prisma.Decimal`.
- **The database is always the price source.** Each writing Server Action
  rereads `ProductVariant.priceArs` and ignores the client supplied price.
- **Orders keep name, variant, and price snapshots in `OrderItem`.** A price
  change or product deletion cannot alter an existing order: FKs are optional
  and use `onDelete: SetNull`.
- **The store exposes only `PUBLISHED` products and only their `isActive`
  variants.** This belongs in the query, not the component; a known draft slug
  returns 404. Catalog, similar-product, and sitemap queries also require at
  least one active variant; the product page does not, and offers a WhatsApp
  inquiry when none is purchasable.
- **Every panel Server Action begins with `requireAdmin()`.** A Server Action is
  a public POST endpoint. The `/admin` layout protects rendering, not data;
  `src/proxy.ts` only performs an optimistic redirect.
- **Verify all client input**: note, accord, and perfumer IDs; R2 keys
  (`isProductStorageKey`); `variantId`; and an upload `contentType`.

### Conventions

- **Use existing libraries.** Before writing a component or utility, check
  shadcn/ui and the selected ecosystem in `docs/architecture.md`.
- **Use English for code, identifiers, comments, commits, and developer docs.**
  Keep user-facing UI in Spanish (`es-AR`, including voseo and accents).
- **Write self-contained comments.** Explain why a decision exists without
  relying on an external document or project-specific vocabulary. References
  must point to a file that exists in this repository.
- **Keep filter state in the URL** with `nuqs`, not local state. Define parsers
  once and share them between Server Components and controls.
- **Keep queries outside routes.** Pages orchestrate; public queries live in
  `src/lib/store/`, panel queries in `src/lib/admin/`. Shared code belongs in
  `src/lib/`.
- **Client Components cannot import modules that bring Prisma.** Pass data or
  labels as props.
- **Use the same validation schema on both sides** (`src/lib/validations/`):
  the client provides feedback and the server is the actual boundary.
- **Branch, commit and merge through PRs.** Feature branches (`feat/`, `fix/`,
  `chore/`, `docs/`, `ci/`), Conventional Commits, squash merge into `develop`;
  `develop` is promoted to `main` by a PR with a merge commit (never squash);
  see `docs/WORKFLOW.md`.

## Data

Reference dataset (`new-database/perfumes.jsonl`, gitignored, ~556 MB): never read it directly; see
`docs/modules/reference-data.md`. Note/accord translations live in `prisma/reference/*.es.json`;
`pnpm db:check-translations` must pass before any import.

The Fragrantica description is internal-only and never public. A reference picture is copied once into R2
when an admin adopts it (`importReferencePicture` in `src/app/admin/(panel)/productos/image-actions.ts`);
never hotlink or bulk-download fimgs.net. Public copy is admin-written Spanish and never names Fragrantica.

Applied migrations are historical: never edit them; create a new migration.
Migrations run at container start (`docker-entrypoint.sh`, advisory lock) and
deploys are start-first, so old and new containers overlap on the same DB: every
migration must be backward compatible with the previous release (expand/contract;
drops and renames go in a later release).

## Commands

```bash
pnpm dev | build | typecheck | lint | test | test:e2e | format
pnpm test:e2e:setup         # db:seed + db:seed:fixtures, run before test:e2e
pnpm ci:env checks|e2e      # placeholder env for CI jobs (scripts/ci-env.mjs)
pnpm db:up | db:down | db:migrate | db:seed | db:seed:fixtures
pnpm db:import-references   # flags without `--`; see docs/modules/reference-data.md
pnpm db:check-translations
pnpm smoke                  # optional, against `pnpm start`; see docs/deployment.md
```

Git hooks (husky): pre-commit runs `lint-staged` and a gitleaks scan of the staged diff (`git diff --cached` piped into the digest-pinned image via stdin, so it also works in git worktrees; skipped with a warning if `docker` is missing).
`.gitattributes` (`* text=auto eol=lf`) forces LF everywhere, so scripts copied into the image or run as hooks keep working when checked out on Windows and `prettier --check` sees the same bytes on every OS.
The CI workflows, PR templates, dependabot, hooks and `docs/WORKFLOW.md` are copied byte-for-byte from the infra repo (`standards/apps/`); change them there, not here. `.prettierignore` lists them so formatting never alters them.

Remote dev: `pnpm dev` binds to loopback only (`-H 127.0.0.1`); start it with `pnpm dev -p 3100`, then `ssh -N -L 3100:localhost:3100 mateo@<tailscale-ip>` and open `http://localhost:3100`.

## Before declaring work complete

`pnpm lint` (`prettier --check .` + eslint), `pnpm typecheck`, `pnpm build`, `pnpm test` must pass (CI requires them).
Tests are integration and E2E only; never write unit tests (no isolated
function tests, no mocking of internal modules). `pnpm test` runs the Vitest
integration tests in `tests/integration/*.int.test.ts` against a real, migrated
local Postgres (`pnpm db:up && pnpm db:deploy`); they refuse a non-local
`DATABASE_URL`. Playwright E2E (`pnpm test:e2e`, needs a seeded DB; see `docs/deployment.md`)
runs in CI on pull requests; run it locally when a change touches the store,
checkout, or admin flows. E2E covers money, data, auth and access-isolation
flows only. No layout/pixel/viewport, animation, touch-target, colour or copy
tests; one representative test per error class; no duplicated assertions across
specs; no `waitForTimeout` or `networkidle`. Before adding a test, check it is
not already covered. Keep CI E2E under ~5 min.
