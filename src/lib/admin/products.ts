import type { Prisma } from "@/generated/prisma/client";
import { ProductStatus } from "@/generated/prisma/enums";
import { formatProperName, getStartingPrice } from "@/lib/catalog";
import { getFragranticaPerfumeUrl } from "@/lib/admin/references";
import { prisma } from "@/lib/db";
import { getPublicUrl } from "@/lib/r2";

export type ProductStatusFilter = "todos" | "publicados" | "borradores";

const PRODUCT_STATUS_BY_FILTER: Record<
  ProductStatusFilter,
  ProductStatus | undefined
> = {
  todos: undefined,
  publicados: ProductStatus.PUBLISHED,
  borradores: ProductStatus.DRAFT,
};

function buildSearchWhere(query: string): Prisma.ProductWhereInput {
  const term = query.trim();
  if (!term) return {};
  // The store catalog contains tens of rows, unlike the ~140k-row reference
  // catalog. A case-insensitive contains query is sufficient and avoids the
  // trgm index.
  return {
    OR: [
      { name: { contains: term, mode: "insensitive" } },
      { brand: { name: { contains: term, mode: "insensitive" } } },
    ],
  };
}

/**
 * Rows for /admin/productos, including the primary image, variant count, and
 * lowest price among active variants.
 */
export async function listProducts(options: {
  query?: string;
  status?: ProductStatusFilter;
}) {
  const query = options.query ?? "";
  const status = options.status ?? "todos";
  const where: Prisma.ProductWhereInput = {
    ...buildSearchWhere(query),
    status: PRODUCT_STATUS_BY_FILTER[status],
  };

  const [products, published, total] = await Promise.all([
    prisma.product.findMany({
      where,
      orderBy: [{ updatedAt: "desc" }],
      select: {
        id: true,
        name: true,
        status: true,
        concentration: true,
        description: true,
        updatedAt: true,
        brand: { select: { name: true } },
        images: {
          where: { isPrimary: true },
          take: 1,
          select: { storageKey: true, alt: true },
        },
        variants: {
          orderBy: { sortOrder: "asc" },
          select: {
            id: true,
            priceArs: true,
            isActive: true,
            kind: true,
            sizeMl: true,
          },
        },
      },
    }),
    prisma.product.count({ where: { status: ProductStatus.PUBLISHED } }),
    prisma.product.count(),
  ]);

  const rows = products.map((product) => {
    const activeVariantCount = product.variants.filter(
      (variant) => variant.isActive,
    ).length;
    const startingPrice = getStartingPrice(product.variants);

    return {
      id: product.id,
      name: product.name,
      brandName: product.brand.name,
      concentration: product.concentration,
      status: product.status,
      updatedAt: product.updatedAt,
      // Build the URL from the key here so components do not need to know the
      // public host.
      image: product.images[0]
        ? {
            url: getPublicUrl(product.images[0].storageKey),
            alt: product.images[0].alt,
          }
        : null,
      variantCount: product.variants.length,
      activeVariantCount,
      startingPrice,
      variants: product.variants.map(
        ({ id, kind, sizeMl, isActive, priceArs }) => ({
          id,
          kind,
          sizeMl,
          isActive,
          // Decimal is not serializable to Client Components.
          priceArs: priceArs.toString(),
        }),
      ),
      hasPrimaryImage: product.images.length > 0,
      hasDescription: Boolean(product.description?.trim()),
    };
  });

  return {
    rows,
    published,
    drafts: total - published,
    total,
  };
}

export type ProductRow = Awaited<
  ReturnType<typeof listProducts>
>["rows"][number];

/** Complete product data used to prepopulate the edit form. */
export async function getProductForEdit(id: string) {
  const product = await prisma.product.findUnique({
    where: { id },
    select: {
      id: true,
      slug: true,
      name: true,
      brandId: true,
      brand: { select: { name: true } },
      fragranceRefId: true,
      fragranceRef: { select: { name: true, slug: true, pid: true } },
      sourceUrl: true,
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
      communityVotes: true,
      status: true,
      isFeatured: true,
      seoTitle: true,
      seoDescription: true,
      // The edit page uses this as the form key. It changes after each save
      // and remounts the form with persisted IDs.
      updatedAt: true,
      notes: {
        // Same ordering as `getReferenceForAdoption`'s adoption payload, so
        // the form receives a pyramid in the same shape either way.
        orderBy: [
          { position: "asc" },
          { weight: "desc" },
          { sortOrder: "asc" },
        ],
        select: {
          position: true,
          weight: true,
          note: { select: { id: true, nameEs: true } },
        },
      },
      accords: {
        orderBy: { sortOrder: "asc" },
        select: {
          strength: true,
          accord: { select: { id: true } },
        },
      },
      perfumers: {
        select: { perfumer: { select: { id: true, name: true } } },
      },
      variants: {
        orderBy: { sortOrder: "asc" },
        select: {
          id: true,
          kind: true,
          sizeMl: true,
          priceArs: true,
          isActive: true,
          sku: true,
        },
      },
      images: {
        orderBy: { sortOrder: "asc" },
        select: { id: true, storageKey: true, alt: true, isPrimary: true },
      },
    },
  });
  if (!product) return null;

  return {
    ...product,
    // Same panel-only link as `getReferenceForAdoption`'s `referenceUrl`.
    fragranceRef: product.fragranceRef
      ? {
          name: product.fragranceRef.name,
          referenceUrl: getFragranticaPerfumeUrl(
            product.fragranceRef.slug,
            product.fragranceRef.pid,
          ),
        }
      : null,
    // Decimal is not Client Component serializable. `longevity` and
    // `sillage` become plain numbers, matching the form's schema
    // (`src/lib/validations/product.ts`), while prices become the strings the
    // form expects because they must never go through float arithmetic.
    longevity: product.longevity === null ? null : Number(product.longevity),
    sillage: product.sillage === null ? null : Number(product.sillage),
    variants: product.variants.map((v) => ({
      ...v,
      priceArs: v.priceArs.toString(),
    })),
    // Imported `Perfumer.name` casing is inconsistent, so normalize it for
    // display as the store query and getReferenceForAdoption do.
    perfumers: product.perfumers.map((x) => ({
      perfumer: { ...x.perfumer, name: formatProperName(x.perfumer.name) },
    })),
  };
}

export type EditableProduct = NonNullable<
  Awaited<ReturnType<typeof getProductForEdit>>
>;

/** All 93 accords with their color, used by the form selector. */
export function listAccords() {
  return prisma.accord.findMany({
    orderBy: { nameEs: "asc" },
    select: { id: true, nameEs: true, nameEn: true, color: true },
  });
}

export type ExistingProduct = { id: string; name: string };

/**
 * Store products already linked to the given reference ids. `fragranceRefId`
 * is indexed but not unique, so one reference can map to several products.
 */
export async function findProductsByFragranceRefIds(ids: string[]) {
  if (ids.length === 0) return new Map<string, ExistingProduct[]>();
  const products = await prisma.product.findMany({
    where: { fragranceRefId: { in: ids } },
    select: { id: true, name: true, fragranceRefId: true },
  });
  const byRef = new Map<string, ExistingProduct[]>();
  for (const { id, name, fragranceRefId } of products) {
    if (!fragranceRefId) continue;
    byRef.set(fragranceRefId, [
      ...(byRef.get(fragranceRefId) ?? []),
      { id, name },
    ]);
  }
  return byRef;
}
