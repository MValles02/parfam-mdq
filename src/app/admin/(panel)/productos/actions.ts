"use server";

import { revalidatePath, revalidateTag } from "next/cache";
import { z } from "zod";
import { ProductStatus, VariantKind } from "@/generated/prisma/enums";
import { requireAdmin } from "@/lib/admin/guard";
import {
  findProductsByFragranceRefIds,
  type ExistingProduct,
} from "@/lib/admin/products";
import { prisma } from "@/lib/db";
import { toSlug } from "@/lib/slug";
import {
  searchReferences,
  getReferenceForAdoption,
  type AdoptableReference,
  type ReferenceSearchResult,
} from "@/lib/admin/references";
import { actionFailure, type ActionResult } from "@/lib/admin/action-result";
import { formatProperName } from "@/lib/catalog";
import { SITE_LOCALE } from "@/lib/site";
import { deleteR2Object, isR2Configured } from "@/lib/r2";
import { getProductPath } from "@/lib/store/links";
import { TAG_SIMILAR_PRODUCTS, TAG_SITEMAP_URLS } from "@/lib/store/queries";
import { fieldErrors } from "@/lib/validations/errors";
import {
  productSchema,
  variantActiveSchema,
  variantPriceSchema,
} from "@/lib/validations/product";
import { ADMIN_PRODUCTS_PATH, getAdminProductPath } from "./paths";
import {
  createProductCopy,
  PRODUCT_COPY_INCLUDE,
  verifyReferencedRows,
  writeProduct,
} from "./product-persistence";

/**
 * Every action in this file begins with `requireAdmin()`. A Server Action is a
 * public POST endpoint, so the /admin layout does not protect it.
 */

const PRODUCT_NOT_FOUND_MESSAGE = "Ese producto ya no existe.";

/** Suggestions returned by each autocomplete search (notes, perfumers, brands). */
const VOCABULARY_SEARCH_LIMIT = 20;

/**
 * Perfumers read before the JavaScript re-sort in `searchPerfumersAction`
 * trims them to `VOCABULARY_SEARCH_LIMIT`.
 */
const PERFUMER_CANDIDATE_LIMIT = 200;

/** Longest reference-catalog query accepted; longer input searches nothing. */
const REFERENCE_QUERY_MAX_LENGTH = 120;

/**
 * Invalidates public pages that depend on the catalog.
 *
 * Store routes do not read `searchParams` in every segment, so Next keeps them
 * in the route cache. Without this, a product published from the admin panel
 * remains invisible until the next deployment. `/producto` is
 * invalidated as a page to retain its shared layouts.
 *
 * The sitemap uses tagged `unstable_cache` rather than the route cache, so it
 * needs `revalidateTag` instead of `revalidatePath`. The `"max"` profile
 * permits a short stale response while the sitemap is recomputed in the
 * background.
 *
 * The "Se parece a" ranking (`src/lib/store/similarity.ts`) is precomputed
 * the same way, over every published product's accords, notes, profile,
 * collection, and perfumers, so any product change can shift another
 * product's ranking, not just this one's. `TAG_SIMILAR_PRODUCTS` covers that
 * with the same tagged `unstable_cache` and "max" profile; the individual
 * `/producto/[slug]` revalidation still only targets this product's own
 * page, matching the sitemap's existing tradeoff of not walking every product
 * that could reference this one.
 */
function revalidateStore(slug?: string) {
  revalidatePath("/");
  revalidateTag(TAG_SITEMAP_URLS, "max");
  revalidateTag(TAG_SIMILAR_PRODUCTS, "max");
  if (slug) revalidatePath(getProductPath(slug), "page");
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
 * remain orphaned, while the requested database update has already been
 * committed.
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
): Promise<
  ActionResult<
    (ReferenceSearchResult & { existingProducts: ExistingProduct[] })[]
  >
