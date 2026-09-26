<!-- BEGIN:nextjs-agent-rules -->

# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->

# Parfam MDQ

Perfume store for Mar del Plata (bottles, testers, and decants), with a
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

## Non-negotiable rules

- **Use Prisma `Decimal` for ARS prices; never `float`.** Prices cross to the
  client as `string` because `Decimal` is not Client Component serializable;
  persisted calculations use `Prisma.Decimal`.
- **The database is always the price source.** Each writing Server Action
  rereads `ProductVariant.priceArs` and ignores the client supplied price.
- **Orders keep name, variant, and price snapshots in `OrderItem`.** A price
  change or product deletion cannot alter an existing order: FKs are optional
  and use `onDelete: SetNull`.
- **The store exposes only `PUBLISHED` products with `isActive` variants.**
  This belongs in the query, not the component; a known draft slug returns 404.
- **Every panel Server Action begins with `requireAdmin()`.** A Server Action is
  a public POST endpoint. The `/admin` layout protects rendering, not data;
  `src/proxy.ts` only performs an optimistic redirect.
- **Verify all client input**: note, accord, and perfumer IDs; R2 keys
  (`isProductStorageKey`); `variantId`; and an upload `contentType`.

## Conventions

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

## Data

`new-database/perfumes.jsonl` (140,228 reference-fragrance records, ~556 MB,
gitignored, local only) is the reference dataset; see
`docs/modules/reference-data.md` for its shape and the import workflow. It is
imported from the developer machine —
production is reached through an SSH tunnel to the Dokploy PostgreSQL — with
`pnpm db:import-references`. Every note display name (2,581) and accord (92,
with a `#RRGGBB` color) is translated in `prisma/reference/notes.es.json` and
`prisma/reference/accords.es.json`; `pnpm db:check-translations` verifies
coverage, and the importer refuses to write if any translation is missing.

The Fragrantica reference description is in English and **never public**; it
is internal panel reference material. A reference picture may be published,
but only as a single copy: when an administrator adopts a reference, the
server downloads it from fimgs.net into R2 (`importReferencePicture` in
`src/app/admin/(panel)/productos/image-actions.ts`). The store never
hotlinks fimgs.net, and images are never bulk-downloaded. Public store copy
is written in Spanish by an administrator and does not name Fragrantica.

Applied migrations are historical artifacts: **do not edit them**, including
their comments. Create a new migration for a schema change.

## Commands

```bash
pnpm dev          # development server
pnpm build        # production build (prisma generate + next build)
pnpm typecheck    # tsc --noEmit
pnpm lint         # eslint
pnpm format       # prettier --write
pnpm db:up        # local PostgreSQL (Docker Compose, port 5433)
pnpm db:down
pnpm db:migrate   # prisma migrate dev
pnpm db:seed      # admin user + singleton SiteSetting row
pnpm db:import-references    # reference catalog (script: scripts/import-references.ts;
                              # accepts file PATH, limit N, batch-size N, translations-dir DIR —
                              # pnpm forwards `--` literally here, so pass flags without it)
pnpm db:check-translations    # verifies note/accord translation coverage
```

To reach `pnpm dev` from another machine, open an SSH tunnel
(`ssh -N -L 3100:localhost:3100 user@host`) and browse `http://localhost:3100`;
the dev server blocks non-localhost origins otherwise.

## Before declaring work complete

`pnpm typecheck`, `pnpm lint`, and `pnpm test` (Vitest) must pass cleanly. The
current test coverage covers reference record parsing, translation files,
importer helpers, reference percentages, image type detection, R2 key
validation, similar-products scoring, and checkout validation. Playwright
and other end-to-end tooling are not installed. CI builds and publishes but does
not run these checks.
