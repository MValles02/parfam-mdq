import type { Prisma } from "@/generated/prisma/client";
import { ProductStatus, type NotePosition } from "@/generated/prisma/enums";
import { prisma } from "@/lib/db";
import { getPublicUrl } from "@/lib/r2";
import {
  PYRAMID_LEVELS,
  formatProperName,
  getVariantLabel,
} from "@/lib/catalog";
import {
  capitalize,
  getImageAlt,
  getNoteName,
} from "@/lib/store/display-names";
import { ACTIVE_VARIANT_WHERE } from "@/lib/store/visibility";

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

const PRODUCT_DETAIL_SELECT = {
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
  // Read only to decide whether to hide the community fields above; never
  // included in the public product.
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
    where: ACTIVE_VARIANT_WHERE,
    orderBy: { sortOrder: "asc" },
    select: { id: true, kind: true, sizeMl: true, priceArs: true },
  },
  notes: {
    // Canonical order, shared with `getProductForEdit`
    // (`src/lib/admin/products.ts`): within each pyramid level, or the flat
    // list, strongest weight first, then `sortOrder` (written by
    // `syncRelationships` in `src/app/admin/(panel)/productos/product-persistence.ts`) as
    // a tiebreak.
    orderBy: [{ position: "asc" }, { weight: "desc" }, { sortOrder: "asc" }],
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
} satisfies Prisma.ProductSelect;

type ProductDetailRow = Prisma.ProductGetPayload<{
  select: typeof PRODUCT_DETAIL_SELECT;
}>;

type PyramidLevel = {
  level: NotePosition | null;
  notes: { slug: string; name: string }[];
};

/**
 * Groups the notes by tier in evaporation order, skipping empty tiers. Notes
 * with a null position have no top/middle/base tier; they render as a single
 * flat list after the tiers instead of being dropped.
 */
function buildPyramid(notes: ProductDetailRow["notes"]): PyramidLevel[] {
  const notesAt = (position: NotePosition | null) =>
    notes
      .filter((item) => item.position === position)
      .map((item) => ({ slug: item.note.slug, name: getNoteName(item.note) }));

  const tieredLevels = PYRAMID_LEVELS.map((level) => ({
    level,
    notes: notesAt(level),
  })).filter((level) => level.notes.length > 0);

  const flatNotes = notesAt(null);

  return flatNotes.length > 0
    ? [...tieredLevels, { level: null, notes: flatNotes }]
    : tieredLevels;
}

function toPublicProduct(product: ProductDetailRow) {
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
        alt: getImageAlt(image.alt, {
          name: product.name,
          brandName: product.brand.name,
        }),
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
    // Ordered strongest first by `PRODUCT_DETAIL_SELECT`.
    accords: product.accords.map((item) => ({
      slug: item.accord.slug,
      name: capitalize(item.accord.nameEs),
      color: item.accord.color,
      strength: item.strength,
    })),
    pyramid: buildPyramid(product.notes),
  };
}

export type PublicProduct = ReturnType<typeof toPublicProduct>;

/**
 * Returns a published product for its detail page, or null when the slug is
 * missing or the product is still a draft. Unlike the catalog, this does not
 * require an active variant: such a product still has a page, with
 * `variants` empty, where `Purchase` offers a WhatsApp inquiry instead.
 */
export async function getProductBySlug(
  slug: string,
): Promise<PublicProduct | null> {
  const product = await prisma.product.findFirst({
    where: { slug, status: ProductStatus.PUBLISHED },
    select: PRODUCT_DETAIL_SELECT,
  });
  return product ? toPublicProduct(product) : null;
}
