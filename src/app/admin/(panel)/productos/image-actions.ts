"use server";

import { z } from "zod";
import { requireAdmin } from "@/lib/admin/guard";
import { actionFailure, type ActionResult } from "@/lib/admin/action-result";
import { prisma } from "@/lib/db";
import { trimWhiteMargins } from "@/lib/image-trim";
import {
  detectImageContentType,
  EXTENSION_BY_CONTENT_TYPE,
  MAX_IMAGE_BYTES,
} from "@/lib/image-type";
import {
  createProductStorageKey,
  deleteR2Object,
  getUploadUrl,
  isProductStorageKey,
  isR2Configured,
  putR2Object,
} from "@/lib/r2";

const uploadRequestSchema = z.object({
  fileName: z.string().trim().min(1).max(200),
  contentType: z.enum(
    Object.keys(EXTENSION_BY_CONTENT_TYPE) as [string, ...string[]],
    "Ese formato de imagen no está permitido.",
  ),
  sizeBytes: z
    .number()
    .int()
    .positive()
    .max(MAX_IMAGE_BYTES, "La imagen no puede pesar más de 8 MB."),
});

export async function requestUploadUrl(input: {
  fileName: string;
  contentType: string;
  sizeBytes: number;
}): Promise<ActionResult<{ uploadUrl: string; storageKey: string }>> {
  await requireAdmin();

  const parsedInput = uploadRequestSchema.safeParse(input);
  if (!parsedInput.success) {
    return actionFailure(
      parsedInput.error.issues[0]?.message ?? "Esa imagen no es válida.",
    );
  }

  if (!isR2Configured()) {
    return actionFailure(
      "Cloudflare R2 todavía no está configurado. Avisale al equipo para cargar las credenciales.",
    );
  }

  const { contentType } = parsedInput.data;
  const extension = EXTENSION_BY_CONTENT_TYPE[contentType]!;

  // The server creates the key. Browser filenames could allow path traversal
  // and collisions between uploads from different administrators.
  const storageKey = createProductStorageKey(extension);

  const uploadUrl = await getUploadUrl({ key: storageKey, contentType });

  // Return the key, rather than a public URL. The admin panel builds previews
  // from its server-provided host, and only the key is persisted.
  return { ok: true, data: { uploadUrl, storageKey } };
}

/**
 * Removes an R2 image discarded before saving its product. After persistence,
 * the product save flow owns bucket deletion.
 */
export async function deleteUploadedImage(
  storageKey: string,
): Promise<ActionResult> {
  await requireAdmin();

  // Client-provided keys must be constrained to product images before any
  // bucket object can be deleted.
  if (!isProductStorageKey(storageKey)) {
    return actionFailure("Esa imagen no es válida.");
  }
  if (!isR2Configured()) {
    return actionFailure("Cloudflare R2 todavía no está configurado.");
  }

  // This is a public POST endpoint (see AGENTS.md), so a client could ask for
  // any key it has ever seen, including one that already backs a saved
  // `ProductImage`. Deleting the bucket object for a key still referenced by
  // a row would leave that row pointing at nothing, so this action only ever
  // removes an object with no matching row.
  const persistedImage = await prisma.productImage.findFirst({
    where: { storageKey },
    select: { id: true },
  });
  if (persistedImage) {
    return actionFailure("Esa imagen ya está guardada en un producto.");
  }

  await deleteR2Object(storageKey);
  return { ok: true };
}

// ---------------------------------------------------------------------------
// Reference picture import
// ---------------------------------------------------------------------------

/**
 * fimgs.net serves Fragrantica's perfume bottle photo at this fixed path,
 * built from the dataset's numeric `pid`. The client never supplies this URL:
 * it is always derived here from a `pid` read from our own database.
 */
function buildReferencePictureUrl(pid: number): string {
  return `https://fimgs.net/mdimg/perfume/375x500.${pid}.jpg`;
}

const REFERENCE_PICTURE_FETCH_TIMEOUT_MS = 10_000;

/**
 * Identifies this server to fimgs.net as the admin panel's one-time picture
 * import, rather than a generic scraper. This app never bulk-downloads
 * Fragrantica images (see AGENTS.md); this fetch happens once per adoption.
 */
const REFERENCE_PICTURE_USER_AGENT =
  "ParfamMDQ-AdminPanel/1.0 (+https://github.com/parfam-mdq; single reference-picture import on product adoption)";

/**
 * Thrown by `readBodyWithCap` only when the body itself is too large.
 * Kept distinct from other read failures (a timeout abort, a connection
 * reset) so the caller can report an accurate reason instead of blaming
 * every failed read on the size cap.
 */
class ByteCapExceededError extends Error {}

/**
 * Reads a fetch `Response` body up to `maxBytes`, aborting as soon as that
 * cap is crossed instead of buffering the whole payload first. This is the
 * only defense against an oversized body when the server omits (or lies
 * about) `Content-Length`.
 */
