# Persistence

Prisma schema source: `prisma/schema.prisma`. PostgreSQL is accessed through
`src/lib/db.ts` with the Prisma PostgreSQL driver adapter.

## Main models

| Model                                       | Purpose                                                                                                                                        |
| ------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------- |
| `User`                                      | Administrator credentials.                                                                                                                     |
| `SiteSetting`                               | Singleton store identity, contact, and WhatsApp template.                                                                                      |
| `Brand`, `Perfumer`                         | Shared product vocabulary.                                                                                                                     |
| `Note`                                      | Olfactory note; `family` groups display names under the dataset's family slug, `nameEs` is required.                                           |
| `Accord`                                    | Olfactory accord; `nameEs` and `color` come from `prisma/reference/accords.es.json`.                                                           |
| `FragranceRef` and related reference models | Read-only reference catalog imported from a third-party dataset; panel-only, never queried by the store. See `docs/modules/reference-data.md`. |
| `Product`                                   | Store product with publication status and optional reference link.                                                                             |
| `ProductVariant`                            | Sellable bottle or decant and its ARS price (legacy `TESTER` rows may remain; the store hides them).                                           |
| `ProductImage`                              | R2 storage key and display order.                                                                                                              |
| `Order`, `OrderItem`                        | Checkout record and immutable commercial snapshot.                                                                                             |

## Reference catalog fields

`FragranceRef` (unique on `pid`, the dataset record id; `slug` is the
dataset's own "Brand/Name" slug and is **not** unique) carries: `year`,
`gender`, `collection`, `descriptionEn` (panel-only), `longevity` and
`sillage` (`Decimal(3,2)`, `null` when nobody has voted),
`seasonSpringVotes`/`seasonSummerVotes`/`seasonFallVotes`/`seasonWinterVotes`
and `daypartDayVotes`/`daypartNightVotes` (each group `null` together when
unset), `communityVotes` and `popularity` (both internal-only), `scrapedAt`,
and the denormalized `searchText` used by admin search. `FragranceRefNote`
adds `position` (nullable, for a flat note list) and `weight` (0..100) on top
of the note relation; `FragranceRefAccord` adds `strength` (0..100) and
`sortOrder` on top of the accord relation.

`Product` mirrors the fields an administrator can copy from an adopted
reference: `collection`, `longevity`/`sillage` (`Decimal(3,2)`),
`seasonSpring`/`seasonSummer`/`seasonFall`/`seasonWinter` and
`daypartDay`/`daypartNight` (0..100 percentages, not vote counts), and
`communityVotes` (copied server-side at save time, never client-submitted).
`ProductNote` and `ProductAccord` likewise carry `weight` and `strength`.
The former `Occasion` and `Season` enums and the `Product.occasions`/
`Product.seasons` columns they backed are gone; season data is now the
percentage columns above.

## Price and order invariants

ARS amounts use `Decimal` columns. A browser-submitted amount is informational
only; checkout reads `ProductVariant.priceArs` again and calculates totals
with `Prisma.Decimal`.

`OrderItem` stores product name, variant label, unit price, and quantity in
addition to nullable product and variant relations. Deleting catalog records
therefore cannot rewrite order history. These relations use `SetNull`.

The PostgreSQL `Order_number_seq` sequence generates order numbers. Gaps after
a rolled-back transaction are acceptable and preserve concurrency safety.

## Publication and relationships

Public store queries include only `PUBLISHED` products and their active
variants. Listings (catalog, similar products, sitemap) also require at least
one active variant; the product page (`getProductBySlug`) does not.
Product notes, accords, perfumers, variants, and images are validated against
the product action's input before they are synchronized. Variants are diffed
rather than wholesale deleted because order items can reference them.

## Migrations and seeds

The migration history starts with `20260921225316_initial_schema`. This single
English baseline creates the current Prisma models and the PostgreSQL objects
that Prisma cannot express: the `pg_trgm` and `unaccent` extensions,
`parfam_normalize`, specialized search indexes, and `Order_number_seq`.
It applies only to a fresh database.

`20260925201541_reference_dataset_v2` replaced the reference catalog's
importer and dropped columns the previous importer produced that the current
dataset either lacks or scopes differently: `FragranceRef.url`, a
pyramid-presence flag, an origin-country column, a rating average and its
vote count, and `FragranceRefAccord`'s old rank column — plus the
`Occasion`/`Season` enums (with `Product.occasions`/`.seasons`). It added
`FragranceRef.slug` (required,
not unique), the vote-count and popularity columns described above,
`FragranceRefAccord.strength`/`.sortOrder`, `FragranceRefNote.weight`,
`Note.family` (required), and made `Note.nameEs` required. It also dropped
`Note_untranslated_idx` — a partial index over untranslated notes that has
nothing left to match now that `nameEs` is required — and added
`Note_family_idx` to back the store's note-family filter. The
`FragranceRef_search_trgm_idx` and `Brand_name_trgm_idx` GIN trigram indexes
from the initial migration are unaffected and still back admin search (see
`docs/modules/reference-data.md`).

`20260927120000_product_name_trgm_index` adds `Product_name_trgm_idx`, a GIN
trigram index on `parfam_normalize("name")`, mirroring `Brand_name_trgm_idx`
from the initial migration. It backs the accent-insensitive store search in
`listCatalog` (`src/lib/store/catalog-listing.ts`), which matches product and brand
names through `parfam_normalize` in a raw query rather than Prisma's
`contains`, since Prisma cannot call a SQL function.

Once applied, treat every migration as a historical artifact: never edit it,
including its comments. Create a new migration for later schema changes.

For the disposable local database, `pnpm db:down` alone retains the Docker
volume and therefore retains the old tables. Recreate it before applying this
baseline:

```bash
docker compose -f docker-compose.dev.yml down --volumes
pnpm db:up
pnpm db:migrate
pnpm db:seed
```

`prisma/seed.ts` creates the administrator and singleton settings row. Example
products are created by adopting reference catalog entries from the panel
(see `docs/modules/reference-data.md`), not by a seed script. For local smoke
checks, `pnpm db:seed:fixtures` (`prisma/seed-fixtures.ts`) additionally
upserts a small `fixture-`-prefixed catalog (slugs and names in
`scripts/lib/fixture-catalog.ts`; the women's and men's products also carry a
description, concentration, accords, and top/heart/base notes, and one
unadopted `FragranceRef` with pid 999000001 supports reference-search specs);
it refuses to run outside a local
database.

`Brand.country` is editable from `/admin/marcas` (inline row form, `brandSchema`); the slug stays immutable.
