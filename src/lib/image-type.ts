/**
 * Image format constraints shared by the manual upload flow (presigned R2
 * URLs) and the reference-picture import flow (`importReferencePicture` in
 * `src/app/admin/(panel)/productos/image-actions.ts`).
 *
 * This module has no Prisma dependency and no Node-only APIs beyond
 * `Uint8Array`, so it can validate bytes coming from either a browser upload
 * or a server-side fetch of a remote image.
 */

/**
 * Allowed image MIME types. This security validation binds a presigned URL to
 * one specific `Content-Type`, so clients cannot request arbitrary signatures,
 * and it constrains which formats the reference-picture import accepts.
 */
export const EXTENSION_BY_CONTENT_TYPE: Record<string, string> = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
  "image/avif": "avif",
};

/** Maximum size accepted for any image entering R2, manual or imported. */
export const MAX_IMAGE_BYTES = 8 * 1024 * 1024;

/**
 * Identifies an image format from its magic number, ignoring any
 * caller-supplied `Content-Type`. Only the reference-picture import
 * (`fetchAndValidateReferencePicture` in
 * `src/app/admin/(panel)/productos/image-actions.ts`) calls this: it sniffs
 * the bytes fimgs.net actually sent instead of trusting that server's
 * declared type. Manual uploads never reach this function — they go straight
 * from the browser to R2 through a presigned URL whose signature is bound to
 * the `Content-Type` declared in `requestUploadUrl`.
 *
 * Returns null when the bytes are too short to hold a recognizable header or
 * match none of the four formats this app accepts.
 */
export function detectImageContentType(bytes: Uint8Array): string | null {
  // JPEG: SOI marker.
  if (
    bytes.length >= 3 &&
    bytes[0] === 0xff &&
    bytes[1] === 0xd8 &&
    bytes[2] === 0xff
  ) {
    return "image/jpeg";
  }

  // PNG: fixed 8-byte signature.
  if (
    bytes.length >= 8 &&
    bytes[0] === 0x89 &&
    bytes[1] === 0x50 &&
    bytes[2] === 0x4e &&
    bytes[3] === 0x47 &&
    bytes[4] === 0x0d &&
    bytes[5] === 0x0a &&
    bytes[6] === 0x1a &&
    bytes[7] === 0x0a
  ) {
    return "image/png";
  }

  // WebP: a RIFF container whose form type is "WEBP".
  if (
    bytes.length >= 12 &&
    bytes[0] === 0x52 && // R
    bytes[1] === 0x49 && // I
    bytes[2] === 0x46 && // F
    bytes[3] === 0x46 && // F
    bytes[8] === 0x57 && // W
    bytes[9] === 0x45 && // E
    bytes[10] === 0x42 && // B
    bytes[11] === 0x50 // P
  ) {
    return "image/webp";
  }

  // AVIF: an ISOBMFF "ftyp" box (type at offset 4..7). Either the major
  // brand (offset 8..11) is directly "avif" (single image) or "avis" (image
  // sequence), or the major brand is the generic MIAF/HEIF container
  // ("mif1"/"msf1") and "avif"/"avis" appears among the compatible brands
  // that follow the 4-byte minor version (offset 16 onward), each also 4
  // bytes wide. That list is read only up to the box's own declared size
  // (offset 0..3, big-endian) and never past the end of the buffer, so a
  // truncated or lied-about size cannot make this read outside the box or
  // outside `bytes`.
  if (
    bytes.length >= 12 &&
    bytes[4] === 0x66 && // f
    bytes[5] === 0x74 && // t
    bytes[6] === 0x79 && // y
    bytes[7] === 0x70 // p
  ) {
    const majorBrand = String.fromCharCode(
      bytes[8]!,
      bytes[9]!,
      bytes[10]!,
      bytes[11]!,
    );
    if (majorBrand === "avif" || majorBrand === "avis") return "image/avif";

    if (majorBrand === "mif1" || majorBrand === "msf1") {
      const boxSize =
        ((bytes[0]! << 24) |
          (bytes[1]! << 16) |
          (bytes[2]! << 8) |
          bytes[3]!) >>>
        0;
      const boxEnd = Math.min(boxSize, bytes.length);
      for (let offset = 16; offset + 4 <= boxEnd; offset += 4) {
        const compatibleBrand = String.fromCharCode(
          bytes[offset]!,
          bytes[offset + 1]!,
          bytes[offset + 2]!,
          bytes[offset + 3]!,
        );
        if (compatibleBrand === "avif" || compatibleBrand === "avis") {
          return "image/avif";
        }
      }
    }
  }

  return null;
}
