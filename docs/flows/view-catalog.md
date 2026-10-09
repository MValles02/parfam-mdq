# Flow: browse the catalog

## Purpose

Render a searchable, filterable public catalog for Argentine customers while
keeping the URL contract stable and querying only sellable products.

## Entry points

The home page (`/`) has two views, chosen by `isCatalogView(filters)`: the home
view (no filter, page 1, default sort) shows the hero and `CatalogSection`
with an h2 "Catálogo"; the catalog view (any filter, `pagina` > 1, or a
non-default sort) shows only `CatalogSection` with an h1 "Fragancias". Filter
changes scroll to the top, where the catalog view starts. Brand links open the home
catalog filtered with `/?marca=<slug>#catalogo`. The product route remains
`/producto/[slug]`.

## Flow

1. The page parses the browser URL through `loadCatalogFilters()` and maps
   preserved Spanish query keys to the internal English `CatalogFilters`.
2. `listCatalog` filters by search and the other criteria in
   PostgreSQL, then sorts in JavaScript (`compareCatalogRows` in
   `src/lib/store/catalog-sort.ts`) and paginates. It limits results to `PUBLISHED` products with active variants.
3. `getFilterOptions` provides brands, accords, and notes; price bands are the fixed
   `PRICE_RANGES`.
4. Filter controls serialize changes through the same adapter, preserving keys
   such as `genero`, `presentacion`, `marca`, `acorde`, `nota`,
   `precio`, `orden`, and `pagina`.
   Search (name and brand only) lives in the header on every page: on `/` it
   writes `q` through nuqs; elsewhere `StoreSearch` submits a `next/form` GET
   to `/?q=`. Sort values: `orden=destacados` (default, featured then newest),
   `novedades` (newest only), `precio-asc`, `precio-desc`, `nombre`. Applied
   filters appear as removable chips (`ActiveFilterChips`). A search with no
   results offers a WhatsApp link.
5. `getProductBySlug` returns `null` for missing, draft, or unsellable
   products, so the route returns a 404 even for a known draft slug.
6. Product detail queries use `getSimilarProducts` for the "Si te gusta, probá también"
   section.

## Main files

| Responsibility         | File                                    |
| ---------------------- | --------------------------------------- |
| Store queries          | `src/lib/store/queries.ts`              |
| URL adapter and parser | `src/lib/store/filters.ts`              |
| Catalog UI             | `src/components/store/catalog/`         |
| Product UI             | `src/components/store/product/`         |
| Routes                 | `src/app/(store)/page.tsx`, `producto/` |

## Customer and external values

Spanish filter keys, public route segments, `es-AR` price formatting, and
Spanish accessibility/UI copy are customer-facing or public URL data. Internal
DTOs and component identifiers use English.

## Related documentation

- [Store catalog module](../modules/store-catalog.md)
- [Add to cart flow](add-to-cart.md)
