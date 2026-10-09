import { z } from "zod";
import { optionalText } from "@/lib/validations/product";

/**
 * The `Brand` slug stays unchanged because it is the `marca` filter value in
 * catalog URLs (`/?marca=<slug>`) and may be bookmarked or shared. Only `name`
 * and `country` can be edited.
 */
export const brandSchema = z.object({
  name: z
    .string()
    .trim()
    .min(1, "El nombre es obligatorio.")
    .max(120, "Nombre muy largo."),
  country: optionalText(80),
});

export type BrandFormInput = z.input<typeof brandSchema>;
export type BrandFormValues = z.output<typeof brandSchema>;
