import type { Metadata } from "next";
import { AdminSearch } from "@/components/admin/admin-search";
import { PageHeader } from "@/components/admin/page-header";
import { FilterTabs } from "@/components/admin/filter-tabs";
import { OrderStatus } from "@/generated/prisma/enums";
import { listOrders, type OrderStatusFilter } from "@/lib/admin/orders";
import { OrdersTable } from "./_components/orders-table";

export const metadata: Metadata = { title: "Pedidos" };

const ORDER_STATUS_QUERY_VALUES = {
  todos: "all",
  pendientes: OrderStatus.PENDING,
  confirmados: OrderStatus.CONFIRMED,
  entregados: OrderStatus.DELIVERED,
  cancelados: OrderStatus.CANCELLED,
} as const satisfies Record<string, OrderStatusFilter>;

function parseOrderStatusFilter(value: string | undefined): OrderStatusFilter {
  return (
    ORDER_STATUS_QUERY_VALUES[
      value as keyof typeof ORDER_STATUS_QUERY_VALUES
    ] ?? "all"
  );
}

export default async function Page(props: PageProps<"/admin/pedidos">) {
  const searchParams = await props.searchParams;
  const query = typeof searchParams.q === "string" ? searchParams.q : "";
  const statusQueryValue =
    typeof searchParams.estado === "string" ? searchParams.estado : undefined;
  const statusFilter = parseOrderStatusFilter(statusQueryValue);

  const { rows, pending, confirmed, delivered, total } = await listOrders({
    query,
    status: statusFilter,
  });

  const hasActiveFilters = query.trim() !== "" || statusFilter !== "all";

  return (
    <>
      <PageHeader
        title="Pedidos"
        description={`${pending} pendientes · ${confirmed} confirmados · ${delivered} entregados`}
        action={
          <AdminSearch placeholder="Buscar número o nombre del cliente" />
        }
      />

      <div className="p-8 pt-6">
        <div className="mb-4 flex items-center gap-2">
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
          <div className="flex flex-col items-center gap-3 rounded border border-dashed p-16 text-center">
            <p className="text-sm text-muted-foreground">
              {hasActiveFilters
                ? "No hay pedidos que coincidan con la búsqueda."
                : "Todavía no entró ningún pedido."}
            </p>
          </div>
        ) : (
          <OrdersTable rows={rows} />
        )}
      </div>
    </>
  );
}
