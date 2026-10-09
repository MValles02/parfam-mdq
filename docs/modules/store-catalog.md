# Module: public store catalog

## Responsibility

Query and render publicly sellable products, catalog filters, product detail, and "Si te gusta, probá también" similar products.

## API

- listCatalog(filters)
- getFilterOptions()
- getProductBySlug(slug)
- getSimilarProducts(productId)
- getSitemapUrls()

## Files

| File                                                 | Responsibility                                                         |
| ---------------------------------------------------- | ---------------------------------------------------------------------- |
| src/lib/store/queries.ts                             | Prisma queries and serialized DTOs                                     |
| src/lib/store/filters.ts                             | URL parser and serialization adapter                                   |
| src/lib/store/catalog-sort.ts                        | Catalog sort comparator (featured, newest, price, name)                |
| src/lib/store/similarity.ts                          | Pure "Si te gusta, probá también" scoring                              |
| src/components/store/catalog/                        | Catalog controls and grid                                              |
| src/components/store/catalog/active-filter-chips.tsx | Removable chips for applied filters                                    |
| src/components/store/catalog/search.tsx              | `CatalogSearch` (URL-driven) and header `StoreSearch`                  |
| src/lib/store/catalog-shortcuts.ts                   | Gender, presentation and "Novedades" shortcut links (client-safe)      |
| src/components/store/home/                           | Home sections: `CatalogShortcuts`, `PresentationChoices`, `HowItWorks` |
| src/components/store/product/                        | Product detail UI                                                      |
| src/app/(store)/                                     | Public routes                                                          |

## Rules

Queries always filter to PUBLISHED products with at least one active variant. Decimal prices are converted to strings before Client Components. Spanish public paths, filter keys and values, and customer-facing labels remain stable while internal filter types and query objects use English. Below 20 `communityVotes`, `getProductBySlug` hides longevity, sillage, and season/daypart percentages as too noisy to publish; a manually created product (`communityVotes === null`) always shows its data.
