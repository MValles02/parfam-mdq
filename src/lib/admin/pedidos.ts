import { Prisma } from "@/generated/prisma/client";
import { OrderStatus } from "@/generated/prisma/enums";
import { prisma } from "@/lib/db";
import { linkWhatsappA, telefonoVisible } from "@/lib/whatsapp";

export type FiltroEstadoPedido =
  "todos" | "pendientes" | "confirmados" | "entregados" | "cancelados";

const ESTADO_A_WHERE: Record<FiltroEstadoPedido, OrderStatus | undefined> = {
  todos: undefined,
  pendientes: OrderStatus.PENDING,
  confirmados: OrderStatus.CONFIRMED,
  entregados: OrderStatus.DELIVERED,
  cancelados: OrderStatus.CANCELLED,
};

/** Etiquetas en espaniol de `OrderStatus`. Vive acá y no en `catalogo.ts`
 * porque ese archivo lo comparte la tienda pública, que no muestra estados
 * de pedido. */
export const ESTADO_PEDIDO: Record<OrderStatus, string> = {
  PENDING: "Pendiente",
  CONFIRMED: "Confirmado",
  DELIVERED: "Entregado",
  CANCELLED: "Cancelado",
};

function whereBusqueda(q: string): Prisma.OrderWhereInput {
  const termino = q.trim();
  if (!termino) return {};
  return {
    OR: [
      { number: { contains: termino, mode: "insensitive" } },
      { customerName: { contains: termino, mode: "insensitive" } },
    ],
  };
}

/**
 * Filas de la tabla de /admin/pedidos, más los conteos por estado para el
 * `PageHeader` y las tabs de filtro.
 */
export async function listarPedidos(opciones: {
  q?: string;
  estado?: FiltroEstadoPedido;
}) {
  const q = opciones.q ?? "";
  const estado = opciones.estado ?? "todos";
  const where: Prisma.OrderWhereInput = {
    ...whereBusqueda(q),
    status: ESTADO_A_WHERE[estado],
  };

  const [pedidos, pendientes, confirmados, entregados, cancelados, total] =
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
        },
      }),
      prisma.order.count({ where: { status: OrderStatus.PENDING } }),
      prisma.order.count({ where: { status: OrderStatus.CONFIRMED } }),
      prisma.order.count({ where: { status: OrderStatus.DELIVERED } }),
      prisma.order.count({ where: { status: OrderStatus.CANCELLED } }),
      prisma.order.count(),
    ]);

  const filas = pedidos.map((p) => ({
    id: p.id,
    number: p.number,
    customerName: p.customerName,
    customerPhone: telefonoVisible(p.customerPhone),
    status: p.status,
    totalArs: p.totalArs.toString(),
    cantidadItems: p._count.items,
    createdAt: p.createdAt,
  }));

  return {
    filas,
    pendientes,
    confirmados,
    entregados,
    cancelados,
    total,
  };
}

export type FilaPedido = Awaited<
  ReturnType<typeof listarPedidos>
>["filas"][number];

/** Detalle completo de un pedido para /admin/pedidos/[id]. */
export async function pedidoPorId(id: string) {
  const pedido = await prisma.order.findUnique({
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
  if (!pedido) return null;

  return {
    id: pedido.id,
    number: pedido.number,
    customerName: pedido.customerName,
    customerPhone: telefonoVisible(pedido.customerPhone),
    status: pedido.status,
    totalArs: pedido.totalArs.toString(),
    adminNotes: pedido.adminNotes,
    createdAt: pedido.createdAt,
    updatedAt: pedido.updatedAt,
    linkChat: linkWhatsappA(pedido.customerPhone),
    items: pedido.items.map((item) => ({
      id: item.id,
      productId: item.productId,
      variantId: item.variantId,
      productName: item.productName,
      variantLabel: item.variantLabel,
      unitPriceArs: item.unitPriceArs.toString(),
      qty: item.qty,
      subtotal: new Prisma.Decimal(item.unitPriceArs)
        .times(item.qty)
        .toString(),
    })),
  };
}

export type PedidoDetalle = NonNullable<
  Awaited<ReturnType<typeof pedidoPorId>>
>;
