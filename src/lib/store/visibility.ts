import type { Prisma } from "@/generated/prisma/client";
import { ProductStatus, VariantKind } from "@/generated/prisma/enums";

/**
 * Only active variants are sold, priced, or shown in the store. Testers are
 * retired, but legacy rows may still exist in the database, so every public
 * variant read excludes them explicitly.
 */
export const ACTIVE_VARIANT_WHERE = {
  isActive: true,
  kind: { not: VariantKind.TESTER },
} satisfies Prisma.ProductVariantWhereInput;

/**
 * The store's visibility rule, applied in the query rather than in any
 * component: a product is public only when it is published and has at least
 * one active variant (otherwise it has nothing to sell).
 */
export const PUBLIC_PRODUCT_WHERE = {
  status: ProductStatus.PUBLISHED,
  variants: { some: ACTIVE_VARIANT_WHERE },
} satisfies Prisma.ProductWhereInput;
