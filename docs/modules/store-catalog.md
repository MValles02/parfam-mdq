# Module: public store catalog

## Responsibility

Query and render publicly sellable products, catalog filters, product detail, brand pages, and related products.

## API

- listCatalog(filters)
- getFilterOptions()
- getProductBySlug(slug)
- getRelatedProducts(product)
- getBrandBySlug(slug)
- getSitemapUrls()

## Files

| File                          | Responsibility                       |
| ----------------------------- | ------------------------------------ |
| src/lib/store/queries.ts      | Prisma queries and serialized DTOs   |
| src/lib/store/filters.ts      | URL parser and serialization adapter |
| src/components/store/catalog/ | Catalog controls and grid            |
| src/components/store/product/ | Product detail UI                    |
| src/app/(store)/              | Public routes                        |

## Rules

Queries always filter to PUBLISHED products with at least one active variant. Decimal prices are converted to strings before Client Components. Spanish public paths, filter keys and values, and customer-facing labels remain stable while internal filter types and query objects use English.
