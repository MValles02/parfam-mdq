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
    store/                   public queries (re-exported by queries.ts), catalog
                             filters, store links, cart validation
    validations/             shared Zod schemas
    cart.ts                  persisted client cart
    catalog.ts               enum labels, variant labels, ARS formatting
    r2.ts                    Cloudflare R2 integration
    settings.ts              cached site settings
    seo.ts                   metadata and JSON-LD helpers
    site.ts                  brand defaults, locale, settings row id
  proxy.ts                   optimistic admin navigation guard
prisma/
  schema.prisma              data model
  migrations/                immutable migration history
  reference/                 note and accord translation dictionaries
scripts/
  import-references.ts       reference importer
  check-reference-translations.ts  translation coverage report
  smoke.ts                   headless CSP and console smoke check
  lib/                       pure helpers and DB writes for the scripts, and
                             the fixture catalog shared with seeds and E2E
docs/                         technical documentation
```

## Route code

Public routes are inside the internal `(store)` group, with Spanish URL
folders retained as public contracts: `carrito`, `producto`,
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
