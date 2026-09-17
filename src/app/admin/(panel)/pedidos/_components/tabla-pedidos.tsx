import Link from "next/link";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { precioArs } from "@/lib/catalogo";
import { hace } from "@/lib/fecha";
import type { FilaPedido } from "@/lib/admin/pedidos";
import { ChipEstadoPedido } from "./chip-estado-pedido";

export function TablaPedidos({ filas }: { filas: FilaPedido[] }) {
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
          {filas.map((fila) => (
            <TableRow key={fila.id}>
              <TableCell>
                <Link
                  href={`/admin/pedidos/${fila.id}`}
                  className="text-sm font-semibold tracking-tight text-foreground hover:underline"
                >
                  {fila.number}
                </Link>
              </TableCell>
              <TableCell>
                <Link
                  href={`/admin/pedidos/${fila.id}`}
                  className="flex flex-col gap-0.5"
                >
                  <span className="text-sm text-foreground">
                    {fila.customerName}
                  </span>
                  <span className="text-[11px] text-muted-foreground">
                    {fila.customerPhone}
                  </span>
                </Link>
              </TableCell>
              <TableCell>
                <ChipEstadoPedido status={fila.status} />
              </TableCell>
              <TableCell className="text-sm text-foreground">
                {fila.cantidadItems}{" "}
                {fila.cantidadItems === 1 ? "item" : "items"}
              </TableCell>
              <TableCell className="text-sm font-semibold text-foreground">
                {precioArs(fila.totalArs)}
              </TableCell>
              <TableCell className="text-sm text-muted-foreground">
                {hace(fila.createdAt)}
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}
