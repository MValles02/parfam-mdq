import {
  isValidPhoneNumber,
  parsePhoneNumberWithError,
} from "libphonenumber-js";
import { z } from "zod";

/**
 * Checkout request contract shared by client and server. The client provides
 * feedback while the server enforces the real boundary; see AGENTS.md.
 */

/** Mirrored by `MAX_ITEM_QUANTITY` in `src/lib/cart.ts` for the steppers. */
const MAX_ITEM_QUANTITY = 99;

/**
 * Real carts do not contain fifty distinct variants. The cap bounds the
 * generated `IN (...)` query of cart validation and checkout.
 */
const MAX_CART_LINES = 50;

export const CUSTOMER_NAME_MAX_LENGTH = 120;

/**
 * Fixed phone prefix: the customer only enters the local number, never the
 * country code or mobile "9". This avoids the ambiguity of guessing whether
 * they entered "0223 15…" or "223…".
 */
export const PHONE_PREFIX = "+54 9";

/** The full number checkout submits for a local number typed in the form. */
export function withPhonePrefix(localNumber: string): string {
  return `${PHONE_PREFIX} ${localNumber}`;
}

const PHONE_MIN_LENGTH = 6;
const PHONE_TOO_SHORT_MESSAGE = "Ese teléfono no parece completo.";
const PHONE_INVALID_MESSAGE =
  "Revisá el teléfono: no parece un número argentino válido.";

/** One cart line as the browser sends it: never a price or a name. */
const cartItemSchema = z.object({
  variantId: z.string().min(1),
  qty: z.number().int().min(1).max(MAX_ITEM_QUANTITY),
});

/** Cart lines for database reconciliation; an empty cart is valid here. */
export const cartItemsSchema = z.array(cartItemSchema).max(MAX_CART_LINES);

/**
 * libphonenumber-js normalizes Argentine phone-number formats such as
 * "223 616-3910", "0223 15 6163910", and "+54 9 223…" for the AR region.
 * SiteSetting's WhatsApp number validation reuses this schema.
 */
export const phoneSchema = z
  .string()
  .trim()
  .min(PHONE_MIN_LENGTH, PHONE_TOO_SHORT_MESSAGE)
  .refine((v) => isValidPhoneNumber(v, "AR"), PHONE_INVALID_MESSAGE)
  // E.164 values are stored in Order.customerPhone and used to create admin
  // wa.me chat links.
  .transform((v) => parsePhoneNumberWithError(v, "AR").number);

export const checkoutRequestSchema = z.object({
  customerName: z
    .string()
    .trim()
    .min(2, "Poné tu nombre completo.")
    .max(CUSTOMER_NAME_MAX_LENGTH, "Nombre muy largo."),
  customerPhone: phoneSchema,
  items: z
    .array(cartItemSchema)
    .min(1, "Tu carrito está vacío.")
    .max(MAX_CART_LINES),
});

/**
 * This React Hook Form schema validates the customer name and the local phone
 * number. The client input contains only the local number; the UI prepends
 * `PHONE_PREFIX` before sending it, so the phone is checked here with the
 * same `isValidPhoneNumber(..., "AR")` rule as `phoneSchema` on the prefixed
 * value. The server remains the real boundary and returns field errors that
 * CheckoutForm renders with `setError`.
 *
 * `items` comes from the Zustand cart while building the request, so it does
 * not belong to this form schema.
 */
export const checkoutCustomerSchema = z.object({
  customerName: checkoutRequestSchema.shape.customerName,
  customerPhone: z
    .string()
    .trim()
    .min(PHONE_MIN_LENGTH, PHONE_TOO_SHORT_MESSAGE)
    .refine(
      (v) => isValidPhoneNumber(withPhonePrefix(v), "AR"),
      PHONE_INVALID_MESSAGE,
    ),
});
export type CheckoutCustomerInput = z.input<typeof checkoutCustomerSchema>;
