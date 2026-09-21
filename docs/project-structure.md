# Project structure

```text
src/
  app/
    (store)/                 public store route group
    admin/                   login and administrative panel
    api/                     health and Auth.js handlers
  components/
    admin/                   shared panel controls
    store/                   public store components
    ui/                      shadcn components
  lib/
    admin/                   server-side panel queries and helpers
    store/                   public queries, catalog filters, cart validation
    validations/             shared Zod schemas
    cart.ts                  persisted client cart
    r2.ts                    Cloudflare R2 integration
    settings.ts              cached site settings
    seo.ts                   metadata and JSON-LD helpers
  proxy.ts                   optimistic admin navigation guard
prisma/
  schema.prisma              data model
  migrations/                immutable migration history
scripts/
  import-fragrantica.ts      reference importer
  seed-dev.ts                development catalog seed
data/
  fragrantica/               reference CSV input
  dictionaries/              Spanish translation dictionaries
docs/                         technical documentation
```

## Route code

Public routes are inside the internal `(store)` group, with Spanish URL
folders retained as public contracts: `catalogo`, `carrito`, `producto`,
`marca`, and `pedido`. Product management routes likewise retain Spanish
public panel paths under `/admin`.

## Component ownership

Store components live in `src/components/store/`, grouped into cart, catalog,
and product concerns. Reusable panel controls live in `src/components/admin/`.
Feature-specific panel components are colocated in their route's
`_components/` directory. `src/components/ui/` contains generated/adapted
shadcn primitives.

## Library ownership

`src/lib/store/` cannot import `src/lib/admin/`, and the reverse is also
forbidden. Shared domain utilities such as currency formatting, slugs, WhatsApp
links, settings, and validation helpers stay above those directories. This
prevents the public store from acquiring admin-only queries or Prisma-heavy
dependencies in a Client Component.
