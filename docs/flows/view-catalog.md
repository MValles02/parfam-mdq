# Flow: browse the catalog

## Purpose

Render a searchable, filterable public catalog for Argentine customers while
keeping the URL contract stable and querying only sellable products.

## Entry points

The home page (`/`) renders `CatalogSection` with the filter URL keys and pagination. Product and brand
routes remain `/producto/[slug]` and `/marca/[slug]`.

## Flow

1. The page parses the browser URL through `loadCatalogFilters()` and maps
   preserved Spanish query keys to the internal English `CatalogFilters`.
2. `listCatalog` combines search, filter, sort, and pagination criteria in
   PostgreSQL. It limits results to `PUBLISHED` products with active variants.
3. `getFilterOptions` provides brands, accords, notes, and price bounds.
4. Filter controls serialize changes through the same adapter, preserving keys
   such as `genero`, `presentacion`, `marca`, `acorde`, `nota`,
   `precio`, `orden`, and `pagina`.
   Below `lg` the text search field sits at the top of the catalog section,
   not in the filter drawer.
5. `getProductBySlug` returns `null` for missing, draft, or unsellable
   products, so the route returns a 404 even for a known draft slug.
6. Product detail queries use `getSimilarProducts` for the "Se parece a"
   section; brand pages use `getBrandBySlug`.

## Main files

| Responsibility         | File                                              |
| ---------------------- | ------------------------------------------------- |
| Store queries          | `src/lib/store/queries.ts`                        |
| URL adapter and parser | `src/lib/store/filters.ts`                        |
| Catalog UI             | `src/components/store/catalog/`                   |
| Product UI             | `src/components/store/product/`                   |
| Routes                 | `src/app/(store)/page.tsx`, `producto/`, `marca/` |

## Customer and external values

Spanish filter keys, public route segments, `es-AR` price formatting, and
Spanish accessibility/UI copy are customer-facing or public URL data. Internal
DTOs and component identifiers use English.

## Related documentation

- [Store catalog module](../modules/store-catalog.md)
- [Add to cart flow](add-to-cart.md)
