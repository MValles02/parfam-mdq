/**
 * Contrato compartido de las Server Actions del panel: `ok: true` con datos
 * opcionales, o `ok: false` con un mensaje y los errores de campo ya
 * aplanados por `erroresPorCampo()` (`src/lib/validations/errores.ts`).
 *
 * Antes vivía repetido, literal, en seis archivos de `src/app/admin/(panel)/*`
 * -- ver F-11 en `docs/findings.md`.
 */
export type Resultado<T = undefined> =
  | ({ ok: true } & (T extends undefined ? object : { datos: T }))
  | { ok: false; mensaje: string; errores?: Record<string, string[]> };

/**
 * Antes vivia repetida, con firmas ligeramente distintas, en los mismos seis
 * archivos de Server Actions del panel que duplicaban `Resultado<T>` -- ver
 * F-11 en docs/findings.md, que unifico el tipo pero no esta funcion.
 */
export function fallo<T = undefined>(
  mensaje: string,
  errores?: Record<string, string[]>,
): Resultado<T> {
  return { ok: false, mensaje, errores };
}
