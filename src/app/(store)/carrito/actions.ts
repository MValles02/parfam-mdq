"use server";

import { z } from "zod";
import {
  validateCartItems,
  type CartValidationItem,
  type InvalidReason,
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

/** Spanish fields and values are the cart validation response contract. */
export type CartInvalidReason = "inactiva" | "eliminada" | "despublicado";

export type CartValidationResponseItem = {
  variantId: string;
  qty: number;
} & (
  | {
      ok: true;
      productId: string;
      productName: string;
      brandName: string;
      variantLabel: string;
      precioArs: string;
    }
  | { ok: false; razon: CartInvalidReason }
);

const RAW_INVALID_REASON: Record<InvalidReason, CartInvalidReason> = {
  inactive: "inactiva",
  deleted: "eliminada",
  unpublished: "despublicado",
};

function toCartValidationResponse(
  item: CartValidationItem,
): CartValidationResponseItem {
  if (!item.ok) {
    return {
      ok: false,
      variantId: item.variantId,
      qty: item.qty,
      razon: RAW_INVALID_REASON[item.reason],
    };
  }

  return {
    ok: true,
    variantId: item.variantId,
    qty: item.qty,
    productId: item.productId,
    productName: item.productName,
    brandName: item.brandName,
    variantLabel: item.variantLabel,
    precioArs: item.priceArs,
  };
}

export async function validateCartAction(
  items: unknown,
): Promise<CartValidationResponseItem[]> {
  const parsedInput = cartInputSchema.safeParse(items);
  if (!parsedInput.success) return [];
  return (await validateCartItems(parsedInput.data)).map(
    toCartValidationResponse,
  );
}
