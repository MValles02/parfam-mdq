/**
 * Shared panel Server Action contract. It returns `ok: true` with optional
 * data, or `ok: false` with a message and field errors flattened by
 * `fieldErrors()` (`src/lib/validations/errors.ts`).
 *
 * The fields `datos`, `mensaje`, and `errores` are existing serialized action
 * boundary keys and remain stable for current clients.
 */
export type ActionResult<T = undefined> =
  | ({ ok: true } & (T extends undefined ? object : { datos: T }))
  | { ok: false; mensaje: string; errores?: Record<string, string[]> };

/**
 * This replaces the slightly different failure helpers previously repeated by
 * panel Server Actions.
 */
export function actionFailure<T = undefined>(
  message: string,
  fieldErrors?: Record<string, string[]>,
): ActionResult<T> {
  return { ok: false, mensaje: message, errores: fieldErrors };
}
