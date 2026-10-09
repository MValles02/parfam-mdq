import type { Prisma } from "@/generated/prisma/client";
import { ProductStatus, VariantKind } from "@/generated/prisma/enums";
import { prisma } from "@/lib/db";
import { getVariantLabel } from "@/lib/catalog";

/**
 * Database-backed cart validation. localStorage may contain deactivated
 * variants, unpublished products, deleted rows, or stale prices. The database
 * is the only source of current availability.
 *
 * Cart reconciliation calls `validateCartItems` through the Server Action
 * when /carrito or /checkout opens. createOrder calls `resolveCartLines`
 * again before its transaction and persists that database price in the
 * OrderItem snapshot.
 */

export type InvalidReason = "inactive" | "deleted" | "unpublished";

type RequestedLine = { variantId: string; qty: number };

type CurrentProductData = {
  productId: string;
  productName: string;
  brandName: string;
  variantLabel: string;
};

/** A requested line with its current database state; prices stay Decimal. */
export type ResolvedCartLine = RequestedLine &
  (
    | ({ ok: true; priceArs: Prisma.Decimal } & CurrentProductData)
    | { ok: false; reason: InvalidReason }
  );

/** Same as `ResolvedCartLine`, with the price serialized for the client. */
export type CartValidationItem = RequestedLine &
  (
    | ({ ok: true; priceArs: string } & CurrentProductData)
    | { ok: false; reason: InvalidReason }
  );

const CART_VARIANT_SELECT = {
  id: true,
  kind: true,
  sizeMl: true,
  priceArs: true,
  isActive: true,
  product: {
    select: {
      id: true,
      name: true,
      status: true,
      brand: { select: { name: true } },
    },
  },
} satisfies Prisma.ProductVariantSelect;

type CartVariant = Prisma.ProductVariantGetPayload<{
  select: typeof CART_VARIANT_SELECT;
}>;

/**
 * Only active variants of published products can sell. A missing variant is
 * `deleted`; an inactive one reports `inactive` even if its product is also
 * unpublished.
 */
function resolveLine(
  item: RequestedLine,
  variant: CartVariant | undefined,
): ResolvedCartLine {
  if (!variant) return { ...item, ok: false, reason: "deleted" };
  // Legacy testers may still exist in the database but are no longer sold.
  if (!variant.isActive || variant.kind === VariantKind.TESTER)
    return { ...item, ok: false, reason: "inactive" };
  if (variant.product.status !== ProductStatus.PUBLISHED)
    return { ...item, ok: false, reason: "unpublished" };
  return {
    ...item,
    ok: true,
    productId: variant.product.id,
    productName: variant.product.name,
    brandName: variant.product.brand.name,
    variantLabel: getVariantLabel(variant.kind, variant.sizeMl),
    priceArs: variant.priceArs,
  };
}

/**
 * Retrieves the current state of every requested variant in one query and
 * returns one result per requested line, in request order.
 */
export async function resolveCartLines(
  items: RequestedLine[],
): Promise<ResolvedCartLine[]> {
  if (items.length === 0) return [];

  const variants = await prisma.productVariant.findMany({
    where: { id: { in: items.map((i) => i.variantId) } },
    select: CART_VARIANT_SELECT,
  });
  const variantsById = new Map(
    variants.map((variant) => [variant.id, variant]),
  );

  return items.map((item) =>
    resolveLine(item, variantsById.get(item.variantId)),
  );
}

/** `resolveCartLines` with Decimal prices converted for Client Components. */
export async function validateCartItems(
  items: RequestedLine[],
): Promise<CartValidationItem[]> {
  const lines = await resolveCartLines(items);
  return lines.map((line) =>
    line.ok ? { ...line, priceArs: line.priceArs.toString() } : line,
  );
}
