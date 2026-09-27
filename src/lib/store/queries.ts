import { unstable_cache } from "next/cache";
import type { Prisma } from "@/generated/prisma/client";
import { ProductStatus } from "@/generated/prisma/enums";
import type {
  Concentration,
  NotePosition,
  VariantKind,
} from "@/generated/prisma/enums";
import { prisma } from "@/lib/db";
import { getPublicUrl } from "@/lib/r2";
import {
  SHORT_CONCENTRATION_LABELS,
  escapeLikePattern,
  getVariantLabel,
  getStartingPrice,
  PYRAMID_LEVELS,
  formatProperName,
} from "@/lib/catalog";
import { PRICE_RANGE_LIMITS, type CatalogFilters } from "@/lib/store/filters";
import { compareCatalogRows } from "@/lib/store/catalog-sort";
import {
  rankSimilarProducts,
  type SimilarityCandidate,
} from "@/lib/store/similarity";

/**
 * Public store queries return only published products and active variants.
 * Decimal values become strings before crossing the Server Component boundary,
 * and photo URLs are resolved from stored R2 keys.
 */

const PRODUCTS_PER_PAGE = 12;
const NEW_RELEASE_YEARS = 3;
const SPANISH_COLLATOR = new Intl.Collator("es-AR", { sensitivity: "base" });

/**
 * `Product.communityVotes` (copied at adoption from `FragranceRef`, see
 * `prisma/schema.prisma`) is an internal number, never sent to the client.
 * Below this many voters, longevity, sillage, season, and daypart averages
 * are too noisy to publish, so `getProductBySlug` nulls them instead of
 * returning the stored value. `communityVotes === null` (a manually created
 * product with no reference to copy from) always shows its data because
 * there is no sample size to distrust.
 */
const MIN_COMMUNITY_VOTES = 20;

type CardBadge = "NUEVO" | "DECANT" | "TESTER" | null;

export type ProductCardData = {
  slug: string;
  name: string;
  brandName: string;
  brandSlug: string;
  metadata: string;
  image: { url: string; alt: string } | null;
  startingPrice: string | null;
  badge: CardBadge;
  sizes: string[];
};

type RawVariant = {
  kind: VariantKind;
  sizeMl: number | null;
  priceArs: Prisma.Decimal;
  isActive: boolean;
};

const CARD_SELECT = {
  id: true,
  slug: true,
  name: true,
  concentration: true,
  year: true,
  createdAt: true,
  isFeatured: true,
  brand: { select: { name: true, slug: true } },
  images: {
    where: { isPrimary: true },
    take: 1,
    select: { storageKey: true, alt: true },
  },
  accords: {
    orderBy: { sortOrder: "asc" },
    take: 1,
    select: { accord: { select: { nameEs: true } } },
  },
  variants: {
    where: { isActive: true },
    select: { kind: true, sizeMl: true, priceArs: true, isActive: true },
  },
} satisfies Prisma.ProductSelect;

/**
 * Minimal shape `listCatalog` needs to sort every matching product: the same
 * active-variant `where`/`select` `CARD_SELECT` uses, so `getStartingPrice`
 * computes the identical starting price `toProductCard` would, without
 * loading the rest of the card (images, accords, brand).
 */
const CATALOG_SORT_SELECT = {
  id: true,
  name: true,
  createdAt: true,
  isFeatured: true,
  variants: {
    where: { isActive: true },
    select: { priceArs: true, isActive: true },
  },
} satisfies Prisma.ProductSelect;

function capitalize(text: string): string {
  return text.charAt(0).toUpperCase() + text.slice(1);
}

function getCardBadge(year: number | null, variants: RawVariant[]): CardBadge {
  if (year !== null && year >= new Date().getFullYear() - NEW_RELEASE_YEARS) {
    return "NUEVO";
  }

  const kinds = new Set(variants.map((variant) => variant.kind));
  if (kinds.has("DECANT")) return "DECANT";
  if (kinds.has("TESTER") && !kinds.has("FULL_BOTTLE")) return "TESTER";
  return null;
}

function getSizes(variants: RawVariant[]): string[] {
  const sizes = [
    ...new Set(
      variants.map((variant) => variant.sizeMl).filter((size) => size !== null),
    ),
  ];

  return sizes
    .sort((left, right) => left - right)
    .slice(0, 3)
    .map((size) => String(size) + " ml");
}

