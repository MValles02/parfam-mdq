"use client";

import { useRouter } from "next/navigation";
import { useTransition } from "react";
import { toast } from "sonner";
import type { OrderStatus } from "@/generated/prisma/enums";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { cambiarEstadoPedido } from "../actions";

const ORDEN: OrderStatus[] = ["PENDING", "CONFIRMED", "DELIVERED", "CANCELLED"];

/**
 * Las etiquetas viajan como prop en vez de importar `ESTADO_PEDIDO` de
 * `@/lib/admin/pedidos` directo: ese módulo también trae `prisma`, y un
 * Client Component no puede importarlo sin arrastrar el cliente de Prisma al
 * bundle del browser.
 */
export function SelectorEstado({
  id,
  status,
  etiquetas,
}: {
  id: string;
  status: OrderStatus;
  etiquetas: Record<OrderStatus, string>;
}) {
  const router = useRouter();
  const [pendiente, iniciar] = useTransition();

  function cambiar(valor: string) {
    const estado = valor as OrderStatus;
    if (estado === status) return;
    iniciar(async () => {
      const resultado = await cambiarEstadoPedido(id, estado);
      if (!resultado.ok) {
        toast.error(resultado.mensaje);
        return;
      }
      toast.success("Estado actualizado.");
      router.refresh();
    });
  }

  return (
    <Select value={status} onValueChange={cambiar} disabled={pendiente}>
      <SelectTrigger size="default" className="w-44">
        <SelectValue />
      </SelectTrigger>
      <SelectContent>
        {ORDEN.map((estado) => (
          <SelectItem key={estado} value={estado}>
            {etiquetas[estado]}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
