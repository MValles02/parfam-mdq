import { z } from "zod";

/**
 * The `Brand` slug stays unchanged because it is the `/marca/[slug]` URL and
 * already appears in the sitemap. Only `name` can be edited.
 */
export const brandSchema = z.object({
  name: z
    .string()
    .trim()
    .min(1, "El nombre es obligatorio.")
    .max(120, "Nombre muy largo."),
});

export type BrandFormValues = z.output<typeof brandSchema>;
