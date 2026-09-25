import {
  DeleteObjectCommand,
  PutObjectCommand,
  S3Client,
} from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { env } from "@/lib/env";

/**
 * Cloudflare R2 client compatible with the S3 API.
 *
 * Credentials are optional in `env.ts` because the bucket might not yet exist.
 * This module must load without breaking a build or server startup when its
 * five variables are blank. The client is therefore lazy: it only exists when
 * a caller uploads or deletes an object.
 */

const UPLOAD_URL_EXPIRATION_SECONDS = 5 * 60;

/** Returns true when all five variables required to access R2 are present. */
export function isR2Configured(): boolean {
  return Boolean(
    env.R2_ACCOUNT_ID &&
    env.R2_ACCESS_KEY_ID &&
    env.R2_SECRET_ACCESS_KEY &&
    env.R2_BUCKET &&
    env.R2_PUBLIC_URL,
  );
}

/**
 * Returns validated credentials or throws the not-configured error. This keeps
 * lower helpers from repeating the check and makes non-null assertions safe.
 */
function getCredentials() {
  if (!isR2Configured()) {
    throw new Error("Cloudflare R2 is not configured yet.");
  }
  return {
    accountId: env.R2_ACCOUNT_ID!,
    accessKeyId: env.R2_ACCESS_KEY_ID!,
    secretAccessKey: env.R2_SECRET_ACCESS_KEY!,
    bucket: env.R2_BUCKET!,
    publicUrl: env.R2_PUBLIC_URL!,
  };
}

// Cache the client after the first operation instead of creating it on import.
let client: S3Client | undefined;

function getClient(): S3Client {
  const { accountId, accessKeyId, secretAccessKey } = getCredentials();
  if (!client) {
    client = new S3Client({
      region: "auto",
      endpoint: `https://${accountId}.r2.cloudflarestorage.com`,
      credentials: { accessKeyId, secretAccessKey },
    });
  }
  return client;
}

/**
 * Generates a signed URL for a direct browser PUT upload. The file never
 * passes through this server and the URL expires quickly after this immediate
 * upload.
 */
export async function getUploadUrl(options: {
  key: string;
  contentType: string;
}): Promise<string> {
  const { bucket } = getCredentials();
  const command = new PutObjectCommand({
    Bucket: bucket,
    Key: options.key,
    ContentType: options.contentType,
  });
  return getSignedUrl(getClient(), command, {
    expiresIn: UPLOAD_URL_EXPIRATION_SECONDS,
  });
}

/**
 * Builds an object's public URL from its key. It returns null when R2 is not
 * configured, allowing queries to call it directly and UI to use the bottle
 * placeholder.
 *
 * This is the only function that knows the public host. The database stores
 * only the key, so changing the public domain only requires R2_PUBLIC_URL.
 */
export function getPublicUrl(key: string): string | null {
  if (!env.R2_PUBLIC_URL) return null;
  return `${env.R2_PUBLIC_URL.replace(/\/$/, "")}/${key}`;
}

/** Prefix for every object uploaded from the admin panel. */
export const PRODUCT_STORAGE_PREFIX = "products/";

/**
 * Keys arrive as client data through the form. This prevents a request from
 * using "../" or targeting an object outside the admin prefix.
 */
export function isProductStorageKey(key: string): boolean {
  return (
    key.startsWith(PRODUCT_STORAGE_PREFIX) &&
    !key.includes("..") &&
    key.length <= 512
  );
}

export async function deleteR2Object(key: string): Promise<void> {
  const { bucket } = getCredentials();
  await getClient().send(new DeleteObjectCommand({ Bucket: bucket, Key: key }));
}
