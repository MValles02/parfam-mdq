"use server";

import { revalidatePath, revalidateTag } from "next/cache";
import { z } from "zod";
import type { Prisma } from "@/generated/prisma/client";
import { ProductStatus } from "@/generated/prisma/enums";
import { requireAdmin } from "@/lib/admin/guard";
import { findAvailableSlug, toSlug } from "@/lib/admin/slug";
import { prisma } from "@/lib/db";
import {
  searchReferences,
  getReferenceForAdoption,
  type AdoptableReference,
  type ReferenceSearchResult,
} from "@/lib/admin/references";
import { actionFailure, type ActionResult } from "@/lib/admin/action-result";
import { formatProperName } from "@/lib/catalog";
import { deleteR2Object, isR2Configured } from "@/lib/r2";
import { TAG_SIMILAR_PRODUCTS, TAG_SITEMAP_URLS } from "@/lib/store/queries";
import { fieldErrors } from "@/lib/validations/errors";
import {
  productSchema,
  type ProductFormValues,
} from "@/lib/validations/product";

/**
 * Every action in this file begins with `requireAdmin()`. A Server Action is a
 * public POST endpoint, so the /admin layout does not protect it.
 */

/**
 * Invalidates public pages that depend on the catalog.
 *
 * Store routes do not read `searchParams` in every segment, so Next keeps them
 * in the route cache. Without this, a product published from the admin panel
 * remains invisible until the next deployment. `/producto` and `/marca` are
 * invalidated as pages to retain their shared layouts.
 *
 * The sitemap uses tagged `unstable_cache` rather than the route cache, so it
 * needs `revalidateTag` instead of `revalidatePath` (F-04 in
 * `docs/findings.md`). The `"max"` profile permits a short stale response
 * while the sitemap is recomputed in the background.
 *
 * The "Se parece a" ranking (`src/lib/store/similarity.ts`) is precomputed
 * the same way, over every published product's accords, notes, profile,
 * collection, and perfumers, so any product change can shift another
 * product's ranking, not just this one's. `TAG_SIMILAR_PRODUCTS` covers that
 * with the same tagged `unstable_cache` and "max" profile; the individual
 * `/producto/[slug]` revalidation above still only targets this product's own
 * page, matching the sitemap's existing tradeoff of not walking every product
 * that could reference this one.
 */
function revalidateStore(slug?: string, brandSlug?: string) {
  revalidatePath("/");
  revalidatePath("/catalogo");
  revalidateTag(TAG_SITEMAP_URLS, "max");
  revalidateTag(TAG_SIMILAR_PRODUCTS, "max");
  if (slug) revalidatePath(`/producto/${slug}`, "page");
  if (brandSlug) revalidatePath(`/marca/${brandSlug}`, "page");
}

/**
 * Deletes R2 keys no longer referenced by a `ProductImage` row.
 *
 * `duplicateProduct` intentionally shares `storageKey` values with the source
 * product. A key leaves the bucket only after its final database reference is
 * gone. This runs after the deletion transaction commits because references
 * still exist while that transaction is in progress.
 *
 * This is intentionally best effort. If the R2 deletion fails, the object can
 * remain orphaned (F-06 in `docs/findings.md`), while the requested database
 * update has already been committed.
 */
async function deleteOrphanedImages(storageKeys: string[]) {
  const uniqueStorageKeys = [...new Set(storageKeys)];
  if (uniqueStorageKeys.length === 0 || !isR2Configured()) return;

  const referencedImages = await prisma.productImage.findMany({
    where: { storageKey: { in: uniqueStorageKeys } },
    select: { storageKey: true },
    distinct: ["storageKey"],
  });
  const referencedStorageKeys = new Set(
    referencedImages.map((image) => image.storageKey),
  );

  await Promise.all(
    uniqueStorageKeys
      .filter((storageKey) => !referencedStorageKeys.has(storageKey))
      .map((storageKey) =>
        deleteR2Object(storageKey).catch((error: unknown) => {
          console.error(`Could not delete R2 object "${storageKey}":`, error);
        }),
      ),
  );
}

// ---------------------------------------------------------------------------
// Reference search
// ---------------------------------------------------------------------------

export async function searchReferencesAction(
  query: string,
): Promise<ActionResult<ReferenceSearchResult[]>> {
  await requireAdmin();
  const q = z.string().max(120).catch("").parse(query);
  return { ok: true, data: await searchReferences(q) };
}

