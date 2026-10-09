import type { OrderStatus } from "@/generated/prisma/enums";

/** Happy-path order lifecycle; CANCELLED sits outside it. */
export const ORDER_STEPS = ["PENDING", "CONFIRMED", "DELIVERED"] as const;

/** Next step of the lifecycle, or null when there is none (delivered or cancelled). */
export function getNextOrderStatus(status: OrderStatus): OrderStatus | null {
  const index = ORDER_STEPS.findIndex((step) => step === status);
  return index === -1 ? null : (ORDER_STEPS[index + 1] ?? null);
}