function toProductCard(product: {
  slug: string;
  name: string;
  concentration: Concentration | null;
  year: number | null;
  createdAt: Date;
  brand: { name: string; slug: string };
  images: { storageKey: string; alt: string | null }[];
  accords: { accord: { nameEs: string } }[];
  variants: RawVariant[];
}): ProductCardData {
  const metadata = [
    product.concentration
      ? SHORT_CONCENTRATION_LABELS[product.concentration]
      : null,
    product.year ? String(product.year) : null,
    product.accords[0] ? capitalize(product.accords[0].accord.nameEs) : null,
  ]
    .filter(Boolean)
    .join(" · ");

  const primaryPhoto = product.images[0];
  const imageUrl = primaryPhoto ? getPublicUrl(primaryPhoto.storageKey) : null;

  return {
    slug: product.slug,
    name: product.name,
    brandName: product.brand.name,
    brandSlug: product.brand.slug,
    metadata,
    image: imageUrl
      ? {
          url: imageUrl,
          alt: primaryPhoto?.alt ?? product.name + " de " + product.brand.name,
        }
      : null,
    startingPrice: getStartingPrice(product.variants),
    badge: getCardBadge(product.year, product.variants),
    sizes: getSizes(product.variants),
  };
}

/**
 * Variant conditions stay in one some query so one active variant satisfies
 * both kind and price filters.
 */
function whereVariant(
  filters: CatalogFilters,
): Prisma.ProductVariantWhereInput {
  const priceLimits = filters.priceRange
    ? PRICE_RANGE_LIMITS[filters.priceRange]
    : null;

  return {
    isActive: true,
    kind: filters.variantKind ?? undefined,
    priceArs: priceLimits
      ? {
          gte: priceLimits.min ?? undefined,
          lte: priceLimits.max ?? undefined,
        }
      : undefined,
  };
}

/**
 * Ids of published products whose name or brand name matches the search term,
 * accent- and case-insensitively. Prisma has no way to call the persisted
 * `parfam_normalize` SQL function (lower(unaccent(x)), see
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

async function wherePublicProduct(
  filters: CatalogFilters,
): Promise<Prisma.ProductWhereInput> {
  const searchTerm = filters.search.trim();
  const matchedIds = searchTerm
    ? await getSearchMatchedProductIds(searchTerm)
    : null;

  return {
    status: ProductStatus.PUBLISHED,
    // Published products without active variants have nothing to sell.
    variants: { some: whereVariant(filters) },
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
 * matching product instead of the full `CARD_SELECT` shape. Once the sorted
 * order and the current page's ids are known, a second query re-fetches only
 * those ids with `CARD_SELECT` for the returned cards.
 */
export async function listCatalog(filters: CatalogFilters) {
  const where = await wherePublicProduct(filters);

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
    select: CARD_SELECT,
  });

  const productsById = new Map(
    products.map((product) => [product.id, product]),
  );
  const cards = pageIds
    .map((id) => productsById.get(id))
    .filter((product): product is (typeof products)[number] => Boolean(product))
    .map(toProductCard);

  return { cards, total, page, pages };
}

/** Returns controls that can produce published catalog results. */
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
        name: capitalize(note.nameEs ?? note.nameEn),
      }))
      .sort((left, right) => SPANISH_COLLATOR.compare(left.name, right.name)),
  };
}

export type FilterOptions = Awaited<ReturnType<typeof getFilterOptions>>;

/**
 * Returns a full published product, or null when the slug is missing or the
 * product remains a draft.
 */
