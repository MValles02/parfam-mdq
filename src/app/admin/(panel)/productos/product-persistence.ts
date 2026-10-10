import type { Prisma } from "@/generated/prisma/client";
import { ProductStatus } from "@/generated/prisma/enums";
import { findAvailableSlug } from "@/lib/admin/slug";
import { prisma } from "@/lib/db";
import { toSlug } from "@/lib/slug";
import type { ProductFormValues } from "@/lib/validations/product";

/**
 * Database reads and writes behind `saveProduct` and `duplicateProduct`
 * (`actions.ts`). They live outside `actions.ts` because every export of a
 * "use server" file is a public Server Action, and these helpers skip
 * `requireAdmin()`: only call them after it.
 */

/**
 * Client IDs are data rather than authority. Existing rows must be verified
 * before `createMany` could produce an unreadable foreign-key error.
 *
 * On success it also returns the adopted reference's `communityVotes`: that
 * value is never client-submitted (`productSchema` in
 * `src/lib/validations/product.ts` has no such field), so it is copied from
 * `FragranceRef.communityVotes`, or null when the product has no reference.
 *
 * `productId` is the product being saved (null on create). A reference already
 * used by another product is rejected only when this product is newly taking
 * it: products that already shared a reference before this rule existed must
 * stay saveable, and `Product.fragranceRefId` has no unique constraint.
 */
export async function verifyReferencedRows(
  productId: string | null,
  values: ProductFormValues,
): Promise<
  { ok: true; communityVotes: number | null } | { ok: false; message: string }
> {
  const [noteCount, accordCount, perfumerCount, fragranceRef] =
    await Promise.all([
      prisma.note.count({
        where: { id: { in: values.notes.map((note) => note.noteId) } },
      }),
      prisma.accord.count({
        where: { id: { in: values.accords.map((accord) => accord.accordId) } },
      }),
      prisma.perfumer.count({ where: { id: { in: values.perfumerIds } } }),
      values.fragranceRefId
        ? prisma.fragranceRef.findUnique({
            where: { id: values.fragranceRefId },
            select: { communityVotes: true },
          })
        : Promise.resolve(null),
    ]);
  const uniqueNoteCount = new Set(values.notes.map((note) => note.noteId)).size;
  if (noteCount !== uniqueNoteCount)
    return { ok: false, message: "Alguna de las notas ya no existe." };
  if (
    accordCount !==
    new Set(values.accords.map((accord) => accord.accordId)).size
  )
    return { ok: false, message: "Alguno de los acordes ya no existe." };
  if (perfumerCount !== new Set(values.perfumerIds).size)
    return { ok: false, message: "Alguno de los perfumistas ya no existe." };
  if (values.fragranceRefId && !fragranceRef)
    return { ok: false, message: "La fragancia de referencia ya no existe." };
  if (values.fragranceRefId) {
    const stored = productId
      ? await prisma.product.findUnique({
          where: { id: productId },
          select: { fragranceRefId: true },
        })
      : null;
    if (stored?.fragranceRefId !== values.fragranceRefId) {
      const existing = await prisma.product.findFirst({
        where: {
          fragranceRefId: values.fragranceRefId,
          ...(productId ? { id: { not: productId } } : {}),
        },
        select: { name: true },
      });
      if (existing)
        return {
          ok: false,
          message: `Esa fragancia ya está cargada en «${existing.name}».`,
        };
    }
  }

  return {
    ok: true,
    communityVotes: fragranceRef ? fragranceRef.communityVotes : null,
  };
}

/**
 * Creates (`id` null) or updates a product with its brand, slug, relations,
 * variants, and images, inside the caller's transaction.
 *
 * Returns the storage keys of deleted image rows so the caller can decide
 * after commit whether they can also be deleted from R2.
 */
export async function writeProduct(
  tx: Prisma.TransactionClient,
  {
    id,
    values,
    communityVotes,
  }: {
    id: string | null;
    values: ProductFormValues;
    communityVotes: number | null;
  },
) {
  const brandId = await resolveBrand(tx, values);
  const slug = await findAvailableSlug(
    tx,
    values.slug ?? `${values.brandName} ${values.name}`,
    id,
  );

  const productData = {
    ...pickCopyableProductFields(values),
    name: values.name,
    brandId,
    communityVotes,
    status: values.status,
    isFeatured: values.isFeatured,
  };

  const product = id
    ? await tx.product.update({
        where: { id },
        data: { ...productData, slug },
        select: { id: true, slug: true },
      })
    : await tx.product.create({
        data: { ...productData, slug },
        select: { id: true, slug: true },
      });

  await syncRelationships(tx, product.id, values);
  await syncVariants(tx, product.id, values);
  const deletedImageKeys = await syncImages(tx, product.id, values);

  return { product, deletedImageKeys };
}

