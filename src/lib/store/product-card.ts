import type { Prisma } from "@/generated/prisma/client";
import type { Concentration, VariantKind } from "@/generated/prisma/enums";
import { getPublicUrl } from "@/lib/r2";
import { SHORT_CONCENTRATION_LABELS, getStartingPrice } from "@/lib/catalog";
import { capitalize, getImageAlt } from "@/lib/store/display-names";
import { ACTIVE_VARIANT_WHERE } from "@/lib/store/visibility";

/**
 * The catalog and "Se parece a" product card: what to select for it and how
 * a selected row becomes display-ready card data.
 */

/** A release this many years old or newer gets the "NUEVO" badge. */
const NEW_RELEASE_YEARS = 3;

/** Cards list at most this many sizes, smallest first. */
const MAX_CARD_SIZES = 3;

type CardBadge = "NUEVO" | "DECANT" | null;

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

type CardVariant = {
  kind: VariantKind;
  sizeMl: number | null;
  priceArs: Prisma.Decimal;
  isActive: boolean;
};

type CardRow = {
  id: string;
  slug: string;
  name: string;
  concentration: Concentration | null;
  year: number | null;
  createdAt: Date;
  brand: { name: string; slug: string };
  images: { storageKey: string; alt: string | null }[];
  accords: { accord: { nameEs: string } }[];
  variants: CardVariant[];
};

export const PRODUCT_CARD_SELECT = {
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
    where: ACTIVE_VARIANT_WHERE,
    select: { kind: true, sizeMl: true, priceArs: true, isActive: true },
  },
} satisfies Prisma.ProductSelect;

function getCardBadge(year: number | null, variants: CardVariant[]): CardBadge {
  if (year !== null && year >= new Date().getFullYear() - NEW_RELEASE_YEARS) {
    return "NUEVO";
  }

  const kinds = new Set(variants.map((variant) => variant.kind));
  if (kinds.has("DECANT")) return "DECANT";
  return null;
}

function getSizes(variants: CardVariant[]): string[] {
  const sizes = [
    ...new Set(
      variants.map((variant) => variant.sizeMl).filter((size) => size !== null),
    ),
  ];

  return sizes
    .sort((left, right) => left - right)
    .slice(0, MAX_CARD_SIZES)
    .map((size) => String(size) + " ml");
}

function toProductCard(product: CardRow): ProductCardData {
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
          alt: getImageAlt(primaryPhoto?.alt ?? null, {
            name: product.name,
            brandName: product.brand.name,
          }),
        }
      : null,
    startingPrice: getStartingPrice(product.variants),
    badge: getCardBadge(product.year, product.variants),
    sizes: getSizes(product.variants),
  };
}

/**
 * Maps rows fetched by id back into `ids` order as cards, dropping ids the
 * fetch no longer returned (for example, a product unpublished meanwhile).
 */
export function toCardsInOrder(
  ids: string[],
  products: CardRow[],
): ProductCardData[] {
  const productsById = new Map(
    products.map((product) => [product.id, product]),
  );
  return ids
    .map((id) => productsById.get(id))
    .filter((product) => product !== undefined)
    .map(toProductCard);
}
