import type { Metadata } from "next";
import Link from "next/link";
import { AdminSearch } from "@/components/admin/admin-search";
import { PageHeader } from "@/components/admin/page-header";
import { FilterTabs } from "@/components/admin/filter-tabs";
import { OrderStatus } from "@/generated/prisma/enums";
import {
  loadOrderListParams,
  serializeOrderListParams,
} from "@/lib/admin/order-list-params";
import {
  getOrderById,
  listOrders,
  type OrderStatusFilter,
} from "@/lib/admin/orders";
import { cn } from "@/lib/utils";
import { OrderDetail } from "./_components/order-detail";
import { OrdersList } from "./_components/orders-list";

export const metadata: Metadata = { title: "Pedidos" };

const ORDER_STATUS_QUERY_VALUES = {
  todos: "all",
  pendientes: OrderStatus.PENDING,
  confirmados: OrderStatus.CONFIRMED,
  entregados: OrderStatus.DELIVERED,
  cancelados: OrderStatus.CANCELLED,
} as const satisfies Record<string, OrderStatusFilter>;

export default async function Page(props: PageProps<"/admin/pedidos">) {
  const { q, estado, pedido } = await loadOrderListParams(props.searchParams);
  const statusFilter = ORDER_STATUS_QUERY_VALUES[estado];

  const [{ rows, pending, confirmed, delivered, total }, selected] =
    await Promise.all([
      listOrders({ query: q, status: statusFilter }),
      pedido ? getOrderById(pedido) : null,
    ]);

  const hasActiveFilters = q.trim() !== "" || statusFilter !== "all";
  const hasSelection = pedido !== null;

  return (
    <>
      <PageHeader
        title="Pedidos"
        description={`${pending} pendientes · ${confirmed} confirmados · ${delivered} entregados`}
        action={<AdminSearch placeholder="Número o nombre" />}
      />

      <div className="lg:grid lg:grid-cols-[minmax(380px,460px)_1fr]">
        <section
          aria-label="Lista de pedidos"
          className={cn(
            "flex flex-col gap-4 p-4 lg:max-h-[calc(100svh-9rem)] lg:overflow-y-auto lg:border-r lg:p-6",
            hasSelection && "hidden lg:flex",
          )}
        >
          <div className="flex flex-wrap items-center gap-2">
            <FilterTabs
              options={[
                { id: "todos", label: "Todos" },
                { id: "pendientes", label: "Pendientes" },
                { id: "confirmados", label: "Confirmados" },
                { id: "entregados", label: "Entregados" },
                { id: "cancelados", label: "Cancelados" },
              ]}
              defaultValue="todos"
            />
            <span className="ml-auto text-sm text-muted-foreground">
              {rows.length} de {total}
            </span>
          </div>

          {rows.length === 0 ? (
            <div className="flex flex-col items-center gap-3 rounded border border-dashed p-10 text-center">
              <p className="text-sm text-muted-foreground">
                {hasActiveFilters
                  ? "No hay pedidos que coincidan con la búsqueda."
                  : "Todavía no entró ningún pedido."}
              </p>
            </div>
          ) : (
            <OrdersList
              rows={rows}
              selectedId={pedido}
              params={{ q, estado }}
            />
          )}
        </section>

        <section
          aria-label="Detalle del pedido"
          className={cn(!hasSelection && "hidden lg:block")}
        >
          {hasSelection ? (
            <Link
              href={serializeOrderListParams("/admin/pedidos", { q, estado })}
              className="inline-block px-6 pt-4 text-sm text-muted-foreground hover:text-foreground lg:hidden"
            >
              ← Volver a pedidos
            </Link>
          ) : null}
          {selected ? (
            <OrderDetail order={selected} />
          ) : (
            <p className="p-10 text-center text-sm text-muted-foreground">
              {hasSelection
                ? "Ese pedido ya no existe."
                : "Elegí un pedido de la lista"}
            </p>
          )}
        </section>
      </div>
    </>
  );
}
