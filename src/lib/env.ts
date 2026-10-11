import { createEnv } from "@t3-oss/env-nextjs";
import { z } from "zod";

/**
 * `.env` is commonly copied from `.env.example`, leaving optional variables
 * blank ("") instead of absent. This helper treats "" as unset so Zod does
 * not reject it through `.min(1)`/`.url()`/`.email()`.
 */
const optional = <T extends z.ZodType>(schema: T) =>
  z.preprocess((v) => (v === "" ? undefined : v), schema.optional());

/**
 * R2 variables are required when the server runs in production, so a deploy
 * cannot silently boot without image storage. `next build` also runs with
 * NODE_ENV=production but only has placeholders, so that phase, dev and test
 * keep them optional.
 */
const isProdRuntime =
  process.env.NODE_ENV === "production" &&
  process.env.NEXT_PHASE !== "phase-production-build";
const requiredAtProdRuntime = <T extends z.ZodType>(schema: T) =>
  isProdRuntime ? schema : optional(schema);

/**
 * Validates environment variables at startup. Missing values fail the process
 * with a clear message instead of breaking during a request.
 */
export const env = createEnv({
  server: {
    DATABASE_URL: z.url(),
    // Required for Auth.js to sign the session cookie.
    // Generate it with `openssl rand -base64 32`.
    AUTH_SECRET: z.string().min(32),
    R2_ACCOUNT_ID: requiredAtProdRuntime(z.string().min(1)),
    R2_ACCESS_KEY_ID: requiredAtProdRuntime(z.string().min(1)),
    R2_SECRET_ACCESS_KEY: requiredAtProdRuntime(z.string().min(1)),
    R2_BUCKET: requiredAtProdRuntime(z.string().min(1)),
    R2_PUBLIC_URL: requiredAtProdRuntime(z.url()),
    // Test-only overrides; production leaves both unset. They point the R2 S3
    // client and the reference-picture download at a local fake server.
    R2_ENDPOINT: optional(z.url()),
    REFERENCE_PICTURE_BASE_URL: optional(z.url()),
    ADMIN_SEED_EMAIL: optional(z.email()),
    ADMIN_SEED_PASSWORD: optional(z.string().min(8)),
  },
  client: {
    NEXT_PUBLIC_SITE_URL: z.url(),
  },
  runtimeEnv: {
    DATABASE_URL: process.env.DATABASE_URL,
    AUTH_SECRET: process.env.AUTH_SECRET,
    R2_ACCOUNT_ID: process.env.R2_ACCOUNT_ID,
    R2_ACCESS_KEY_ID: process.env.R2_ACCESS_KEY_ID,
    R2_SECRET_ACCESS_KEY: process.env.R2_SECRET_ACCESS_KEY,
    R2_BUCKET: process.env.R2_BUCKET,
    R2_PUBLIC_URL: process.env.R2_PUBLIC_URL,
    R2_ENDPOINT: process.env.R2_ENDPOINT,
    REFERENCE_PICTURE_BASE_URL: process.env.REFERENCE_PICTURE_BASE_URL,
    ADMIN_SEED_EMAIL: process.env.ADMIN_SEED_EMAIL,
    ADMIN_SEED_PASSWORD: process.env.ADMIN_SEED_PASSWORD,
    NEXT_PUBLIC_SITE_URL: process.env.NEXT_PUBLIC_SITE_URL,
  },
});
