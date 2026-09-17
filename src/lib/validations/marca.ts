import { z } from "zod";

/**
 * El `slug` de `Brand` no se toca desde acá: es la URL de `/marca/[slug]` y
 * ya está en el sitemap (AGENTS.md/PLAN.md, Fase 6). Sólo se edita `name`.
 */
export const marcaSchema = z.object({
  name: z
    .string()
    .trim()
    .min(1, "El nombre es obligatorio.")
    .max(120, "Nombre muy largo."),
});

export type MarcaFormValues = z.output<typeof marcaSchema>;
