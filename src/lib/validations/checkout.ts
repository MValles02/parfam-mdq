import {
  isValidPhoneNumber,
  parsePhoneNumberWithError,
} from "libphonenumber-js";
import { z } from "zod";

/**
 * Contrato del checkout: el mismo schema en cliente y servidor (mismo patrón
 * que `src/lib/validations/producto.ts`). El cliente valida para dar
 * feedback; el servidor porque es el único borde real (AGENTS.md).
 */

export const itemCheckoutSchema = z.object({
  variantId: z.string().min(1),
  qty: z.number().int().min(1).max(99),
  /**
   * El precio que el cliente tenía mostrado en pantalla al armar el pedido.
   * Sirve sólo para que el servidor detecte si cambió desde entonces (ver
   * `useReconciliacionCarrito`); el precio que se guarda en el pedido sale
   * siempre de la base, nunca de este valor (AGENTS.md: nunca confiar en el
   * precio que manda el cliente).
   */
  precioMostrado: z.string().min(1),
});

/**
 * `libphonenumber-js` normaliza los mil formatos en que un argentino escribe
 * su número ("223 616-3910", "0223 15 6163910", "+54 9 223…") contra la
 * región AR — no hace falta (ni conviene) parsearlo a mano.
 */
const telefono = z
  .string()
  .trim()
  .min(6, "Ese teléfono no parece completo.")
  .refine(
    (v) => isValidPhoneNumber(v, "AR"),
    "Revisá el teléfono: no parece un número argentino válido.",
  )
  // E.164 ("+5492236163910"): es lo que se guarda en Order.customerPhone y lo
  // que arma el link wa.me del admin al chat del cliente.
  .transform((v) => parsePhoneNumberWithError(v, "AR").number);

export const checkoutSchema = z.object({
  nombre: z
    .string()
    .trim()
    .min(2, "Poné tu nombre completo.")
    .max(120, "Nombre muy largo."),
  telefono,
  items: z.array(itemCheckoutSchema).min(1, "Tu carrito está vacío.").max(50),
});

export type CheckoutFormInput = z.input<typeof checkoutSchema>;
export type CheckoutFormValues = z.output<typeof checkoutSchema>;

/**
 * Lo que valida react-hook-form en el cliente: sólo nombre y teléfono, y el
 * teléfono con un chequeo liviano (largo mínimo), no el `isValidPhoneNumber`
 * completo de `checkoutSchema`. Motivo: el input del cliente sólo tiene el
 * número local (el "+54 9" es un prefijo fijo en la UI, ver
 * `FormularioCheckout`), así que validarlo con la región AR acá daría falso
 * negativo todo el tiempo -- el string completo recién existe cuando se arma
 * `"+54 9 " + telefono` antes de mandarlo al servidor. La validación real
 * (y la que manda) es la del servidor, que si rechaza el teléfono vuelve el
 * error por campo y el formulario lo muestra con `setError`.
 *
 * `items` tampoco es un campo de este formulario -- sale del carrito de
 * Zustand al armar el envío -- así que no entra en este schema.
 */
export const checkoutClienteSchema = z.object({
  nombre: checkoutSchema.shape.nombre,
  telefono: z.string().trim().min(6, "Ese teléfono no parece completo."),
});
export type CheckoutClienteInput = z.input<typeof checkoutClienteSchema>;
