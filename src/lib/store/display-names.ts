/**
 * Display formatting shared by the store query DTOs. Dictionary names
 * (accords, notes) can be stored lowercase, so they are capitalized for the
 * customer-facing UI.
 */

export function capitalize(text: string): string {
  return text.charAt(0).toUpperCase() + text.slice(1);
}

/** Spanish note name, falling back to the English one when untranslated. */
export function getNoteName(note: {
  nameEs: string | null;
  nameEn: string;
}): string {
  return capitalize(note.nameEs ?? note.nameEn);
}

/** Admin-written alt text, or "<product> de <brand>" when there is none. */
export function getImageAlt(
  alt: string | null,
  product: { name: string; brandName: string },
): string {
  return alt ?? product.name + " de " + product.brandName;
}
