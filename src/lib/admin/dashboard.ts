import { prisma } from "@/lib/db";

/** The three metrics displayed by the `/admin` dashboard. */
export async function getDashboardStats() {
  const [publishedProducts, draftProducts, pendingOrders, fragranceReferences] =
    await Promise.all([
      prisma.product.count({ where: { status: "PUBLISHED" } }),
      prisma.product.count({ where: { status: "DRAFT" } }),
      prisma.order.count({ where: { status: "PENDING" } }),
      prisma.fragranceRef.count(),
    ]);

  return {
    publishedProducts,
    draftProducts,
    pendingOrders,
    fragranceReferences,
  };
}
