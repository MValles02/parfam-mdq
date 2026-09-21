# Persistence

Prisma schema source: `prisma/schema.prisma`. PostgreSQL is accessed through
`src/lib/db.ts` with the Prisma PostgreSQL driver adapter.

## Main models

| Model                                       | Purpose                                                            |
| ------------------------------------------- | ------------------------------------------------------------------ |
| `User`                                      | Administrator credentials.                                         |
| `SiteSetting`                               | Singleton store identity, contact, and WhatsApp template.          |
| `Brand`, `Note`, `Accord`, `Perfumer`       | Product vocabulary and translations.                               |
| `FragranceRef` and related reference models | Private Fragrantica import data.                                   |
| `Product`                                   | Store product with publication status and optional reference link. |
| `ProductVariant`                            | Sellable bottle, tester, or decant and its ARS price.              |
| `ProductImage`                              | R2 storage key and display order.                                  |
| `Order`, `OrderItem`                        | Checkout record and immutable commercial snapshot.                 |

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

Public store queries include only `PUBLISHED` products with active variants.
Product notes, accords, perfumers, variants, and images are validated against
the product action's input before they are synchronized. Variants are diffed
rather than wholesale deleted because order items can reference them.

## Migrations and seeds

Applied migrations are historical artifacts: never edit them, including their
comments. Create a new migration for a schema change. `prisma/seed.ts` creates
the administrator and singleton settings row. `scripts/seed-dev.ts` provides
development data and requires configured R2 access.
