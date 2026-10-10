import type { OrderStatus } from "@/generated/prisma/enums";

/** Happy-path order lifecycle; CANCELLED sits outside it. */
export const ORDER_STEPS = ["PENDING", "CONFIRMED", "DELIVERED"] as const;

/** Allowed manual status changes; the server enforces it, the UI only offers these. */
export const ORDER_STATUS_TRANSITIONS: Record<
  OrderStatus,
  readonly OrderStatus[]
> = {
  PENDING: ["CONFIRMED", "CANCELLED"],
  CONFIRMED: ["DELIVERED", "PENDING", "CANCELLED"],
  DELIVERED: ["CONFIRMED"],
  CANCELLED: ["PENDING"],
};

export function canChangeOrderStatus(
  from: OrderStatus,
  to: OrderStatus,
): boolean {
  return ORDER_STATUS_TRANSITIONS[from].includes(to);
}

/** Next step of the lifecycle, or null when there is none (delivered or cancelled). */
export function getNextOrderStatus(status: OrderStatus): OrderStatus | null {
  const index = ORDER_STEPS.findIndex((step) => step === status);
  return index === -1 ? null : (ORDER_STEPS[index + 1] ?? null);
}
