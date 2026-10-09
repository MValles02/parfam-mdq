"use server";

import {
  validateCartItems,
  type CartValidationItem,
} from "@/lib/store/server-cart";
import { cartItemsSchema } from "@/lib/validations/checkout";

/**
 * Public action with no `requireAdmin`: visitors call it from the drawer,
 * /carrito, and /checkout to reconcile localStorage with the database. It
 * only reads, so it does not need rate limiting or a honeypot like createOrder.
 */

export async function validateCartAction(
  items: unknown,
): Promise<CartValidationItem[]> {
  const parsedInput = cartItemsSchema.safeParse(items);
  if (!parsedInput.success) return [];
  return validateCartItems(parsedInput.data);
}
