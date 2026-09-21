import {
  isValidPhoneNumber,
  parsePhoneNumberWithError,
} from "libphonenumber-js";
import { z } from "zod";

/**
 * Checkout request contract shared by client and server. The client provides
 * feedback while the server enforces the real boundary; see AGENTS.md.
 */

const checkoutItemSchema = z.object({
  variantId: z.string().min(1),
  qty: z.number().int().min(1).max(99),
});

/**
 * libphonenumber-js normalizes Argentine phone-number formats such as
 * "223 616-3910", "0223 15 6163910", and "+54 9 223…" for the AR region.
 */
// This schema is also used for SiteSetting's WhatsApp number validation.
export const phoneSchema = z
  .string()
  .trim()
  .min(6, "Ese teléfono no parece completo.")
  .refine(
    (v) => isValidPhoneNumber(v, "AR"),
    "Revisá el teléfono: no parece un número argentino válido.",
  )
  // E.164 values are stored in Order.customerPhone and used to create admin
  // wa.me chat links.
  .transform((v) => parsePhoneNumberWithError(v, "AR").number);

export const checkoutRequestSchema = z.object({
  nombre: z
    .string()
    .trim()
    .min(2, "Poné tu nombre completo.")
    .max(120, "Nombre muy largo."),
  telefono: phoneSchema,
  items: z.array(checkoutItemSchema).min(1, "Tu carrito está vacío.").max(50),
});

/**
 * This React Hook Form schema validates only the customer name and a minimum
 * phone length. The client input contains only the local number; the UI adds
 * the fixed "+54 9" prefix before sending it. Full AR validation therefore
 * belongs on the server, which returns field errors that CheckoutForm renders
 * with `setError`.
 *
 * `items` comes from the Zustand cart while building the request, so it does
 * not belong to this form schema.
 */
export const checkoutCustomerSchema = z.object({
  nombre: checkoutRequestSchema.shape.nombre,
  telefono: z.string().trim().min(6, "Ese teléfono no parece completo."),
});
export type CheckoutCustomerInput = z.input<typeof checkoutCustomerSchema>;