/** Relations `duplicateProduct` reads from the source product to copy them. */
export const PRODUCT_COPY_INCLUDE = {
  notes: true,
  accords: true,
  perfumers: true,
  variants: true,
  images: true,
} as const satisfies Prisma.ProductInclude;

type ProductToCopy = Prisma.ProductGetPayload<{
  include: typeof PRODUCT_COPY_INCLUDE;
}>;

/** Creates a "(copia)" draft of `original` with copies of its relations. */
export async function createProductCopy(
  tx: Prisma.TransactionClient,
  original: ProductToCopy,
) {
  const name = `${original.name} (copia)`;
  // Copies start as drafts because duplication usually precedes editing and
  // must not expose an incomplete product in the store.
  return tx.product.create({
    data: {
      ...pickCopyableProductFields(original),
      // A reference may back only one product, so the copy starts without it.
      fragranceRefId: null,
      slug: await findAvailableSlug(tx, name, null),
      name,
      brandId: original.brandId,
      communityVotes: original.communityVotes,
      status: ProductStatus.DRAFT,
      isFeatured: false,
      notes: {
        createMany: {
          data: original.notes.map((n) => ({
            noteId: n.noteId,
            position: n.position,
            weight: n.weight,
            sortOrder: n.sortOrder,
          })),
        },
      },
      accords: {
        createMany: {
          data: original.accords.map((a) => ({
            accordId: a.accordId,
            strength: a.strength,
            sortOrder: a.sortOrder,
          })),
        },
      },
      perfumers: {
        createMany: {
          data: original.perfumers.map((p) => ({ perfumerId: p.perfumerId })),
        },
      },
      variants: {
        createMany: {
          data: original.variants.map((variant) => ({
            kind: variant.kind,
            sizeMl: variant.sizeMl,
            priceArs: variant.priceArs,
            isActive: variant.isActive,
            sortOrder: variant.sortOrder,
            // SKU is unique to the source product and is never copied.
            sku: null,
          })),
        },
      },
      images: {
        // Images share the source R2 object, so deleting the copy cannot
        // delete the source product's file.
        createMany: {
          data: original.images.map((i) => ({
            storageKey: i.storageKey,
            alt: i.alt,
            sortOrder: i.sortOrder,
            isPrimary: i.isPrimary,
          })),
        },
      },
    },
    select: { id: true },
  });
}

/**
 * Product columns copied one-to-one from the form by `saveProduct` and from
 * the source row by `duplicateProduct`. Keeping one list means a new column
 * cannot be saved but silently dropped from copies, or the reverse.
 */
const COPYABLE_PRODUCT_FIELDS = [
  "fragranceRefId",
  "sourceUrl",
  "description",
  "gender",
  "concentration",
  "year",
  "collection",
  "longevity",
  "sillage",
  "intensity",
  "seasonSpring",
  "seasonSummer",
  "seasonFall",
  "seasonWinter",
  "daypartDay",
  "daypartNight",
  "seoTitle",
  "seoDescription",
] as const;

type CopyableProductField = (typeof COPYABLE_PRODUCT_FIELDS)[number];

export function pickCopyableProductFields<
  T extends Record<CopyableProductField, unknown>,
>(source: T): Pick<T, CopyableProductField> {
  return Object.fromEntries(
    COPYABLE_PRODUCT_FIELDS.map((field) => [field, source[field]]),
  ) as Pick<T, CopyableProductField>;
}

/** Resolves `brandId` when it still exists, otherwise finds or creates a brand
 * from the `brandName` slug. */
export async function resolveBrand(
  tx: Prisma.TransactionClient,
  values: ProductFormValues,
) {
  if (values.brandId) {
    const existingBrand = await tx.brand.findUnique({
      where: { id: values.brandId },
      select: { id: true },
    });
    if (existingBrand) return existingBrand.id;
  }
  // Manual entries may be absent from the 1,748 imported brands.
  const slug = toSlug(values.brandName);
  if (!slug) throw new Error("Brand name is invalid.");
  const brand = await tx.brand.upsert({
    where: { slug },
    create: { slug, name: values.brandName },
    update: {},
    select: { id: true },
  });
  return brand.id;
}

/**
 * Canonical order, shared with `getProductForEdit`
 * (`src/lib/admin/products.ts`) and `getProductBySlug`
 * (`src/lib/store/product-detail.ts`): within each pyramid level, or the flat
 * list, strongest weight first. The map key is the position string
 * ("TOP"/"MIDDLE"/"BASE") or "" for a flat list. Ties keep the form's
 * original order, which `Array.prototype.sort` preserves because it is
 * stable, so `sortOrder` becomes a meaningful tiebreak the next time
 * these rows are read back.
 */