> {
  await requireAdmin();
  const q = z.string().max(REFERENCE_QUERY_MAX_LENGTH).catch("").parse(query);
  const results = await searchReferences(q);
  const existing = await findProductsByFragranceRefIds(
    results.map((result) => result.id),
  );
  return {
    ok: true,
    data: results.map((result) => ({
      ...result,
      existingProducts: existing.get(result.id) ?? [],
    })),
  };
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
    take: VOCABULARY_SEARCH_LIMIT,
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
    take: PERFUMER_CANDIDATE_LIMIT,
    select: { id: true, name: true },
  });
  // Sort in JavaScript because imported `Perfumer.name` casing is
  // inconsistent, which prevents PostgreSQL sorting from being truly
  // alphabetical; `formatProperName` normalizes it first.
  const data = perfumers
    .map((perfumer) => ({
      id: perfumer.id,
      name: formatProperName(perfumer.name),
    }))
    .sort((a, b) => a.name.localeCompare(b.name, SITE_LOCALE))
    .slice(0, VOCABULARY_SEARCH_LIMIT);
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
    take: VOCABULARY_SEARCH_LIMIT,
    select: { id: true, name: true },
  });
  return {
    ok: true,
    data: brands.map((brand) => ({ id: brand.id, name: brand.name })),
  };
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

  const referencedRows = await verifyReferencedRows(id, values);
  if (!referencedRows.ok) return actionFailure(referencedRows.message);

  const result = await prisma.$transaction((tx) =>
    writeProduct(tx, {
      id,
      values,
      communityVotes: referencedRows.communityVotes,
    }),
  );

  // This runs after commit. During the transaction, the deleted rows would
  // still make every key appear referenced.
  await deleteOrphanedImages(result.deletedImageKeys);

  revalidatePath(ADMIN_PRODUCTS_PATH);
  revalidatePath(getAdminProductPath(result.product.id));
  revalidateStore(result.product.slug);
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
        variants: {
          where: { isActive: true, kind: { not: VariantKind.TESTER } },
          select: { id: true },
        },
      },
    });
    if (!product) return actionFailure(PRODUCT_NOT_FOUND_MESSAGE);
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
    select: { slug: true },
  });
  revalidatePath(ADMIN_PRODUCTS_PATH);
  revalidateStore(updatedProduct.slug);
  return { ok: true };
}

const variantProductSelect = {
  productId: true,
  product: { select: { slug: true, status: true } },
} as const;

export async function updateVariantPrice(
  variantId: string,
  priceArs: string,
): Promise<ActionResult> {
  await requireAdmin();

  const parsed = variantPriceSchema.safeParse({ variantId, priceArs });
  if (!parsed.success) return actionFailure("Revisá el precio.");

  const variant = await prisma.productVariant.findUnique({
    where: { id: parsed.data.variantId },
    select: variantProductSelect,
  });
  if (!variant) return actionFailure("Esa presentación ya no existe.");

  await prisma.productVariant.update({
    where: { id: parsed.data.variantId },
    data: { priceArs: parsed.data.priceArs },
  });
  revalidatePath(ADMIN_PRODUCTS_PATH);
  revalidatePath(getAdminProductPath(variant.productId));
  revalidateStore(variant.product.slug);
  return { ok: true };
}

export async function setVariantActive(
  variantId: string,
  isActive: boolean,
): Promise<ActionResult> {
  await requireAdmin();

  const parsed = variantActiveSchema.safeParse({ variantId, isActive });
  if (!parsed.success) return actionFailure("Datos inválidos.");

  const variant = await prisma.productVariant.findUnique({
    where: { id: parsed.data.variantId },
    select: variantProductSelect,
  });
  if (!variant) return actionFailure("Esa presentación ya no existe.");

  // A published product must keep one purchasable variant, as in the form.
  // The check and the write share a transaction so they cannot interleave
  // with a concurrent deactivation of a sibling variant.
  const isLastActive = await prisma.$transaction(async (tx) => {
    if (
      !parsed.data.isActive &&
      variant.product.status === ProductStatus.PUBLISHED
    ) {
      const otherActive = await tx.productVariant.count({
        where: {
          productId: variant.productId,
          isActive: true,
          kind: { not: VariantKind.TESTER },
          id: { not: parsed.data.variantId },
        },
      });
      if (otherActive === 0) return true;
    }
    await tx.productVariant.update({
      where: { id: parsed.data.variantId },
      data: { isActive: parsed.data.isActive },
    });
    return false;
  });
  if (isLastActive) {
    return actionFailure(
      "Es la única presentación activa de un producto publicado: pasalo a borrador primero.",
    );
  }
  revalidatePath(ADMIN_PRODUCTS_PATH);
  revalidatePath(getAdminProductPath(variant.productId));
  revalidateStore(variant.product.slug);
  return { ok: true };
}

export async function duplicateProduct(
  id: string,
): Promise<ActionResult<{ id: string }>> {
  await requireAdmin();

  const original = await prisma.product.findUnique({
    where: { id },
    include: PRODUCT_COPY_INCLUDE,
  });
  if (!original) return actionFailure(PRODUCT_NOT_FOUND_MESSAGE);

  const copy = await prisma.$transaction((tx) =>
    createProductCopy(tx, original),
  );

  revalidatePath(ADMIN_PRODUCTS_PATH);
  // The copy is a DRAFT with no public page yet, so only the sitemap and
  // "Se parece a" caches need invalidating; there is no slug to pass.
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
  if (!product) return actionFailure(PRODUCT_NOT_FOUND_MESSAGE);

  // Product relationships cascade. OrderItem's SetNull relation preserves
  // historical name and price snapshots.
  const deletedProduct = await prisma.product.delete({
    where: { id },
    select: { slug: true },
  });

  // Run after deletion, otherwise this product's own rows still count as use.
  await deleteOrphanedImages(product.images.map((image) => image.storageKey));

  revalidatePath(ADMIN_PRODUCTS_PATH);
  revalidateStore(deletedProduct.slug);
  return { ok: true };
}
