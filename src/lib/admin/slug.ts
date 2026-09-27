import type { Prisma } from "@/generated/prisma/client";
import { toSlug } from "@/lib/slug";

/**
 * Returns an available slug, appending -2, -3, and so on when needed.
 *
 * `excludedProductId` is the product being edited. Without it, saving an
 * unchanged name would collide with itself and add a suffix on every save.
 */
export async function findAvailableSlug(
  transaction: Prisma.TransactionClient,
  baseSlug: string,
  excludedProductId: string | null,
) {
  const root = toSlug(baseSlug) || "product";
  for (let attempt = 0; ; attempt++) {
    const candidate = attempt === 0 ? root : `${root}-${attempt + 1}`;
    const collision = await transaction.product.findFirst({
      where: {
        slug: candidate,
        id: excludedProductId ? { not: excludedProductId } : undefined,
      },
      select: { id: true },
    });
    if (!collision) return candidate;
  }
}
