import type { OrderStatus } from "@/generated/prisma/enums";
import { ESTADO_PEDIDO } from "@/lib/admin/pedidos";
import { cn } from "@/lib/utils";

/**
 * Mismo criterio que `EstadoChip` de productos (badge con punto + texto), pero
 * para los 4 estados de `OrderStatus`. PENDING queda neutral, CONFIRMED y
 * DELIVERED comparten los tokens `--success` (DELIVERED sin borde, para
 * distinguir "ya se entregó" de "confirmado, todavía no retirado") y
 * CANCELLED usa `--destructive` con el mismo criterio que `buttonVariants`
 * (`--destructive` no tiene foreground/border propios en este proyecto).
 */
const ESTILOS: Record<OrderStatus, string> = {
  PENDING: "border-border bg-muted text-muted-foreground",
  CONFIRMED: "border-success-border bg-success text-success-foreground",
  DELIVERED: "border-transparent bg-success text-success-foreground",
  CANCELLED: "border-transparent bg-destructive/10 text-destructive",
};

const PUNTO: Record<OrderStatus, string> = {
  PENDING: "bg-muted-foreground/60",
  CONFIRMED: "bg-success-foreground",
  DELIVERED: "bg-success-foreground",
  CANCELLED: "bg-destructive",
};

export function ChipEstadoPedido({ status }: { status: OrderStatus }) {
  return (
    <span
      className={cn(
        "inline-flex shrink-0 items-center gap-1.5 rounded border px-2.5 py-1 text-xs font-semibold",
        ESTILOS[status],
      )}
    >
      <span className={cn("size-1.5 rounded-full", PUNTO[status])} />
      {ESTADO_PEDIDO[status]}
    </span>
  );
}
