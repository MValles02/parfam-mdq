import Link from "next/link";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { formatArsPrice } from "@/lib/catalog";
import { formatRelativeDate } from "@/lib/date";
import type { OrderRow } from "@/lib/admin/orders";
import { OrderStatusChip } from "./order-status-chip";

export function OrdersTable({ rows }: { rows: OrderRow[] }) {
  return (
    <div className="overflow-hidden rounded border border-border bg-card">
      <Table>
        <TableHeader>
          <TableRow className="bg-muted/60 hover:bg-muted/60">
            <TableHead className="text-[10px] font-bold tracking-[0.14em] text-muted-foreground uppercase">
              Pedido
            </TableHead>
            <TableHead className="text-[10px] font-bold tracking-[0.14em] text-muted-foreground uppercase">
              Cliente
            </TableHead>
            <TableHead className="text-[10px] font-bold tracking-[0.14em] text-muted-foreground uppercase">
              Estado
            </TableHead>
            <TableHead className="text-[10px] font-bold tracking-[0.14em] text-muted-foreground uppercase">
              Items
            </TableHead>
            <TableHead className="text-[10px] font-bold tracking-[0.14em] text-muted-foreground uppercase">
              Total
            </TableHead>
            <TableHead className="text-[10px] font-bold tracking-[0.14em] text-muted-foreground uppercase">
              Fecha
            </TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {rows.map((row) => (
            <TableRow key={row.id}>
              <TableCell>
                <Link
                  href={`/admin/pedidos/${row.id}`}
                  className="text-sm font-semibold tracking-tight text-foreground hover:underline"
                >
                  {row.number}
                </Link>
              </TableCell>
              <TableCell>
                <Link
                  href={`/admin/pedidos/${row.id}`}
                  className="flex flex-col gap-0.5"
                >
                  <span className="text-sm text-foreground">
                    {row.customerName}
                  </span>
                  <span className="text-[11px] text-muted-foreground">
                    {row.customerPhone}
                  </span>
                </Link>
              </TableCell>
              <TableCell>
                <OrderStatusChip status={row.status} />
              </TableCell>
              <TableCell className="text-sm text-foreground">
                {row.itemCount} {row.itemCount === 1 ? "item" : "items"}
              </TableCell>
              <TableCell className="text-sm font-semibold text-foreground">
                {formatArsPrice(row.totalArs)}
              </TableCell>
              <TableCell className="text-sm text-muted-foreground">
                {formatRelativeDate(row.createdAt)}
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}
