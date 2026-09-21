import type { OrderStatus } from "@/generated/prisma/enums";
import { ORDER_STATUS_LABELS } from "@/lib/admin/orders";
import { cn } from "@/lib/utils";

/**
 * Matches the product status-chip treatment: PENDING is neutral; CONFIRMED
 * and DELIVERED use the success tokens, with DELIVERED borderless to distinguish
 * it from a confirmed order that is still awaiting pickup; CANCELLED uses the
 * same destructive treatment as `buttonVariants`.
 */
const STATUS_STYLES: Record<OrderStatus, string> = {
  PENDING: "border-border bg-muted text-muted-foreground",
  CONFIRMED: "border-success-border bg-success text-success-foreground",
  DELIVERED: "border-transparent bg-success text-success-foreground",
  CANCELLED: "border-transparent bg-destructive/10 text-destructive",
};

const STATUS_DOT_STYLES: Record<OrderStatus, string> = {
  PENDING: "bg-muted-foreground/60",
  CONFIRMED: "bg-success-foreground",
  DELIVERED: "bg-success-foreground",
  CANCELLED: "bg-destructive",
};

export function OrderStatusChip({ status }: { status: OrderStatus }) {
  return (
    <span
      className={cn(
        "inline-flex shrink-0 items-center gap-1.5 rounded border px-2.5 py-1 text-xs font-semibold",
        STATUS_STYLES[status],
      )}
    >
      <span
        className={cn("size-1.5 rounded-full", STATUS_DOT_STYLES[status])}
      />
      {ORDER_STATUS_LABELS[status]}
    </span>
  );
}
