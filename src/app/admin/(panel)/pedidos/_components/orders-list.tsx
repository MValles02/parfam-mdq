import Link from "next/link";
import { OrderStatusChip } from "@/components/admin/order-status-chip";
import {
  serializeOrderListParams,
  type OrderListFilters,
} from "@/lib/admin/order-list-params";
import type { OrderRow } from "@/lib/admin/orders";
import { formatArsPrice } from "@/lib/catalog";
import { formatRelativeDate } from "@/lib/date";
import { cn } from "@/lib/utils";

function itemSummary(row: OrderRow) {
  const names = row.itemNames.join(", ");
  const extra = row.itemCount - row.itemNames.length;
  return extra > 0 ? `${names} +${extra}` : names;
}

/** Selectable order rows; each is a link that keeps `q`/`estado` and sets `pedido`. */
export function OrdersList({
  rows,
  selectedId,
  params,
}: {
  rows: OrderRow[];
  selectedId: string | null;
  params: OrderListFilters;
}) {
  return (
    <ul className="shrink-0 divide-y overflow-hidden rounded border bg-card">
      {rows.map((row) => {
        const isSelected = row.id === selectedId;
        return (
          <li key={row.id}>
            <Link
              href={serializeOrderListParams("/admin/pedidos", {
                ...params,
                pedido: row.id,
              })}
              aria-current={isSelected ? "true" : undefined}
              className={cn(
                "flex flex-col gap-1 border-l-2 border-transparent px-4 py-3 hover:bg-muted/60",
                isSelected && "border-primary bg-secondary",
              )}
            >
              <span className="flex items-center justify-between gap-2">
                <span className="text-sm font-semibold">{row.number}</span>
                <OrderStatusChip status={row.status} />
              </span>
              <span className="text-sm">{row.customerName}</span>
              <span className="truncate text-xs text-muted-foreground">
                {itemSummary(row)}
              </span>
              <span className="flex items-center justify-between text-xs text-muted-foreground">
                <span>{formatRelativeDate(row.createdAt)}</span>
                <span className="font-semibold text-foreground">
                  {formatArsPrice(row.totalArs)}
                </span>
              </span>
            </Link>
          </li>
        );
      })}
    </ul>
  );
}
