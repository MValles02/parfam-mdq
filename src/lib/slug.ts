import slugify from "slugify";

/**
 * Brand, product, and reference-catalog slugs must share these options so
 * slugs produced by the panel and by the reference importer stay compatible.
 */
export function toSlug(text: string) {
  return slugify(text, { lower: true, strict: true, trim: true });
}
