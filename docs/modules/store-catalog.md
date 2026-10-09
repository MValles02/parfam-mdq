# Module: public store catalog

## Responsibility

Query and render publicly sellable products, catalog filters, product detail, "Si te gusta, probá también" similar products,
and the store's content pages (`/como-comprar`, `/contacto`, `/presentaciones`, `/concentraciones`).

## API

`src/lib/store/queries.ts` is the stable import path; it re-exports each query from the file that owns it.

- listCatalog(filters), getFilterOptions(), PRODUCTS_PER_PAGE
- getProductBySlug(slug)
- getSimilarProducts(productId), TAG_SIMILAR_PRODUCTS
- getSitemapUrls(), TAG_SITEMAP_URLS

## Files

| File                                  | Responsibility                                                  |
| ------------------------------------- | --------------------------------------------------------------- |
| src/lib/store/queries.ts              | Public entry point that re-exports the store queries            |
| src/lib/store/visibility.ts           | `PUBLIC_PRODUCT_WHERE` / `ACTIVE_VARIANT_WHERE` visibility rule |
| src/lib/store/catalog-listing.ts      | Filtered, sorted, paginated catalog and filter options          |
| src/lib/store/product-card.ts         | Card select and row-to-card mapping (catalog, "Si te gusta, probá también")    |
| src/lib/store/product-detail.ts       | Product detail query and DTO                                    |
| src/lib/store/similar-products.ts     | Cached "Se parece a" ranking and its cards                      |
| src/lib/store/sitemap-urls.ts         | Sitemap entries                                                 |
| src/lib/store/display-names.ts        | Name capitalization and image alt fallback for the DTOs         |
| src/lib/store/filters.ts              | URL parser and serialization adapter                            |
| src/lib/store/catalog-sort.ts         | Pure catalog sort comparator                                    |
| src/lib/store/similarity.ts           | Pure "Se parece a" scoring                                      |
| src/lib/store/links.ts                | Catalog, brand-filtered catalog, and product URLs               |
| src/components/store/catalog/         | Catalog controls and grid                                       |
| src/components/store/product/         | Product detail UI                                               |
| src/components/store/content-page.tsx | Shared layout and breadcrumb of the single-column pages         |
| src/components/store/json-ld.tsx      | Structured-data `<script>`                                      |
| src/components/store/navigation.ts    | Header and footer content-page links                            |
| src/app/(store)/                      | Public routes                                                   |
| src/lib/store/catalog-shortcuts.ts    | Gender, presentation and "Novedades" shortcut links (client-safe) |
| src/components/store/catalog/active-filter-chips.tsx | Removable chips for applied filters |
| src/components/store/catalog/search.tsx | `CatalogSearch` (URL-driven) and header `StoreSearch` |
| src/components/store/home/ | Home sections: `CatalogShortcuts`, `PresentationChoices`, `HowItWorks` |

## Rules

The catalog, similar-product, and sitemap queries filter to PUBLISHED products with at least one active variant,
through `PUBLIC_PRODUCT_WHERE`. Two queries require only PUBLISHED: `getFilterOptions` (brands, accords, and notes
with a published product) and `getProductBySlug`, so a published product whose variants are all inactive still has
a detail page, with no variants, where the purchase block offers a WhatsApp inquiry instead of the cart. Decimal prices are converted to strings before Client Components. Spanish public paths, filter keys and
values, and customer-facing labels remain stable while internal filter types and query objects use English. Below 20
`communityVotes`, `getProductBySlug` hides longevity, sillage, and season/daypart percentages as too noisy to
publish; a manually created product (`communityVotes === null`) always shows its data.

`src/lib/store/queries.test.ts` pins the query arguments (visibility, filters, selects, ordering) and DTO mapping
with a mocked Prisma client; change it together with any intended query change.
