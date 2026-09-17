import { z } from "zod";
import { telefono } from "@/lib/validations/checkout";
import { textoOpcional } from "@/lib/validations/producto";

/**
 * Contrato del formulario de `/admin/configuracion`: mismo schema en cliente
 * y servidor (patrón de `src/lib/validations/producto.ts`). El teléfono
 * reusa el criterio de `checkout.ts` (libphonenumber-js, región AR) porque
 * es el mismo dato: `SiteSetting.whatsappNumber` termina en el mismo formato
 * E.164 que `Order.customerPhone` (AGENTS.md).
 */

const instagramHandle = z
  .string()
  .trim()
  .max(60, "No puede superar los 60 caracteres.")
  // El admin puede escribir "@parfam_mdq" o "parfam_mdq": se guarda sin la
  // arroba porque el "@" lo agrega el componente que lo muestra.
  .transform((v) => v.replace(/^@/, ""))
  .transform((v) => (v === "" ? null : v))
  .nullable()
  .default(null);

export const configuracionSchema = z.object({
  whatsappNumber: telefono,
  whatsappMessageTemplate: z
    .string()
    .trim()
    .min(1, "Escribí la plantilla del mensaje.")
    .max(2000, "La plantilla es muy larga."),
  brandName: z
    .string()
    .trim()
    .min(1, "El nombre de la marca es obligatorio.")
    .max(120, "Nombre muy largo."),
  brandTagline: z
    .string()
    .trim()
    .min(1, "El tagline es obligatorio.")
    .max(200, "Tagline muy largo."),
  instagramHandle,
  shippingInfo: textoOpcional(300),
  seoDefaultTitle: textoOpcional(70),
  seoDefaultDescription: textoOpcional(180),
});

export type ConfiguracionFormInput = z.input<typeof configuracionSchema>;
export type ConfiguracionFormValues = z.output<typeof configuracionSchema>;
