"use server";

import { z } from "zod";
import {
  validateCartItems,
  type CartValidationItem,
} from "@/lib/store/server-cart";

/**
 * Public action with no `requireAdmin`: visitors call it from the drawer,
 * /carrito, and /checkout to reconcile localStorage with the database. It
 * only reads, so it does not need rate limiting or a honeypot like createOrder.
 */

/**
 * Real carts do not contain fifty distinct variants. The cap bounds the
 * generated `IN (...)` query; see F-14 in docs/findings.md.
 */
const cartInputSchema = z
  .array(
    z.object({
      variantId: z.string().min(1),
      qty: z.number().int().min(1).max(99),
    }),
  )
  .max(50);

export type CartValidationResponseItem = CartValidationItem;

export async function validateCartAction(
  items: unknown,
): Promise<CartValidationResponseItem[]> {
  const parsedInput = cartInputSchema.safeParse(items);
  if (!parsedInput.success) return [];
  return validateCartItems(parsedInput.data);
}
