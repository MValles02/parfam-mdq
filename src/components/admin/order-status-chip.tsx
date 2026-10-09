import type { OrderStatus } from "@/generated/prisma/enums";
import { cn } from "@/lib/utils";
import { ORDER_STATUS_LABELS } from "@/lib/admin/orders";

/**
 * Order statuses use their own feedback tokens: PENDING is warning (work
 * waiting for the admin), CONFIRMED is neutral secondary, DELIVERED is success
 * and CANCELLED is danger. This intentionally differs from the product chip.
 */
const STATUS_STYLES: Record<OrderStatus, string> = {
  PENDING: "border-transparent bg-warning text-warning-foreground",
  CONFIRMED: "border-border bg-secondary text-secondary-foreground",
  DELIVERED: "border-success-border bg-success text-success-foreground",
  CANCELLED: "border-transparent bg-danger text-danger-foreground",
};

const STATUS_DOT_STYLES: Record<OrderStatus, string> = {
  PENDING: "bg-warning-foreground",
  CONFIRMED: "bg-muted-foreground",
  DELIVERED: "bg-success-foreground",
  CANCELLED: "bg-danger-foreground",
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
