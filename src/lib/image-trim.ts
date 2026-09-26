// No `server-only` package is installed in this repo (see package.json), so
// this comment is the guard instead: this module wraps `sharp`, a native
// Node binding that is not bundled for the browser, and must never be
// imported by a Client Component (see AGENTS.md, "Client Components cannot
// import modules that bring Prisma" — the same boundary applies to any
// Node-only dependency).
import sharp from "sharp";
import { detectImageContentType } from "./image-type";

/**
 * Caps the pixels `sharp` will decode for a single image, independent of the
 * 8 MB byte cap already enforced before this module ever sees the bytes (see
 * `MAX_IMAGE_BYTES` in `src/lib/image-type.ts`). This is a defense against a
 * decompression-bomb style input: a small file that decodes into an enormous
 * bitmap. 50 megapixels is far above any legitimate 375x500 reference photo.
 */
const MAX_TRIM_INPUT_PIXELS = 50_000_000;

/** Reference photos have a plain white background; this is what gets cropped. */
const WHITE_BACKGROUND = "#ffffff";

/** Allowed per-channel difference from the background color while trimming. */
const TRIM_THRESHOLD = 15;

/** Uniform white padding added back after trimming, as a fraction of the trimmed image's larger side. */
const PADDING_RATIO = 0.04;

/**
 * Below this fraction of the original size, a trim is treated as having gone
 * wrong (e.g. a non-white photo where trimming cropped into the subject)
 * rather than as a legitimately tight crop. Compared against the trimmed
 * image's larger side vs. the original's larger side rather than full pixel
 * area: a slender, centered bottle can legitimately retain most of the
 * frame's height (or width) while still covering well under 40% of its
 * total area, so an area-product comparison would reject normal crops.
 */
const MIN_SCALE_RATIO = 0.4;

/** Below this width or height (in pixels), a trimmed result is treated as unusable. */
const MIN_TRIMMED_DIMENSION_PX = 64;

/** JPEG quality used for the re-encoded, trimmed output. */
const TRIMMED_JPEG_QUALITY = 90;

export type TrimmedContentType =
  "image/jpeg" | "image/png" | "image/webp" | "image/avif";

export interface TrimResult {
  bytes: Uint8Array;
  contentType: TrimmedContentType;
  trimmed: boolean;
}

/**
 * Trims the white margins around a Fragrantica reference photo (a fixed
 * 375x500 JPEG on a white background) so the bottle fills more of the frame,
 * then adds back a small uniform white pad so it isn't flush against the
 * edge. Re-encodes as JPEG, keeping the white background: the store
 * composites product photos onto white with a CSS `multiply` blend (see
 * `docs/modules/image-storage.md`), so a white backdrop must survive the
 * round-trip.
 *
 * This only ever crops and pads; it never resizes up, so the output can
 * never be a larger bitmap than what trimming actually found.
 *
 * Falls back to the original bytes with `trimmed: false` whenever trimming
 * would make things worse, found nothing to crop, or fails outright: bytes
 * that don't decode as an image, a trim that didn't shrink the image at all
 * (an all-white or near-uniform input, where there are no margins to
 * remove), a trim that shrank the image to less than ~40% of its original
 * size (a sign the photo wasn't mostly white, or trimming cropped into the
 * subject), or a trimmed result narrower or shorter than a small icon. This
 * is called from a Server Action reachable by any authenticated admin
 * (`importReferencePicture` in
 * `src/app/admin/(panel)/productos/image-actions.ts`), so it must never
 * throw for a merely unusual photo — the caller has no fallback path besides
 * this one.
 *
 * The fallback content type is sniffed from `input` itself
 * (`detectImageContentType`, see `src/lib/image-type.ts`), not assumed to be
 * JPEG: this function only re-encodes as JPEG when it actually trims, so a
 * caller that skips its own magic-byte check could otherwise get bytes
 * returned under the wrong content type.
 */
export async function trimWhiteMargins(input: Uint8Array): Promise<TrimResult> {
  const detectedContentType = detectImageContentType(
    input,
  ) as TrimmedContentType | null;
  const original: TrimResult = {
    bytes: input,
    contentType: detectedContentType ?? "image/jpeg",
    trimmed: false,
  };

  try {
    const buffer = Buffer.from(input);

    const metadata = await sharp(buffer, {
      limitInputPixels: MAX_TRIM_INPUT_PIXELS,
    }).metadata();
    const originalWidth = metadata.width;
    const originalHeight = metadata.height;
    if (!originalWidth || !originalHeight) {
      return original;
    }

    const { data: trimmedData, info: trimmedInfo } = await sharp(buffer, {
      limitInputPixels: MAX_TRIM_INPUT_PIXELS,
    })
      .trim({ background: WHITE_BACKGROUND, threshold: TRIM_THRESHOLD })
      .toBuffer({ resolveWithObject: true });

    // No reduction at all means `.trim()` found nothing far enough from
    // white to crop (e.g. an all-white photo) — there is nothing gained by
    // re-encoding, so this does not count as a trim.
    const noReduction =
      trimmedInfo.width >= originalWidth &&
      trimmedInfo.height >= originalHeight;

    const originalLargerSide = Math.max(originalWidth, originalHeight);
    const trimmedLargerSide = Math.max(trimmedInfo.width, trimmedInfo.height);

    if (
      noReduction ||
      trimmedInfo.width < MIN_TRIMMED_DIMENSION_PX ||
      trimmedInfo.height < MIN_TRIMMED_DIMENSION_PX ||
      trimmedLargerSide < originalLargerSide * MIN_SCALE_RATIO
    ) {
      return original;
    }

    const padding = Math.round(
      Math.max(trimmedInfo.width, trimmedInfo.height) * PADDING_RATIO,
    );

    const paddedBuffer = await sharp(trimmedData, {
      limitInputPixels: MAX_TRIM_INPUT_PIXELS,
    })
      .extend({
        top: padding,
        bottom: padding,
        left: padding,
        right: padding,
        background: WHITE_BACKGROUND,
      })
      .jpeg({ quality: TRIMMED_JPEG_QUALITY, mozjpeg: true })
      .toBuffer();

    return {
      bytes: new Uint8Array(paddedBuffer),
      contentType: "image/jpeg",
      trimmed: true,
    };
  } catch {
    return original;
  }
}
