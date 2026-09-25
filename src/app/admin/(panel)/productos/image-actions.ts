"use server";

import { randomUUID } from "node:crypto";
import { z } from "zod";
import { requireAdmin } from "@/lib/admin/guard";
import { actionFailure, type ActionResult } from "@/lib/admin/action-result";
import {
  deleteR2Object,
  getUploadUrl,
  isProductStorageKey,
  isR2Configured,
  PRODUCT_STORAGE_PREFIX,
} from "@/lib/r2";

/**
 * Allowed image MIME types. This security validation binds a presigned URL to
 * one specific `Content-Type`, so clients cannot request arbitrary signatures.
 */
const EXTENSION_BY_CONTENT_TYPE: Record<string, string> = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
  "image/avif": "avif",
};

const EIGHT_MB = 8 * 1024 * 1024;

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
    .max(EIGHT_MB, "La imagen no puede pesar más de 8 MB."),
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
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, "0");
  const storageKey = `${PRODUCT_STORAGE_PREFIX}${year}/${month}/${randomUUID()}.${extension}`;

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

  await deleteR2Object(storageKey);
  return { ok: true };
}
