import { z } from "zod";

/**
 * The `Brand` slug stays unchanged because it is the `marca` filter value in
 * catalog URLs (`/?marca=<slug>`) and may be bookmarked or shared. Only `name`
 * can be edited.
 */
export const brandSchema = z.object({
  name: z
    .string()
    .trim()
    .min(1, "El nombre es obligatorio.")
    .max(120, "Nombre muy largo."),
});

export type BrandFormValues = z.output<typeof brandSchema>;
