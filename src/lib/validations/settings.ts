import { z } from "zod";
import { phoneSchema } from "@/lib/validations/checkout";
import { optionalText } from "@/lib/validations/product";

/**
 * Shared client and server schema for `/admin/configuracion`. It reuses the
 * checkout phone rule (libphonenumber-js, AR region) because
 * `SiteSetting.whatsappNumber` and `Order.customerPhone` use E.164.
 */

const instagramHandle = z
  .string()
  .trim()
  .max(60, "No puede superar los 60 caracteres.")
  // The administrator may enter "@parfam_mdq" or "parfam_mdq". Storage omits
  // the at sign because the display component supplies it.
  .transform((v) => v.replace(/^@/, ""))
  .transform((v) => (v === "" ? null : v))
  .nullable()
  .default(null);

export const settingsSchema = z.object({
  whatsappNumber: phoneSchema,
  whatsappMessageTemplate: z
    .string()
    .trim()
    .min(1, "Escribí la plantilla del mensaje.")
    .max(2000, "La plantilla es muy larga."),
  instagramHandle,
  shippingInfo: optionalText(300),
  seoDefaultTitle: optionalText(70),
  seoDefaultDescription: optionalText(180),
});

export type SettingsFormInput = z.input<typeof settingsSchema>;
export type SettingsFormValues = z.output<typeof settingsSchema>;
