import { ProductStatus, VariantKind } from "@/generated/prisma/enums";
import { prisma } from "@/lib/db";
import { getVariantLabel } from "@/lib/catalog";

/**
 * Database-backed cart validation. localStorage may contain deactivated
 * variants, unpublished products, deleted rows, or stale prices. The database
 * is the only source of current availability.
 *
 * Cart reconciliation calls this through the Server Action when /carrito or
 * /checkout opens. createOrder queries ProductVariant again before its
 * transaction and persists that database price in the OrderItem snapshot.
 */

export type InvalidReason = "inactive" | "deleted" | "unpublished";

export type CartValidationItem = {
  variantId: string;
  qty: number;
} & (
  | {
      ok: true;
      productId: string;
      productName: string;
      brandName: string;
      variantLabel: string;
      priceArs: string;
    }
  | { ok: false; reason: InvalidReason }
);

/**
 * Retrieves the current state of every requested variant in one query.
 */
export async function validateCartItems(
  items: { variantId: string; qty: number }[],
): Promise<CartValidationItem[]> {
  if (items.length === 0) return [];

  const variants = await prisma.productVariant.findMany({
    where: { id: { in: items.map((i) => i.variantId) } },
    select: {
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
    },
  });
  const variantsById = new Map(
    variants.map((variant) => [variant.id, variant]),
  );

  return items.map((item) => {
    const variant = variantsById.get(item.variantId);
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
      priceArs: variant.priceArs.toString(),
    };
  });
}