export async function adoptReferenceAction(
  id: string,
): Promise<ActionResult<AdoptableReference>> {
  await requireAdmin();
  const ref = await getReferenceForAdoption(id);
  if (!ref)
    return actionFailure(
      "Esa fragancia ya no está en el catálogo de referencia.",
    );
  return { ok: true, data: ref };
}

// ---------------------------------------------------------------------------
// Autocomplete vocabularies: notes, perfumers, and brands.
// ---------------------------------------------------------------------------

export async function searchNotesAction(
  query: string,
): Promise<ActionResult<{ id: string; name: string }[]>> {
  await requireAdmin();
  const q = query.trim();
  const notes = await prisma.note.findMany({
    where: q
      ? {
          OR: [
            { nameEs: { contains: q, mode: "insensitive" } },
            { nameEn: { contains: q, mode: "insensitive" } },
          ],
        }
      : undefined,
    // Most-used entries come first. Alphabetical order would bury common notes
    // among 1,882 rare ingredients.
    orderBy: [{ usageCount: "desc" }, { nameEn: "asc" }],
    take: 20,
    select: { id: true, nameEs: true },
  });
  return {
    ok: true,
    data: notes.map((note) => ({ id: note.id, name: note.nameEs })),
  };
}

export async function createNoteAction(
  name: string,
): Promise<ActionResult<{ id: string; name: string }>> {
  await requireAdmin();
  const parsedName = z.string().trim().min(2).max(80).safeParse(name);
  if (!parsedName.success)
    return actionFailure("El nombre de la nota es muy corto.");

  const cleanName = parsedName.data;
  const slug = toSlug(cleanName);
  if (!slug) return actionFailure("Ese nombre no sirve como nota.");

  // Admin-created notes use Spanish. Keeping nameEn equal preserves the
  // fallback without leaving the field empty, and family reuses the slug
  // because a manually created note has no dataset family of its own.
  const note = await prisma.note.upsert({
    where: { slug },
    create: { slug, nameEn: cleanName, nameEs: cleanName, family: slug },
    update: {},
    select: { id: true, nameEs: true },
  });
  return { ok: true, data: { id: note.id, name: note.nameEs } };
}

export async function searchPerfumersAction(
  query: string,
): Promise<ActionResult<{ id: string; name: string }[]>> {
  await requireAdmin();
  const q = query.trim();
  // Filter in the database now that the table holds about 3,000 rows: a full
  // table scan followed by JS filtering would no longer be cheap.
  const perfumers = await prisma.perfumer.findMany({
    where: q ? { name: { contains: q, mode: "insensitive" } } : undefined,
    orderBy: { name: "asc" },
    take: 200,
    select: { id: true, name: true },
  });
  // Sort in JavaScript because imported `Perfumer.name` casing is inconsistent
  // (F-21 in docs/findings.md), which prevents PostgreSQL sorting from being
  // truly alphabetical.
  const data = perfumers
    .map((perfumer) => ({
      id: perfumer.id,
      name: formatProperName(perfumer.name),
    }))
    .sort((a, b) => a.name.localeCompare(b.name, "es-AR"))
    .slice(0, 20);
  return { ok: true, data };
}

export async function createPerfumerAction(
  name: string,
): Promise<ActionResult<{ id: string; name: string }>> {
  await requireAdmin();
  const parsedName = z.string().trim().min(2).max(120).safeParse(name);
  if (!parsedName.success)
    return actionFailure("El nombre del perfumista es muy corto.");

  const cleanName = parsedName.data;
  const slug = toSlug(cleanName);
  if (!slug) return actionFailure("Ese nombre no sirve como perfumista.");

  const perfumer = await prisma.perfumer.upsert({
    where: { slug },
    create: { slug, name: cleanName },
    update: {},
    select: { id: true, name: true },
  });
  return { ok: true, data: { id: perfumer.id, name: perfumer.name } };
}

export async function searchBrandsAction(
  query: string,
): Promise<ActionResult<{ id: string; name: string }[]>> {
  await requireAdmin();
  const q = query.trim();
  const brands = await prisma.brand.findMany({
    where: q ? { name: { contains: q, mode: "insensitive" } } : undefined,
    orderBy: { name: "asc" },
    take: 20,
    select: { id: true, name: true },
  });
  return {
    ok: true,
    data: brands.map((brand) => ({ id: brand.id, name: brand.name })),
  };
}

