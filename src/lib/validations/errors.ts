import type { z } from "zod";

/**
 * Flattens ZodError issues to `{ "variants.0.priceArs": [...] }` so forms can
 * render an error below the field that failed validation.
 *
 * This replaces duplicated implementations across checkout, product, brand,
 * and settings Server Actions; see F-11 in docs/findings.md.
 */
export function fieldErrors(error: z.ZodError): Record<string, string[]> {
  const errorsByField: Record<string, string[]> = {};
  for (const issue of error.issues) {
    const field = issue.path.join(".") || "_";
    (errorsByField[field] ??= []).push(issue.message);
  }
  return errorsByField;
}
