import type { Prisma } from "@/generated/prisma/client";
import { ProductStatus } from "@/generated/prisma/enums";
import { prisma } from "@/lib/db";
import { escapeLikePattern, getStartingPrice } from "@/lib/catalog";
import { PRICE_RANGE_LIMITS, type CatalogFilters } from "@/lib/store/filters";
import { SPANISH_COLLATOR, compareCatalogRows } from "@/lib/store/catalog-sort";
import { capitalize, getNoteName } from "@/lib/store/display-names";
import { PRODUCT_CARD_SELECT, toCardsInOrder } from "@/lib/store/product-card";
import {
  ACTIVE_VARIANT_WHERE,
  PUBLIC_PRODUCT_WHERE,
} from "@/lib/store/visibility";

/** Catalog page size, shared with the grid loading skeleton. */
export const PRODUCTS_PER_PAGE = 12;

/**
 * Minimal shape `listCatalog` needs to sort every matching product: the same
 * active-variant `where`/`select` `PRODUCT_CARD_SELECT` uses, so
 * `getStartingPrice` computes the identical starting price the card would,
 * without loading the rest of the card (images, accords, brand).
 */
const CATALOG_SORT_SELECT = {
  id: true,
  name: true,
  createdAt: true,
  isFeatured: true,
  variants: {
    where: ACTIVE_VARIANT_WHERE,
    select: { priceArs: true, isActive: true },
  },
} satisfies Prisma.ProductSelect;

/**
 * Variant conditions stay in one some query so one active variant satisfies
 * both kind and price filters.
 */
function whereCatalogVariant(
  filters: CatalogFilters,
): Prisma.ProductVariantWhereInput {
  const priceLimits = filters.priceRange
    ? PRICE_RANGE_LIMITS[filters.priceRange]
    : null;

  return {
    ...ACTIVE_VARIANT_WHERE,
    kind: filters.variantKind ?? ACTIVE_VARIANT_WHERE.kind,
    priceArs: priceLimits
      ? {
          gte: priceLimits.min ?? undefined,
          lte: priceLimits.max ?? undefined,
        }
      : undefined,
  };
}

/**
 * Ids of products whose name or brand name matches the search term, accent-
 * and case-insensitively; the caller still applies the visibility rule.
 * Prisma has no way to call the persisted `parfam_normalize` SQL function
 * (lower(unaccent(x)), see
 * `prisma/migrations/20260921225316_initial_schema/migration.sql`), so this
 * runs as raw SQL with a bound parameter; both `Product_name_trgm_idx` and
 * `Brand_name_trgm_idx` back it.
 */
async function getSearchMatchedProductIds(
  searchTerm: string,
): Promise<string[]> {
  const pattern = escapeLikePattern(searchTerm);
  const rows = await prisma.$queryRaw<{ id: string }[]>`
    SELECT p.id FROM "Product" p
     WHERE parfam_normalize(p."name") LIKE parfam_normalize(${pattern}) ESCAPE '\\'
        OR p."brandId" IN (
          SELECT b.id FROM "Brand" b
           WHERE parfam_normalize(b."name") LIKE parfam_normalize(${pattern}) ESCAPE '\\'
        )
  `;
  return rows.map((row) => row.id);
}

async function whereCatalogProduct(
  filters: CatalogFilters,
): Promise<Prisma.ProductWhereInput> {
  const searchTerm = filters.search.trim();
  const matchedIds = searchTerm
    ? await getSearchMatchedProductIds(searchTerm)
    : null;

  return {
    ...PUBLIC_PRODUCT_WHERE,
    // Narrows the active-variant condition with the kind and price filters.
    variants: { some: whereCatalogVariant(filters) },
    brand: filters.brand ? { slug: filters.brand } : undefined,
    gender: filters.gender ?? undefined,
    accords: filters.accord
      ? { some: { accord: { slug: filters.accord } } }
      : undefined,
    notes: filters.note
      ? { some: { note: { slug: filters.note } } }
      : undefined,
    ...(matchedIds !== null ? { id: { in: matchedIds } } : {}),
  };
}

/**
 * Lists and sorts the public catalog in two steps. Price sorting uses the
 * minimum active variant price, an aggregation Prisma's `orderBy` cannot
 * express, so a full re-sort is unavoidable; to keep that affordable, only a
 * light row (id, name, timestamps, active variant prices) is loaded for every
 * matching product instead of the full card shape. Once the sorted order and
 * the current page's ids are known, a second query re-fetches only those ids
 * with `PRODUCT_CARD_SELECT` for the returned cards.
 */
export async function listCatalog(filters: CatalogFilters) {
  const where = await whereCatalogProduct(filters);

  const lightRows = await prisma.product.findMany({
    where,
    select: CATALOG_SORT_SELECT,
  });

  const rows = lightRows.map((product) => ({
    id: product.id,
    name: product.name,
    startingPrice: getStartingPrice(product.variants),
    isFeatured: product.isFeatured,
    createdAt: product.createdAt.getTime(),
  }));

  rows.sort((left, right) => compareCatalogRows(filters.sort, left, right));

  const total = rows.length;
  const pages = Math.max(1, Math.ceil(total / PRODUCTS_PER_PAGE));
  const page = Math.min(Math.max(1, filters.page), pages);
  const offset = (page - 1) * PRODUCTS_PER_PAGE;
  const pageIds = rows
    .slice(offset, offset + PRODUCTS_PER_PAGE)
    .map((row) => row.id);

  if (pageIds.length === 0) {
    return { cards: [], total, page, pages };
  }

  const products = await prisma.product.findMany({
    where: { AND: [where, { id: { in: pageIds } }] },
    select: PRODUCT_CARD_SELECT,
  });

  return { cards: toCardsInOrder(pageIds, products), total, page, pages };
}

/**
 * Brands, accords, and notes that have at least one published product, for
 * the catalog filter controls.
 */
export async function getFilterOptions() {
  const [brands, accords, notes] = await Promise.all([
    prisma.brand.findMany({
      where: { products: { some: { status: ProductStatus.PUBLISHED } } },
      orderBy: { name: "asc" },
      select: { slug: true, name: true },
    }),
    prisma.accord.findMany({
      where: {
        products: { some: { product: { status: ProductStatus.PUBLISHED } } },
      },
      orderBy: { nameEs: "asc" },
      select: { slug: true, nameEs: true, color: true },
    }),
    prisma.note.findMany({
      where: {
        products: { some: { product: { status: ProductStatus.PUBLISHED } } },
      },
      orderBy: [{ usageCount: "desc" }],
      select: { slug: true, nameEs: true, nameEn: true },
    }),
  ]);

  return {
    brands,
    accords: accords.map((accord) => ({
      slug: accord.slug,
      name: capitalize(accord.nameEs),
      color: accord.color,
    })),
    notes: notes
      .map((note) => ({
        slug: note.slug,
        name: getNoteName(note),
      }))
      .sort((left, right) => SPANISH_COLLATOR.compare(left.name, right.name)),
  };
}

export type FilterOptions = Awaited<ReturnType<typeof getFilterOptions>>;