// Persistence

/** Resolves `brandId` when it still exists, otherwise finds or creates a brand
 * from the `brandName` slug. */
async function resolveBrand(
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

/** Replaces product many-to-many relations. They are unreferenced join tables,
 * so delete-and-recreate retains no state and is safer than diffing. */
async function syncRelationships(
  tx: Prisma.TransactionClient,
  productId: string,
  values: ProductFormValues,
) {
  await tx.productNote.deleteMany({ where: { productId } });
  await tx.productAccord.deleteMany({ where: { productId } });
  await tx.productPerfumer.deleteMany({ where: { productId } });

  if (values.notes.length) {
    // Canonical order, shared with `getProductForEdit`
    // (`src/lib/admin/products.ts`) and `getProductBySlug`
    // (`src/lib/store/queries.ts`): within each pyramid level, or the flat
    // list, strongest weight first. The map key is the position string
    // ("TOP"/"MIDDLE"/"BASE") or "" for a flat list. Ties keep the form's
    // original order, which `Array.prototype.sort` preserves because it is
    // stable, so `sortOrder` becomes a meaningful tiebreak the next time
    // these rows are read back.
    const groups = new Map<
      string,
      { note: (typeof values.notes)[number]; formIndex: number }[]
    >();
    values.notes.forEach((note, formIndex) => {
      const key = note.position ?? "";
      const group = groups.get(key);
      if (group) group.push({ note, formIndex });
      else groups.set(key, [{ note, formIndex }]);
    });

    const noteRows = [...groups.values()].flatMap((group) => {
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
    await tx.productNote.createMany({ data: noteRows, skipDuplicates: true });
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
async function syncVariants(
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
async function syncImages(
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

export async function saveProduct(
  id: string | null,
  input: unknown,
): Promise<ActionResult<{ id: string; slug: string }>> {
  await requireAdmin();

  const parsedInput = productSchema.safeParse(input);
  if (!parsedInput.success) {
    return actionFailure(
      "Revisá los campos marcados.",
      fieldErrors(parsedInput.error),
    );
  }
  const values = parsedInput.data;

  // Client IDs are data rather than authority. Existing rows must be verified
  // before `createMany` could produce an unreadable foreign-key error.
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
    return actionFailure("Alguna de las notas ya no existe.");
  if (
    accordCount !==
    new Set(values.accords.map((accord) => accord.accordId)).size
  )
    return actionFailure("Alguno de los acordes ya no existe.");
  if (perfumerCount !== new Set(values.perfumerIds).size)
    return actionFailure("Alguno de los perfumistas ya no existe.");
  if (values.fragranceRefId && !fragranceRef)
    return actionFailure("La fragancia de referencia ya no existe.");

  // `communityVotes` is never client-submitted (see the removed field on
  // `productSchema` in `src/lib/validations/product.ts`): it is copied here
  // from `FragranceRef.communityVotes` for the adopted reference, or null
  // when the product has none.
  const communityVotes = fragranceRef ? fragranceRef.communityVotes : null;

  const result = await prisma.$transaction(async (tx) => {
    const brandId = await resolveBrand(tx, values);
    const slug = await findAvailableSlug(
      tx,
      values.slug ?? `${values.brandName} ${values.name}`,
      id,
    );

    const productData = {
      name: values.name,
      brandId,
      fragranceRefId: values.fragranceRefId,
      sourceUrl: values.sourceUrl,
      description: values.description,
      gender: values.gender,
      concentration: values.concentration,
      year: values.year,
      collection: values.collection,
      longevity: values.longevity,
      sillage: values.sillage,
      intensity: values.intensity,
      seasonSpring: values.seasonSpring,
      seasonSummer: values.seasonSummer,
      seasonFall: values.seasonFall,
      seasonWinter: values.seasonWinter,
      daypartDay: values.daypartDay,
      daypartNight: values.daypartNight,
      communityVotes,
      status: values.status,
      isFeatured: values.isFeatured,
      seoTitle: values.seoTitle,
      seoDescription: values.seoDescription,
    };

    const product = id
      ? await tx.product.update({
          where: { id },
          data: { ...productData, slug },
          select: { id: true, slug: true, brand: { select: { slug: true } } },
        })
      : await tx.product.create({
          data: { ...productData, slug },
          select: { id: true, slug: true, brand: { select: { slug: true } } },
        });

    await syncRelationships(tx, product.id, values);
    await syncVariants(tx, product.id, values);
    const deletedImageKeys = await syncImages(tx, product.id, values);

    return { product, deletedImageKeys };
  });

  // This runs after commit. During the transaction, the deleted rows would
  // still make every key appear referenced.
  await deleteOrphanedImages(result.deletedImageKeys);

  revalidatePath("/admin/productos");
  revalidatePath(`/admin/productos/${result.product.id}`);
  revalidateStore(result.product.slug, result.product.brand.slug);
  return { ok: true, data: result.product };
}

// ---------------------------------------------------------------------------
// Table actions
// ---------------------------------------------------------------------------

export async function changeProductStatus(
  id: string,
  shouldPublish: boolean,
): Promise<ActionResult> {
  await requireAdmin();

  if (shouldPublish) {
    // Apply the same rule as the form: customers must be able to buy a
    // published product. The table is another path to the same state change.
    const product = await prisma.product.findUnique({
      where: { id },
      select: {
        description: true,
        variants: { where: { isActive: true }, select: { id: true } },
      },
    });
    if (!product) return actionFailure("Ese producto ya no existe.");
    if (product.variants.length === 0) {
      return actionFailure(
        "No tiene ninguna presentación activa: no se puede publicar.",
      );
    }
    if (!product.description) {
      return actionFailure("Le falta la descripción: no se puede publicar.");
    }
  }

  const updatedProduct = await prisma.product.update({
    where: { id },
    data: {
      status: shouldPublish ? ProductStatus.PUBLISHED : ProductStatus.DRAFT,
    },
    select: { slug: true, brand: { select: { slug: true } } },
  });
  revalidatePath("/admin/productos");
  revalidateStore(updatedProduct.slug, updatedProduct.brand.slug);
  return { ok: true };
}

export async function duplicateProduct(
  id: string,
): Promise<ActionResult<{ id: string }>> {
  await requireAdmin();

  const original = await prisma.product.findUnique({
    where: { id },
    include: {
      notes: true,
      accords: true,
      perfumers: true,
      variants: true,
      images: true,
    },
  });
  if (!original) return actionFailure("Ese producto ya no existe.");

  const copy = await prisma.$transaction(async (tx) => {
    const name = `${original.name} (copia)`;
    // Copies start as drafts because duplication usually precedes editing and
    // must not expose an incomplete product in the store.
    return tx.product.create({
      data: {
        slug: await findAvailableSlug(tx, name, null),
        name,
        brandId: original.brandId,
        fragranceRefId: original.fragranceRefId,
        sourceUrl: original.sourceUrl,
        description: original.description,
        gender: original.gender,
        concentration: original.concentration,
        year: original.year,
        collection: original.collection,
        longevity: original.longevity,
        sillage: original.sillage,
        intensity: original.intensity,
        seasonSpring: original.seasonSpring,
        seasonSummer: original.seasonSummer,
        seasonFall: original.seasonFall,
        seasonWinter: original.seasonWinter,
        daypartDay: original.daypartDay,
        daypartNight: original.daypartNight,
        communityVotes: original.communityVotes,
        status: ProductStatus.DRAFT,
        isFeatured: false,
        seoTitle: original.seoTitle,
        seoDescription: original.seoDescription,
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
  });

  revalidatePath("/admin/productos");
  // The copy is a DRAFT with no public page yet, so only the sitemap and
  // "Se parece a" caches need invalidating; no slug or brandSlug to pass.
  revalidateStore();
  return { ok: true, data: copy };
}

export async function deleteProduct(id: string): Promise<ActionResult> {
  await requireAdmin();

  // Find before writing so stale tabs and double clicks receive the product
  // message instead of Next's generic Prisma P2025 Server Action error.
  const product = await prisma.product.findUnique({
    where: { id },
    select: { images: { select: { storageKey: true } } },
  });
  if (!product) return actionFailure("Ese producto ya no existe.");

  // Product relationships cascade. OrderItem's SetNull relation preserves
  // historical name and price snapshots.
  const deletedProduct = await prisma.product.delete({
    where: { id },
    select: { slug: true, brand: { select: { slug: true } } },
  });

  // Run after deletion, otherwise this product's own rows still count as use.
  await deleteOrphanedImages(product.images.map((image) => image.storageKey));

  revalidatePath("/admin/productos");
  revalidateStore(deletedProduct.slug, deletedProduct.brand.slug);
  return { ok: true };
}
