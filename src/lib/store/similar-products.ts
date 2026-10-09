import { unstable_cache } from "next/cache";
import { prisma } from "@/lib/db";
import {
  PRODUCT_CARD_SELECT,
  toCardsInOrder,
  type ProductCardData,
} from "@/lib/store/product-card";
import {
  rankSimilarProducts,
  type SimilarityCandidate,
} from "@/lib/store/similarity";
import { PUBLIC_PRODUCT_WHERE } from "@/lib/store/visibility";

/**
 * Store actions invalidate this tag whenever a product's accords, notes,
 * profile, collection, or perfumers change, since the precomputed ranking
 * below covers every published product at once (see `revalidateStore` in
 * `src/app/admin/(panel)/productos/actions.ts`).
 */
export const TAG_SIMILAR_PRODUCTS = "similar-products";

/**
 * Loads every public product with the relations `src/lib/store/similarity.ts`
 * scores on, and ranks them against each other. This is the expensive,
 * uncached step: it is only ever called through the `unstable_cache` wrapper
 * below.
 */
async function computeSimilarProductIds(): Promise<Record<string, string[]>> {
  const products = await prisma.product.findMany({
    where: PUBLIC_PRODUCT_WHERE,
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

/** Top 20 similar product IDs per product ID, ranked by `scoreSimilarity`. */
const getSimilarProductIds = unstable_cache(
  computeSimilarProductIds,
  ["similar-products"],
  { tags: [TAG_SIMILAR_PRODUCTS] },
);

/**
 * Fetches the "Se parece a" cards for one product, live (not through the
 * cached ranking, which only stores IDs). The visibility rule is re-applied
 * here so a product that became a draft or lost its last active variant
 * after the ranking was cached cannot still appear as a card.
 */
export async function getSimilarProducts(
  productId: string,
): Promise<ProductCardData[]> {
  const similarIds = (await getSimilarProductIds())[productId] ?? [];
  if (similarIds.length === 0) return [];

  const products = await prisma.product.findMany({
    where: { id: { in: similarIds }, ...PUBLIC_PRODUCT_WHERE },
    select: PRODUCT_CARD_SELECT,
  });

  return toCardsInOrder(similarIds, products);
}
