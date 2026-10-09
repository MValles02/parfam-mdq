export type ProductImageItem = {
  id: string | null; // null means it is not yet persisted.
  /** R2 object key. This is the only image value stored in the database. */
  storageKey: string;
  alt: string | null;
  isPrimary: boolean;
};

/** Appends a not-yet-persisted image; the first image becomes the primary one. */
export function appendNewImage(
  images: ProductImageItem[],
  storageKey: string,
): ProductImageItem[] {
  return [
    ...images,
    { id: null, storageKey, alt: null, isPrimary: images.length === 0 },
  ];
}

/**
 * Removes the image at `index`. When it was the primary image, the first
 * remaining image takes over, so the "exactly one primary" rule in
 * `productSchema` still holds.
 */
export function removeImageAt(
  images: ProductImageItem[],
  index: number,
): ProductImageItem[] {
  const remainingImages = images.filter(
    (_, imageIndex) => imageIndex !== index,
  );
  if (images[index]!.isPrimary && remainingImages.length > 0) {
    remainingImages[0] = { ...remainingImages[0]!, isPrimary: true };
  }
  return remainingImages;
}
