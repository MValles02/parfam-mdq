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
  if (hasBytesAt(bytes, 0, JPEG_START_OF_IMAGE)) return "image/jpeg";
  if (hasBytesAt(bytes, 0, PNG_SIGNATURE)) return "image/png";

  // WebP: a RIFF container whose form type is "WEBP".
  if (hasBytesAt(bytes, 0, RIFF) && hasBytesAt(bytes, 8, WEBP)) {
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
  if (bytes.length >= 12 && hasBytesAt(bytes, 4, FTYP)) {
    const majorBrand = readFourCharacterCode(bytes, 8);
    if (AVIF_BRANDS.has(majorBrand)) return "image/avif";

    if (HEIF_CONTAINER_BRANDS.has(majorBrand)) {
      const boxSize =
        ((bytes[0]! << 24) |
          (bytes[1]! << 16) |
          (bytes[2]! << 8) |
          bytes[3]!) >>>
        0;
      const boxEnd = Math.min(boxSize, bytes.length);
      for (let offset = 16; offset + 4 <= boxEnd; offset += 4) {
        if (AVIF_BRANDS.has(readFourCharacterCode(bytes, offset))) {
          return "image/avif";
        }
      }
    }
  }

  return null;
}

const JPEG_START_OF_IMAGE = [0xff, 0xd8, 0xff];
const PNG_SIGNATURE = [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a];
const RIFF = asciiBytes("RIFF");
const WEBP = asciiBytes("WEBP");
const FTYP = asciiBytes("ftyp");
const AVIF_BRANDS = new Set(["avif", "avis"]);
const HEIF_CONTAINER_BRANDS = new Set(["mif1", "msf1"]);

function asciiBytes(text: string): number[] {
  return Array.from(text, (character) => character.charCodeAt(0));
}

/** True when `bytes` holds exactly `expected` starting at `offset`. */
function hasBytesAt(
  bytes: Uint8Array,
  offset: number,
  expected: readonly number[],
): boolean {
  return (
    bytes.length >= offset + expected.length &&
    expected.every((value, index) => bytes[offset + index] === value)
  );
}

/** Reads the 4-byte ASCII code (an ISOBMFF box type or brand) at `offset`. */
function readFourCharacterCode(bytes: Uint8Array, offset: number): string {
  return String.fromCharCode(
    bytes[offset]!,
    bytes[offset + 1]!,
    bytes[offset + 2]!,
    bytes[offset + 3]!,
  );
}
