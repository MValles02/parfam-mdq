import type { FieldValues, Path, UseFormSetError } from "react-hook-form";

/**
 * Shows the first server-side message for each field returned by a panel
 * Server Action (`ActionResult.fieldErrors`) below its form control.
 */
export function setServerFieldErrors<TFieldValues extends FieldValues>(
  setError: UseFormSetError<TFieldValues>,
  fieldErrors: Record<string, string[]> | undefined,
) {
  for (const [field, messages] of Object.entries(fieldErrors ?? {})) {
    setError(field as Path<TFieldValues>, { message: messages[0] });
  }
}
