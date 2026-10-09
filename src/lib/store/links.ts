/**
 * Public store URLs that several pages and components link to. These paths
 * and query keys are a shared, bookmarkable contract, so they are built in one
 * place. This module imports nothing, so Client Components can use it without
 * pulling the catalog filter parsers into every page's bundle.
 */

/** `id` of the home page catalog section, the target of every catalog link. */
export const CATALOG_SECTION_ID = "catalogo";

export const CATALOG_HREF = `/#${CATALOG_SECTION_ID}`;

/**
 * Home catalog filtered by one brand. `marca` is the brand key of
 * `catalogFilterUrlKeys` in `src/lib/store/filters.ts`.
 */
export function getBrandCatalogPath(brandSlug: string): string {
  return `/?marca=${brandSlug}`;
}

export function getProductPath(productSlug: string): string {
  return `/producto/${productSlug}`;
}
