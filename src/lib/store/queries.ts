/**
 * Public store queries. Product lists return only public products (published,
 * with at least one active variant; see `src/lib/store/visibility.ts`);
 * `getProductBySlug` and `getFilterOptions` require only a published product,
 * as documented on each. Decimal values become strings before crossing the
 * Server Component boundary, and photo URLs are resolved from stored R2 keys.
 *
 * This module is the stable import path for the store's data access; each
 * responsibility lives in its own file:
 *
 * - `catalog-listing.ts`: the filtered, sorted, paginated catalog and the
 *   filter options.
 * - `product-card.ts`: the card select and row-to-card mapping shared by the
 *   catalog and "Se parece a".
 * - `product-detail.ts`: the product detail page.
 * - `similar-products.ts`: the cached "Se parece a" ranking.
 * - `sitemap-urls.ts`: sitemap entries.
 */

export {
  PRODUCTS_PER_PAGE,
  getFilterOptions,
  listCatalog,
  type FilterOptions,
} from "@/lib/store/catalog-listing";
export type { ProductCardData } from "@/lib/store/product-card";
export {
  getProductBySlug,
  type PublicProduct,
} from "@/lib/store/product-detail";
export {
  TAG_SIMILAR_PRODUCTS,
  getSimilarProducts,
} from "@/lib/store/similar-products";
export { TAG_SITEMAP_URLS, getSitemapUrls } from "@/lib/store/sitemap-urls";
