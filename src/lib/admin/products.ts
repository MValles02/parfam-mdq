import type { Prisma } from "@/generated/prisma/client";
import { ProductStatus } from "@/generated/prisma/enums";
import { formatProperName } from "@/lib/catalog";
import { prisma } from "@/lib/db";
import { getPublicUrl } from "@/lib/r2";

export type ProductStatusFilter = "todos" | "publicados" | "borradores";

const STATUS_TO_WHERE: Record<ProductStatusFilter, ProductStatus | undefined> =
  {
    todos: undefined,
    publicados: ProductStatus.PUBLISHED,
    borradores: ProductStatus.DRAFT,
  };

function buildSearchWhere(query: string): Prisma.ProductWhereInput {
  const term = query.trim();
  if (!term) return {};
  // The store catalog contains tens of rows, not 70k reference entries. A
  // case-insensitive contains query is sufficient and avoids the trgm index.
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
    status: STATUS_TO_WHERE[status],
  };

  const [products, published, total] = await Promise.all([
    prisma.product.findMany({
      where,
      orderBy: [{ updatedAt: "desc" }],
      select: {
        id: true,
        slug: true,
        name: true,
        status: true,
        updatedAt: true,
        brand: { select: { name: true } },
        images: {
          where: { isPrimary: true },
          take: 1,
          select: { storageKey: true, alt: true },
        },
        variants: {
          select: { priceArs: true, isActive: true },
        },
      },
    }),
    prisma.product.count({ where: { status: ProductStatus.PUBLISHED } }),
    prisma.product.count(),
  ]);

  const rows = products.map((product) => {
    const activeVariants = product.variants.filter(
      (variant) => variant.isActive,
    );
    // The starting price must reflect what the customer can buy today, so it
    // considers active variants only.
    const startingPrice = activeVariants.reduce<string | null>(
      (minimum, variant) => {
        const price = variant.priceArs.toString();
        return minimum === null || Number(price) < Number(minimum)
          ? price
          : minimum;
      },
      null,
    );

    return {
      id: product.id,
      slug: product.slug,
      name: product.name,
      brandName: product.brand.name,
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
      activeVariantCount: activeVariants.length,
      startingPrice,
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
      brand: { select: { id: true, name: true } },
      fragranceRefId: true,
      fragranceRef: { select: { name: true, url: true } },
      sourceUrl: true,
      description: true,
      gender: true,
      concentration: true,
      year: true,
      seasons: true,
      occasions: true,
      longevity: true,
      sillage: true,
      intensity: true,
      status: true,
      isFeatured: true,
      seoTitle: true,
      seoDescription: true,
      // The edit page uses this as the form key. It changes after each save
      // and remounts the form with persisted IDs.
      updatedAt: true,
      notes: {
        orderBy: { sortOrder: "asc" },
        select: {
          position: true,
          note: { select: { id: true, nameEn: true, nameEs: true } },
        },
      },
      accords: {
        orderBy: { sortOrder: "asc" },
        select: {
          accord: { select: { id: true, nameEs: true, color: true } },
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
    // Decimal is not serializable to a Client Component. Send it as a string,
    // which is also what the form expects.
    variants: product.variants.map((v) => ({
      ...v,
      priceArs: v.priceArs.toString(),
    })),
    // Imported `Perfumer.name` casing is inconsistent (F-21 in
    // docs/findings.md), so normalize it for display as the store query and
    // getReferenceForAdoption do.
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