export async function getProductBySlug(slug: string) {
  const product = await prisma.product.findFirst({
    where: { slug, status: ProductStatus.PUBLISHED },
    select: {
      id: true,
      slug: true,
      name: true,
      description: true,
      gender: true,
      concentration: true,
      year: true,
      collection: true,
      longevity: true,
      sillage: true,
      intensity: true,
      seasonSpring: true,
      seasonSummer: true,
      seasonFall: true,
      seasonWinter: true,
      daypartDay: true,
      daypartNight: true,
      // Read only to decide whether to hide the community fields above;
      // never included in the return value below.
      communityVotes: true,
      seoTitle: true,
      seoDescription: true,
      updatedAt: true,
      brand: { select: { name: true, slug: true } },
      images: {
        orderBy: [{ isPrimary: "desc" }, { sortOrder: "asc" }],
        select: { id: true, storageKey: true, alt: true },
      },
      variants: {
        where: { isActive: true },
        orderBy: { sortOrder: "asc" },
        select: { id: true, kind: true, sizeMl: true, priceArs: true },
      },
      notes: {
        // Canonical order, shared with `getProductForEdit`
        // (`src/lib/admin/products.ts`): within each pyramid level, or the
        // flat list, strongest weight first, then `sortOrder` (written by
        // `syncRelationships` in `src/app/admin/(panel)/productos/actions.ts`)
        // as a tiebreak.
        orderBy: [
          { position: "asc" },
          { weight: "desc" },
          { sortOrder: "asc" },
        ],
        select: {
          position: true,
          weight: true,
          note: { select: { slug: true, nameEs: true, nameEn: true } },
        },
      },
      // Strongest accord first, since customers scan the bars top to bottom.
      accords: {
        orderBy: { strength: "desc" },
        select: {
          strength: true,
          accord: { select: { slug: true, nameEs: true, color: true } },
        },
      },
      perfumers: { select: { perfumer: { select: { name: true } } } },
    },
  });
  if (!product) return null;

  // Notes with a null position have no top/middle/base tier; they render as
  // a single flat list instead of being dropped.
  const tieredLevels = PYRAMID_LEVELS.map((level: NotePosition) => ({
    level,
    notes: product.notes
      .filter((item) => item.position === level)
      .map((item) => ({
        slug: item.note.slug,
        name: capitalize(item.note.nameEs ?? item.note.nameEn),
      })),
  })).filter((level) => level.notes.length > 0);

  const flatNotes = product.notes
    .filter((item) => item.position === null)
    .map((item) => ({
      slug: item.note.slug,
      name: capitalize(item.note.nameEs ?? item.note.nameEn),
    }));

  const pyramid: {
    level: NotePosition | null;
    notes: { slug: string; name: string }[];
  }[] =
    flatNotes.length > 0
      ? [...tieredLevels, { level: null, notes: flatNotes }]
      : tieredLevels;

  // A small community sample is noisier than useful, so the fields it backs
  // (longevity, sillage, seasons, daypart) are hidden below that threshold. A
  // manually created product (`communityVotes === null`) has no sample to
  // distrust and always shows its data.
  const hasReliableCommunityData =
    product.communityVotes === null ||
    product.communityVotes >= MIN_COMMUNITY_VOTES;

  return {
    id: product.id,
    slug: product.slug,
    name: product.name,
    description: product.description,
    gender: product.gender,
    concentration: product.concentration,
    year: product.year,
    collection: product.collection,
    longevity:
      hasReliableCommunityData && product.longevity !== null
        ? Number(product.longevity)
        : null,
    sillage:
      hasReliableCommunityData && product.sillage !== null
        ? Number(product.sillage)
        : null,
    // Admin-entered assessment, not community data, so it is never hidden by
    // `hasReliableCommunityData` above.
    intensity: product.intensity,
    seasons: {
      spring: hasReliableCommunityData ? product.seasonSpring : null,
      summer: hasReliableCommunityData ? product.seasonSummer : null,
      fall: hasReliableCommunityData ? product.seasonFall : null,
      winter: hasReliableCommunityData ? product.seasonWinter : null,
    },
    dayparts: {
      day: hasReliableCommunityData ? product.daypartDay : null,
      night: hasReliableCommunityData ? product.daypartNight : null,
    },
    seoTitle: product.seoTitle,
    seoDescription: product.seoDescription,
    updatedAt: product.updatedAt,
    brandName: product.brand.name,
    brandSlug: product.brand.slug,
    perfumers: product.perfumers.map((item) =>
      formatProperName(item.perfumer.name),
    ),
    images: product.images
      .map((image) => ({
        id: image.id,
        url: getPublicUrl(image.storageKey),
        alt: image.alt ?? product.name + " de " + product.brand.name,
      }))
      .filter((image): image is { id: string; url: string; alt: string } =>
        Boolean(image.url),
      ),
    variants: product.variants.map((variant) => ({
      id: variant.id,
      kind: variant.kind,
      sizeMl: variant.sizeMl,
      label: getVariantLabel(variant.kind, variant.sizeMl),
      price: variant.priceArs.toString(),
    })),
    // Ordered strongest first by the `accords` query above.
    accords: product.accords.map((item) => ({
      slug: item.accord.slug,
      name: capitalize(item.accord.nameEs),
      color: item.accord.color,
      strength: item.strength,
    })),
    pyramid,
  };
}

export type PublicProduct = NonNullable<
  Awaited<ReturnType<typeof getProductBySlug>>
>;

