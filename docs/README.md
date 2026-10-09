# Parfam MDQ technical documentation

Parfam MDQ is an `es-AR` perfume store for Mar del Plata. Customers browse the
catalog and send an order through WhatsApp; checkout does not take payments. It
stores the order, assigns a sequential number such as `PM-0042`, and creates a
pre-filled `wa.me` link. Payment and delivery are agreed in chat.

The application has three data layers:

| Layer      | Contents                          | Writer                         | Publicly visible |
| ---------- | --------------------------------- | ------------------------------ | ---------------- |
| Reference  | Fragrance reference dataset       | `scripts/import-references.ts` | No               |
| Store      | Products, variants, images, notes | Admin panel                    | Yes              |
| Operations | Orders, settings, administrator   | Checkout and admin panel       | Partly           |

Reference descriptions and images are panel-only. Customer copy is Spanish
and product photos are stored in Cloudflare R2.

## Stack

Next.js 16 App Router · React 19 · TypeScript · Tailwind v4 · shadcn/ui ·
Prisma 7/PostgreSQL · Auth.js v5 · Zod · React Hook Form · nuqs · Zustand ·
Cloudflare R2. The repository is a single application, not a monorepo.

## Documentation map

| Document                                     | Use it to                                                  |
| -------------------------------------------- | ---------------------------------------------------------- |
| [architecture.md](architecture.md)           | Understand module boundaries and dependencies.             |
| [project-structure.md](project-structure.md) | Locate code by responsibility.                             |
| [routes.md](routes.md)                       | Find routes, layouts, and URL contracts.                   |
| [api.md](api.md)                             | Inspect Server Actions and Route Handlers.                 |
| [authentication.md](authentication.md)       | Understand login, session, and authorization.              |
| [data-flow.md](data-flow.md)                 | Follow data, caching, and revalidation.                    |
| [persistence.md](persistence.md)             | Understand tables, relationships, and migrations.          |
| [integrations.md](integrations.md)           | Configure R2, WhatsApp, analytics, and environment values. |
| [deployment.md](deployment.md)               | Build and deploy the application.                          |
| [WORKFLOW.md](WORKFLOW.md)                   | Branching, commits, pull requests, and the CI gate.        |
| [user-flows.md](user-flows.md)               | Browse end-to-end flows.                                   |
| [findings.md](findings.md)                   | Review known risks and resolved findings.                  |

## Where to change common behavior

| Change                              | Primary location                                                                                     |
| ----------------------------------- | ---------------------------------------------------------------------------------------------------- |
| Catalog query or filter             | `src/lib/store/{filters,catalog-listing}.ts`                                                         |
| Cart state                          | `src/lib/cart.ts`                                                                                    |
| Checkout validation and persistence | `src/app/(store)/checkout/actions.ts`                                                                |
| WhatsApp order message              | `src/lib/store/order-message.ts`                                                                     |
| Product editing and publication     | `src/lib/validations/product.ts`, `src/app/admin/(panel)/productos/{actions,product-persistence}.ts` |
| Public product visibility           | `src/lib/store/visibility.ts`                                                                        |
| Product image upload                | `src/lib/r2.ts`, `productos/image-actions.ts`                                                        |
| Admin orders                        | `src/lib/admin/orders.ts`, `pedidos/actions.ts`                                                      |
| Site settings                       | `src/lib/settings.ts`, `configuracion/actions.ts`                                                    |
| Metadata and sitemap                | `src/lib/seo.ts`, `src/app/{sitemap,robots}.ts`                                                      |

## Invariants

- ARS prices use Prisma `Decimal`, cross to Client Components as strings, and
  are always reread from `ProductVariant.priceArs` before an order is stored.
- `OrderItem` snapshots product name, variant label, and unit price. Product
  deletion uses nullable foreign keys with `SetNull`.
- Public queries select only `PUBLISHED` products with active variants.
- Every admin Server Action starts with `requireAdmin()`.
- Client-provided relationship IDs, R2 keys, upload MIME types, and variant IDs
  are verified on the server.
- Spanish public routes and URL query keys are compatibility contracts. The
  application maps them to English internal models.

## Commands

```bash
pnpm dev
pnpm build
pnpm typecheck
pnpm lint
pnpm test   # integration tests; needs a migrated DB (pnpm db:up && pnpm db:deploy)
pnpm test:e2e
pnpm format
pnpm db:up
pnpm db:migrate
pnpm db:seed
pnpm db:import-references --limit 100
pnpm db:check-translations
```

When documentation conflicts with the code, the code is authoritative. Update
the document as part of the same change.
