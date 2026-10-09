import { Prisma } from "@/generated/prisma/client";
import { OrderStatus } from "@/generated/prisma/enums";
import { prisma } from "@/lib/db";

const DAY_MS = 24 * 60 * 60 * 1000;

/** Metrics and work queues displayed by the `/admin` dashboard. */
export async function getDashboardStats() {
  const since = new Date(Date.now() - 7 * DAY_MS);

  const [
    publishedProducts,
    draftProducts,
    pendingOrders,
    fragranceReferences,
    oldestPending,
    publishedWithoutImages,
    publishedWithoutActiveVariants,
    last7DaysCount,
    last7DaysByStatus,
    last7DaysOrders,
    recentOrders,
  ] = await Promise.all([
    prisma.product.count({ where: { status: "PUBLISHED" } }),
    prisma.product.count({ where: { status: "DRAFT" } }),
    prisma.order.count({ where: { status: "PENDING" } }),
    prisma.fragranceRef.count(),
    prisma.order.findFirst({
      where: { status: "PENDING" },
      orderBy: { createdAt: "asc" },
      select: { createdAt: true },
    }),
    prisma.product.count({
      where: { status: "PUBLISHED", images: { none: {} } },
    }),
    prisma.product.count({
      where: {
        status: "PUBLISHED",
        variants: { none: { isActive: true } },
      },
    }),
    prisma.order.count({ where: { createdAt: { gte: since } } }),
    prisma.order.groupBy({
      by: ["status"],
      where: { createdAt: { gte: since } },
      _count: { _all: true },
    }),
    prisma.order.aggregate({
      where: {
        createdAt: { gte: since },
        status: { in: [OrderStatus.CONFIRMED, OrderStatus.DELIVERED] },
      },
      _sum: { totalArs: true },
    }),
    prisma.order.findMany({
      orderBy: { createdAt: "desc" },
      take: 5,
      select: {
        id: true,
        number: true,
        customerName: true,
        status: true,
        totalArs: true,
        createdAt: true,
        items: { select: { productName: true }, take: 3 },
      },
    }),
  ]);

  const countByStatus = Object.fromEntries(
    last7DaysByStatus.map((row) => [row.status, row._count._all]),
  ) as Partial<Record<OrderStatus, number>>;

  return {
    publishedProducts,
    draftProducts,
    pendingOrders,
    fragranceReferences,
    oldestPendingAt: oldestPending?.createdAt ?? null,
    publishedWithoutImages,
    publishedWithoutActiveVariants,
    // No status history exists, so every figure is by the order's current status.
    last7Days: {
      total: last7DaysCount,
      byStatus: countByStatus,
      confirmedAndDeliveredArs: new Prisma.Decimal(
        last7DaysOrders._sum.totalArs ?? 0,
      ).toString(),
    },
    recentOrders: recentOrders.map((order) => ({
      id: order.id,
      number: order.number,
      customerName: order.customerName,
      status: order.status,
      totalArs: order.totalArs.toString(),
      createdAt: order.createdAt,
      itemNames: order.items.map((item) => item.productName),
    })),
  };
}