/**
 * Store actions invalidate this tag whenever a product's accords, notes,
 * profile, collection, or perfumers change, since the precomputed ranking
 * below covers every published product at once (see `revalidateStore` in
 * `src/app/admin/(panel)/productos/actions.ts`).
 */
export const TAG_SIMILAR_PRODUCTS = "similar-products";

/**
 * Loads every eligible product (published, at least one active variant) with
 * the relations `src/lib/store/similarity.ts` scores on, and ranks them
 * against each other. This is the expensive, uncached step: it is only ever
 * called through the `unstable_cache` wrapper below.
 */
async function computeSimilarProductIds(): Promise<Record<string, string[]>> {
  const products = await prisma.product.findMany({
    where: {
      status: ProductStatus.PUBLISHED,
      variants: { some: { isActive: true } },
    },
    select: {
      id: true,
      gender: true,
      collection: true,
      isFeatured: true,
      createdAt: true,
      seasonSpring: true,
      seasonSummer: true,
      seasonFall: true,
      seasonWinter: true,
      daypartDay: true,
      daypartNight: true,
      accords: { select: { accordId: true, strength: true } },
      notes: { select: { weight: true, note: { select: { family: true } } } },
      perfumers: { select: { perfumerId: true } },
    },
  });

  const candidates: SimilarityCandidate[] = products.map((product) => ({
    id: product.id,
    gender: product.gender,
    accords: product.accords.map((accord) => ({
      accordId: accord.accordId,
      strength: accord.strength,
    })),
    notes: product.notes.map((note) => ({
      family: note.note.family,
      weight: note.weight,
    })),
    profile: {
      seasonSpring: product.seasonSpring,
      seasonSummer: product.seasonSummer,
      seasonFall: product.seasonFall,
      seasonWinter: product.seasonWinter,
      daypartDay: product.daypartDay,
      daypartNight: product.daypartNight,
    },
    collection: product.collection,
    perfumerIds: product.perfumers.map((perfumer) => perfumer.perfumerId),
    isFeatured: product.isFeatured,
    createdAt: product.createdAt.getTime(),
  }));

  return rankSimilarProducts(candidates);
}

const cachedSimilarProductIds = unstable_cache(
  computeSimilarProductIds,
  ["similar-products"],
  { tags: [TAG_SIMILAR_PRODUCTS] },
);

/** Top 20 similar product IDs per product ID, ranked by `scoreSimilarity`. */
async function getSimilarProductIds(): Promise<Record<string, string[]>> {
  return cachedSimilarProductIds();
}

/**
 * Fetches the "Se parece a" cards for one product, live (not through the
 * cached ranking, which only stores IDs). The PUBLISHED/active-variant filter
 * is re-applied here so a product that became a draft or lost its last active
 * variant after the ranking was cached cannot still appear as a card.
 */
export async function getSimilarProducts(
  productId: string,
): Promise<ProductCardData[]> {
  const similarIds = (await getSimilarProductIds())[productId] ?? [];
  if (similarIds.length === 0) return [];

  const products = await prisma.product.findMany({
    where: {
      id: { in: similarIds },
      status: ProductStatus.PUBLISHED,
      variants: { some: { isActive: true } },
    },
    select: CARD_SELECT,
  });

  const productsById = new Map(
    products.map((product) => [product.id, product]),
  );
  return similarIds
    .map((id) => productsById.get(id))
    .filter((product): product is (typeof products)[number] => Boolean(product))
    .map(toProductCard);
}

/** Returns a public brand header, or null when it has no published products. */
export async function getBrandBySlug(slug: string) {
  return prisma.brand.findFirst({
    where: { slug, products: { some: { status: ProductStatus.PUBLISHED } } },
    select: { name: true, slug: true, country: true },
  });
}

/**
 * Store actions invalidate this tag after changing product URLs. Its value is
 * an existing cache contract and must stay stable.
 */
export const TAG_SITEMAP_URLS = "sitemap-urls";

/** Returns sitemap entries with their last-modified dates. */
export async function getSitemapUrls() {
  const [products, brands] = await Promise.all([
    prisma.product.findMany({
      where: {
        status: ProductStatus.PUBLISHED,
        variants: { some: { isActive: true } },
      },
      select: { slug: true, updatedAt: true },
      orderBy: { updatedAt: "desc" },
    }),
    prisma.brand.findMany({
      where: { products: { some: { status: ProductStatus.PUBLISHED } } },
      select: { slug: true, updatedAt: true },
      orderBy: { name: "asc" },
    }),
  ]);

  return { products, brands };
}
