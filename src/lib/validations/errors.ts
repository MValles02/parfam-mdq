import type { z } from "zod";

/**
 * Flattens ZodError issues to `{ "variants.0.priceArs": [...] }` so forms can
 * render an error below the field that failed validation. Issues without a
 * path (whole-object refinements) are filed under `_`.
 *
 * Shared by the checkout, product, brand, and settings Server Actions.
 */
export function fieldErrors(error: z.ZodError): Record<string, string[]> {
  const errorsByField: Record<string, string[]> = {};
  for (const issue of error.issues) {
    const field = issue.path.join(".") || "_";
    (errorsByField[field] ??= []).push(issue.message);
  }
  return errorsByField;
}