export function buildNoteRows(
  productId: string,
  notes: ProductFormValues["notes"],
) {
  const groups = new Map<
    string,
    { note: (typeof notes)[number]; formIndex: number }[]
  >();
  notes.forEach((note, formIndex) => {
    const key = note.position ?? "";
    const group = groups.get(key);
    if (group) group.push({ note, formIndex });
    else groups.set(key, [{ note, formIndex }]);
  });

  return [...groups.values()].flatMap((group) => {
    group.sort(
      (a, b) => b.note.weight - a.note.weight || a.formIndex - b.formIndex,
    );
    return group.map(({ note }, sortOrder) => ({
      productId,
      noteId: note.noteId,
      position: note.position,
      weight: note.weight,
      sortOrder,
    }));
  });
}

/** Replaces product many-to-many relations. They are unreferenced join tables,
 * so delete-and-recreate retains no state and is safer than diffing. */
export async function syncRelationships(
  tx: Prisma.TransactionClient,
  productId: string,
  values: ProductFormValues,
) {
  await tx.productNote.deleteMany({ where: { productId } });
  await tx.productAccord.deleteMany({ where: { productId } });
  await tx.productPerfumer.deleteMany({ where: { productId } });

  if (values.notes.length) {
    await tx.productNote.createMany({
      data: buildNoteRows(productId, values.notes),
      skipDuplicates: true,
    });
  }

  if (values.accords.length) {
    // sortOrder follows the form's array order, matching syncVariants and
    // syncImages below.
    await tx.productAccord.createMany({
      data: values.accords.map((accord, sortOrder) => ({
        productId,
        accordId: accord.accordId,
        strength: accord.strength,
        sortOrder,
      })),
      skipDuplicates: true,
    });
  }

  if (values.perfumerIds.length) {
    await tx.productPerfumer.createMany({
      data: values.perfumerIds.map((perfumerId) => ({ productId, perfumerId })),
      skipDuplicates: true,
    });
  }
}

/**
 * Variants are diffed instead of replaced because `OrderItem` points to
 * `variantId`. Deleting one would set that relation to null and break links
 * from existing orders.
 */
export async function syncVariants(
  tx: Prisma.TransactionClient,
  productId: string,
  values: ProductFormValues,
) {
  const existingVariants = await tx.productVariant.findMany({
    where: { productId },
    select: { id: true },
  });
  const retainedVariantIds = new Set(
    values.variants
      .map((variant) => variant.id)
      .filter((id): id is string => id !== null),
  );
  const variantIdsToDelete = existingVariants
    .filter((variant) => !retainedVariantIds.has(variant.id))
    .map((variant) => variant.id);
  if (variantIdsToDelete.length) {
    await tx.productVariant.deleteMany({
      where: { id: { in: variantIdsToDelete }, productId },
    });
  }

  for (const [sortOrder, variant] of values.variants.entries()) {
    const variantData = {
      kind: variant.kind,
      sizeMl: variant.sizeMl,
      priceArs: variant.priceArs,
      isActive: variant.isActive,
      sku: variant.sku,
      sortOrder,
    };
    if (variant.id) {
      // `productId` prevents a variant ID from another product from updating here.
      await tx.productVariant.updateMany({
        where: { id: variant.id, productId },
        data: variantData,
      });
    } else {
      await tx.productVariant.create({ data: { productId, ...variantData } });
    }
  }
}

/** Returns storage keys from deleted rows so the caller can decide outside the
 * transaction whether they can also be deleted from R2. */
export async function syncImages(
  tx: Prisma.TransactionClient,
  productId: string,
  values: ProductFormValues,
): Promise<string[]> {
  const existingImages = await tx.productImage.findMany({
    where: { productId },
    select: { id: true, storageKey: true },
  });
  const retainedImageIds = new Set(
    values.images
      .map((image) => image.id)
      .filter((id): id is string => id !== null),
  );
  const imagesToDelete = existingImages.filter(
    (image) => !retainedImageIds.has(image.id),
  );
  if (imagesToDelete.length) {
    await tx.productImage.deleteMany({
      where: { id: { in: imagesToDelete.map((image) => image.id) }, productId },
    });
  }

  for (const [sortOrder, image] of values.images.entries()) {
    const imageData = {
      storageKey: image.storageKey,
      alt: image.alt,
      isPrimary: image.isPrimary,
      sortOrder,
    };
    if (image.id) {
      await tx.productImage.updateMany({
        where: { id: image.id, productId },
        data: imageData,
      });
    } else {
      await tx.productImage.create({ data: { productId, ...imageData } });
    }
  }

  return imagesToDelete.map((image) => image.storageKey);
}
