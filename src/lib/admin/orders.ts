import { Prisma } from "@/generated/prisma/client";
import { OrderStatus } from "@/generated/prisma/enums";
import { prisma } from "@/lib/db";
import { buildWhatsAppLink, formatPhoneNumber } from "@/lib/whatsapp";

export type OrderStatusFilter = "all" | OrderStatus;

const STATUS_FILTER_WHERE: Record<OrderStatusFilter, OrderStatus | undefined> =
  {
    all: undefined,
    [OrderStatus.PENDING]: OrderStatus.PENDING,
    [OrderStatus.CONFIRMED]: OrderStatus.CONFIRMED,
    [OrderStatus.DELIVERED]: OrderStatus.DELIVERED,
    [OrderStatus.CANCELLED]: OrderStatus.CANCELLED,
  };

/**
 * Spanish `OrderStatus` labels stay in this admin-only module because the
 * public store does not display order statuses.
 */
export const ORDER_STATUS_LABELS: Record<OrderStatus, string> = {
  PENDING: "Pendiente",
  CONFIRMED: "Confirmado",
  DELIVERED: "Entregado",
  CANCELLED: "Cancelado",
};

/** Counts orders awaiting action, shown as the sidebar badge. */
export function countPendingOrders() {
  return prisma.order.count({ where: { status: OrderStatus.PENDING } });
}

function buildSearchWhere(query: string): Prisma.OrderWhereInput {
  const searchTerm = query.trim();
  if (!searchTerm) return {};
  return {
    OR: [
      { number: { contains: searchTerm, mode: "insensitive" } },
      { customerName: { contains: searchTerm, mode: "insensitive" } },
    ],
  };
}

/**
 * Returns order-table rows and per-status counts for the page header and
 * filter tabs.
 */
export async function listOrders(options: {
  query?: string;
  status?: OrderStatusFilter;
}) {
  const query = options.query ?? "";
  const status = options.status ?? "all";
  const where: Prisma.OrderWhereInput = {
    ...buildSearchWhere(query),
    status: STATUS_FILTER_WHERE[status],
  };

  const [orders, pending, confirmed, delivered, cancelled, total] =
    await Promise.all([
      prisma.order.findMany({
        where,
        orderBy: [{ createdAt: "desc" }],
        select: {
          id: true,
          number: true,
          customerName: true,
          customerPhone: true,
          status: true,
          totalArs: true,
          createdAt: true,
          _count: { select: { items: true } },
          items: { select: { productName: true }, take: 3 },
        },
      }),
      prisma.order.count({ where: { status: OrderStatus.PENDING } }),
      prisma.order.count({ where: { status: OrderStatus.CONFIRMED } }),
      prisma.order.count({ where: { status: OrderStatus.DELIVERED } }),
      prisma.order.count({ where: { status: OrderStatus.CANCELLED } }),
      prisma.order.count(),
    ]);

  const rows = orders.map((order) => ({
    id: order.id,
    number: order.number,
    customerName: order.customerName,
    customerPhone: formatPhoneNumber(order.customerPhone),
    status: order.status,
    totalArs: order.totalArs.toString(),
    itemCount: order._count.items,
    itemNames: order.items.map((item) => item.productName),
    createdAt: order.createdAt,
  }));

  return {
    rows,
    pending,
    confirmed,
    delivered,
    cancelled,
    total,
  };
}

export type OrderRow = Awaited<ReturnType<typeof listOrders>>["rows"][number];

/** Returns the complete detail for one order in `/admin/pedidos/[id]`. */
export async function getOrderById(id: string) {
  const order = await prisma.order.findUnique({
    where: { id },
    select: {
      id: true,
      number: true,
      customerName: true,
      customerPhone: true,
      status: true,
      totalArs: true,
      adminNotes: true,
      createdAt: true,
      updatedAt: true,
      items: {
        select: {
          id: true,
          productId: true,
          variantId: true,
          productName: true,
          variantLabel: true,
          unitPriceArs: true,
          qty: true,
        },
      },
    },
  });
  if (!order) return null;

  return {
    id: order.id,
    number: order.number,
    customerName: order.customerName,
    customerPhone: formatPhoneNumber(order.customerPhone),
    status: order.status,
    totalArs: order.totalArs.toString(),
    adminNotes: order.adminNotes,
    createdAt: order.createdAt,
    updatedAt: order.updatedAt,
    whatsappChatLink: buildWhatsAppLink(order.customerPhone),
    items: order.items.map((item) => ({
      id: item.id,
      productId: item.productId,
      variantId: item.variantId,
      productName: item.productName,
      variantLabel: item.variantLabel,
      unitPriceArs: item.unitPriceArs.toString(),
      qty: item.qty,
      subtotalArs: new Prisma.Decimal(item.unitPriceArs)
        .times(item.qty)
        .toString(),
    })),
  };
}
