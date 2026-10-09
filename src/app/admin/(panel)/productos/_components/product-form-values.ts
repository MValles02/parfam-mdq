import { ProductStatus } from "@/generated/prisma/enums";
import type { EditableProduct } from "@/lib/admin/products";
import type { ProductFormInput } from "@/lib/validations/product";
import type { AdoptedReference } from "./reference-step";

/** Note and perfumer names are display-only. The form stores IDs, while this
 * separate map avoids duplicating labels in submitted form state. */
export type NamesById = Record<string, string>;

/** `[id, name]` pair added to a `NamesById` map. */
export type NameEntry = readonly [id: string, name: string];

/** Returns `names` with each entry added or replaced, in order. */
export function withNames(names: NamesById, entries: NameEntry[]): NamesById {
  const nextNames = { ...names };
  for (const [id, name] of entries) nextNames[id] = name;
  return nextNames;
}

/**
 * Fields that only hold data because a reference was adopted. Unlinking the
 * reference clears them: `communityVotes` is then saved as null, and the store
 * shows community data whenever it is null, so leaving these behind would
 * publish community numbers for a product with no linked reference, including
 * one below the vote threshold that hides them.
 */
export const COMMUNITY_DERIVED_FIELDS = [
  "longevity",
  "sillage",
  "seasonSpring",
  "seasonSummer",
  "seasonFall",
  "seasonWinter",
  "daypartDay",
  "daypartNight",
] as const satisfies readonly (keyof ProductFormInput)[];

export function getInitialValues(
  product: EditableProduct | null,
): ProductFormInput {
  if (!product) {
    return {
      name: "",
      brandId: null,
      brandName: "",
      fragranceRefId: null,
      sourceUrl: null,
      description: null,
      gender: null,
      concentration: null,
      year: null,
      collection: null,
      longevity: null,
      sillage: null,
      intensity: null,
      seasonSpring: null,
      seasonSummer: null,
      seasonFall: null,
      seasonWinter: null,
      daypartDay: null,
      daypartNight: null,
      status: ProductStatus.DRAFT,
      isFeatured: false,
      slug: null,
      seoTitle: null,
      seoDescription: null,
      notes: [],
      accords: [],
      perfumerIds: [],
      variants: [],
      images: [],
    };
  }
  return {
    name: product.name,
    brandId: product.brandId,
    brandName: product.brand.name,
    fragranceRefId: product.fragranceRefId,
    sourceUrl: product.sourceUrl,
    description: product.description,
    gender: product.gender,
    concentration: product.concentration,
    year: product.year,
    collection: product.collection,
    longevity: product.longevity,
    sillage: product.sillage,
    intensity: product.intensity,
    seasonSpring: product.seasonSpring,
    seasonSummer: product.seasonSummer,
    seasonFall: product.seasonFall,
    seasonWinter: product.seasonWinter,
    daypartDay: product.daypartDay,
    daypartNight: product.daypartNight,
    status: product.status,
    isFeatured: product.isFeatured,
    slug: product.slug,
    seoTitle: product.seoTitle,
    seoDescription: product.seoDescription,
    notes: product.notes.map((note) => ({
      noteId: note.note.id,
      position: note.position,
      weight: note.weight,
    })),
    accords: product.accords.map((accord) => ({
      accordId: accord.accord.id,
      strength: accord.strength,
    })),
    perfumerIds: product.perfumers.map((entry) => entry.perfumer.id),
    variants: product.variants.map((variant) => ({
      id: variant.id,
      kind: variant.kind,
      sizeMl: variant.sizeMl,
      priceArs: variant.priceArs,
      isActive: variant.isActive,
      sku: variant.sku,
    })),
    images: product.images.map((image) => ({
      id: image.id,
      storageKey: image.storageKey,
      alt: image.alt,
      isPrimary: image.isPrimary,
    })),
  };
}

export function getInitialNames(product: EditableProduct | null): NamesById {
  if (!product) return {};
  const names: NamesById = {};
  for (const note of product.notes) names[note.note.id] = note.note.nameEs;
  for (const entry of product.perfumers)
    names[entry.perfumer.id] = entry.perfumer.name;
  return names;
}

export function getInitialAdoptedReference(
  product: EditableProduct | null,
): AdoptedReference | null {
  return product?.fragranceRefId && product.fragranceRef
    ? {
        id: product.fragranceRefId,
        name: product.fragranceRef.name,
        referenceUrl: product.fragranceRef.referenceUrl,
      }
    : null;
}