async function readBodyWithCap(
  response: Response,
  maxBytes: number,
): Promise<Uint8Array> {
  const reader = response.body?.getReader();
  if (!reader) {
    const buffer = await response.arrayBuffer();
    if (buffer.byteLength > maxBytes) {
      throw new ByteCapExceededError("Response body exceeds the byte cap.");
    }
    return new Uint8Array(buffer);
  }

  const chunks: Uint8Array[] = [];
  let total = 0;
  for (;;) {
    const { done, value } = await reader.read();
    if (done) break;
    total += value.length;
    if (total > maxBytes) {
      await reader.cancel();
      throw new ByteCapExceededError("Response body exceeds the byte cap.");
    }
    chunks.push(value);
  }

  const result = new Uint8Array(total);
  let offset = 0;
  for (const chunk of chunks) {
    result.set(chunk, offset);
    offset += chunk.length;
  }
  return result;
}

/**
 * Downloads and validates a single Fragrantica reference picture, without
 * touching R2 or the database. Kept separate from `importReferencePicture` so
 * the network and validation path is a plain, reusable step; it is not
 * exported because every export of this file is a public Server Action and
 * this step alone skips `requireAdmin()`.
 */
async function fetchAndValidateReferencePicture(
  pid: number,
): Promise<
  | { ok: true; bytes: Uint8Array; contentType: string }
  | { ok: false; message: string }
> {
  let response: Response;
  try {
    response = await fetch(buildReferencePictureUrl(pid), {
      redirect: "manual",
      signal: AbortSignal.timeout(REFERENCE_PICTURE_FETCH_TIMEOUT_MS),
      headers: { "User-Agent": REFERENCE_PICTURE_USER_AGENT },
    });
  } catch {
    return {
      ok: false,
      message: "No pudimos conectarnos con Fragrantica. Probá de nuevo.",
    };
  }

  if (response.status !== 200) {
    return {
      ok: false,
      message: "Fragrantica no tiene esa foto disponible.",
    };
  }

  const contentLength = response.headers.get("content-length");
  if (contentLength && Number(contentLength) > MAX_IMAGE_BYTES) {
    return {
      ok: false,
      message: "La foto de referencia pesa más de lo permitido.",
    };
  }

  let bytes: Uint8Array;
  try {
    bytes = await readBodyWithCap(response, MAX_IMAGE_BYTES);
  } catch (error) {
    if (error instanceof ByteCapExceededError) {
      return {
        ok: false,
        message: "La foto de referencia pesa más de lo permitido.",
      };
    }
    // A timeout abort or a connection reset while streaming the body is a
    // different failure than an oversized payload; report it without
    // leaking the underlying error to the client.
    return {
      ok: false,
      message: "No pudimos descargar la foto de referencia. Probá de nuevo.",
    };
  }

  // The response's declared Content-Type is not trusted for this decision;
  // the bytes are sniffed the same way a manual upload would be.
  const detectedContentType = detectImageContentType(bytes);
  if (
    !detectedContentType ||
    !(detectedContentType in EXTENSION_BY_CONTENT_TYPE)
  ) {
    return {
      ok: false,
      message: "La foto de referencia no es una imagen válida.",
    };
  }

  return { ok: true, bytes, contentType: detectedContentType };
}

const referenceIdSchema = z.string().trim().min(1).max(40);

/**
 * Copies the picture of an adopted reference into R2, once, so it appears in
 * the product's image carousel alongside manually uploaded photos. The client
 * only supplies the `FragranceRef` id; the download URL is always derived
 * server-side from that row's `pid`, never from client input.
 */
export async function importReferencePicture(
  fragranceRefId: string,
): Promise<ActionResult<{ storageKey: string }>> {
  await requireAdmin();

  const parsedId = referenceIdSchema.safeParse(fragranceRefId);
  if (!parsedId.success) {
    return actionFailure("Esa referencia no es válida.");
  }

  if (!isR2Configured()) {
    return actionFailure(
      "Cloudflare R2 todavía no está configurado. Avisale al equipo para cargar las credenciales.",
    );
  }

  const reference = await prisma.fragranceRef.findUnique({
    where: { id: parsedId.data },
    select: { pid: true },
  });
  if (!reference) {
    return actionFailure(
      "Esa fragancia ya no está en el catálogo de referencia.",
    );
  }

  const downloaded = await fetchAndValidateReferencePicture(reference.pid);
  if (!downloaded.ok) {
    return actionFailure(downloaded.message);
  }

  // Fragrantica's photo has wide white margins around the bottle; trim them
  // before upload so the product carousel shows a tighter crop. This is a
  // best-effort step (see `trimWhiteMargins` in `src/lib/image-trim.ts`): it
  // falls back to the original, already-validated bytes and content type
  // whenever trimming doesn't help, so it can never turn a valid downloaded
  // photo into an upload failure.
  const { bytes, contentType } = await trimWhiteMargins(downloaded.bytes);
  const extension = EXTENSION_BY_CONTENT_TYPE[contentType]!;
  const storageKey = createProductStorageKey(extension);
  await putR2Object({
    key: storageKey,
    body: bytes,
    contentType,
  });

  return { ok: true, data: { storageKey } };
}
