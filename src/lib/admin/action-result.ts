/**
 * Shared panel Server Action contract. It returns `ok: true` with optional
 * data, or `ok: false` with a message and field errors flattened by
 * `fieldErrors()` (`src/lib/validations/errors.ts`).
 *
 * The fields are serialized across the action boundary and consumed by panel
 * components in this application.
 */
export type ActionResult<T = undefined> =
  | ({ ok: true } & (T extends undefined ? object : { data: T }))
  | { ok: false; message: string; fieldErrors?: Record<string, string[]> };

/** Builds the failure branch of `ActionResult`. */
export function actionFailure<T = undefined>(
  message: string,
  fieldErrors?: Record<string, string[]>,
): ActionResult<T> {
  return { ok: false, message, fieldErrors };
}
