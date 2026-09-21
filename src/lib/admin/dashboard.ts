import { prisma } from "@/lib/db";

/** The four metrics displayed by the `/admin` dashboard. */
export async function getDashboardStats() {
  const [
    publishedProducts,
    draftProducts,
    pendingOrders,
    untranslatedNotes,
    fragranceReferences,
  ] = await Promise.all([
    prisma.product.count({ where: { status: "PUBLISHED" } }),
    prisma.product.count({ where: { status: "DRAFT" } }),
    prisma.order.count({ where: { status: "PENDING" } }),
    prisma.note.count({ where: { nameEs: null } }),
    prisma.fragranceRef.count(),
  ]);

  return {
    publishedProducts,
    draftProducts,
    pendingOrders,
    untranslatedNotes,
    fragranceReferences,
  };
}
