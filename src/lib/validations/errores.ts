import type { z } from "zod";

/**
 * Aplana los issues de un `ZodError` a `{ "variants.0.priceArs": [...] }`,
 * para pintar el error debajo del campo del formulario que falló.
 *
 * Antes vivía copiada, idéntica, en cuatro Server Actions (`checkout`,
 * `productos`, `marcas`, `configuracion`) -- ver F-11 en `docs/findings.md`.
 */
export function erroresPorCampo(error: z.ZodError): Record<string, string[]> {
  const salida: Record<string, string[]> = {};
  for (const issue of error.issues) {
    const clave = issue.path.join(".") || "_";
    (salida[clave] ??= []).push(issue.message);
  }
  return salida;
}
