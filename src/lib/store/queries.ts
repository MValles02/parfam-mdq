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
  getVariantLabel,
  PYRAMID_LEVELS,
  formatProperName,
} from "@/lib/catalog";
import { PRICE_RANGE_LIMITS, type CatalogFilters } from "@/lib/store/filters";

/**
 * Public store queries return only published products and active variants.
 * Decimal values become strings before crossing the Server Component boundary,
 * and photo URLs are resolved from stored R2 keys.
 */

const PRODUCTS_PER_PAGE = 12;
const NEW_RELEASE_YEARS = 3;
const SPANISH_COLLATOR = new Intl.Collator("es-AR", { sensitivity: "base" });

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

function capitalize(text: string): string {
  return text.charAt(0).toUpperCase() + text.slice(1);
}

function getStartingPrice(variants: RawVariant[]): string | null {
  return variants.reduce<string | null>((minimum, variant) => {
    const price = variant.priceArs.toString();
    return minimum === null || Number(price) < Number(minimum)
      ? price
      : minimum;
  }, null);
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

function wherePublicProduct(filters: CatalogFilters): Prisma.ProductWhereInput {
  const searchTerm = filters.search.trim();

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
    ...(searchTerm
      ? {
          OR: [
            { name: { contains: searchTerm, mode: "insensitive" as const } },
            {
              brand: {
                name: {
                  contains: searchTerm,
                  mode: "insensitive" as const,
                },
              },
            },
          ],
        }
      : {}),
  };
}

/**
 * Lists and sorts the small public catalog in memory. Price sorting uses the
 * minimum active variant price, an aggregation Prisma cannot express here.
 */
export async function listCatalog(filters: CatalogFilters) {
  const products = await prisma.product.findMany({
    where: wherePublicProduct(filters),
    select: CARD_SELECT,
  });

  const rows = products.map((product) => ({
    card: toProductCard(product),
    createdAt: product.createdAt.getTime(),
    isFeatured: product.isFeatured,
  }));

  rows.sort((left, right) => {
    switch (filters.sort) {
      case "priceAscending":
      case "priceDescending": {
        if (left.card.startingPrice === null) {
          return right.card.startingPrice === null ? 0 : 1;
        }
        if (right.card.startingPrice === null) return -1;

        const difference =
          Number(left.card.startingPrice) - Number(right.card.startingPrice);
        return filters.sort === "priceAscending" ? difference : -difference;
      }
      case "name":
        return SPANISH_COLLATOR.compare(left.card.name, right.card.name);
      default:
        if (left.isFeatured !== right.isFeatured) {
          return left.isFeatured ? -1 : 1;
        }
        return right.createdAt - left.createdAt;
    }
  });

  const total = rows.length;
  const pages = Math.max(1, Math.ceil(total / PRODUCTS_PER_PAGE));
  const page = Math.min(Math.max(1, filters.page), pages);
  const offset = (page - 1) * PRODUCTS_PER_PAGE;

  return {
    cards: rows
      .slice(offset, offset + PRODUCTS_PER_PAGE)
      .map((row) => row.card),
    total,
    page,
    pages,
  };
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
      seasons: true,
      occasions: true,
      longevity: true,
      sillage: true,
      intensity: true,
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
        orderBy: { sortOrder: "asc" },
        select: {
          position: true,
          note: { select: { slug: true, nameEs: true, nameEn: true } },
        },
      },
      accords: {
        orderBy: { sortOrder: "asc" },
        select: {
          accord: { select: { slug: true, nameEs: true, color: true } },
        },
      },
      perfumers: { select: { perfumer: { select: { name: true } } } },
    },
  });
  if (!product) return null;

  const pyramid = PYRAMID_LEVELS.map((level: NotePosition) => ({
    level,
    notes: product.notes
      .filter((item) => item.position === level)
      .map((item) => ({
        slug: item.note.slug,
        name: capitalize(item.note.nameEs ?? item.note.nameEn),
      })),
  })).filter((level) => level.notes.length > 0);

  return {
    id: product.id,
    slug: product.slug,
    name: product.name,
    description: product.description,
    gender: product.gender,
    concentration: product.concentration,
    year: product.year,
    seasons: product.seasons,
    occasions: product.occasions,
    longevity: product.longevity,
    sillage: product.sillage,
    intensity: product.intensity,
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
    accords: product.accords.map((item) => ({
      slug: item.accord.slug,
      name: capitalize(item.accord.nameEs),
      color: item.accord.color,
    })),
    pyramid,
  };
}

export type PublicProduct = NonNullable<
  Awaited<ReturnType<typeof getProductBySlug>>
>;

/** Lists related cards, preferring same-brand products before shared accords. */
export async function getRelatedProducts(product: {
  id: string;
  brandSlug: string;
  accords: { slug: string }[];
}): Promise<ProductCardData[]> {
  const baseWhere: Prisma.ProductWhereInput = {
    status: ProductStatus.PUBLISHED,
    id: { not: product.id },
    variants: { some: { isActive: true } },
  };
  const relatedLimit = 4;

  const sameBrand = await prisma.product.findMany({
    where: { ...baseWhere, brand: { slug: product.brandSlug } },
    select: CARD_SELECT,
    take: relatedLimit,
    orderBy: [{ isFeatured: "desc" }, { createdAt: "desc" }],
  });

  const remaining = relatedLimit - sameBrand.length;
  const sharedAccords =
    remaining > 0 && product.accords.length > 0
      ? await prisma.product.findMany({
          where: {
            ...baseWhere,
            id: { notIn: [product.id, ...sameBrand.map((item) => item.id)] },
            accords: {
              some: {
                accord: {
                  slug: { in: product.accords.map((accord) => accord.slug) },
                },
              },
            },
          },
          select: CARD_SELECT,
          take: remaining,
          orderBy: [{ isFeatured: "desc" }, { createdAt: "desc" }],
        })
      : [];

  return [...sameBrand, ...sharedAccords].map(toProductCard);
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
