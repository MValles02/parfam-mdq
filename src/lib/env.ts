import { createEnv } from "@t3-oss/env-nextjs";
import { z } from "zod";

/**
 * `.env` suele copiarse de `.env.example` con las variables opcionales en
 * blanco ("") en vez de ausentes — este helper trata "" como "no seteada"
 * para que zod no las rechace por `.min(1)`/`.url()`/`.email()`.
 */
const optional = <T extends z.ZodType>(schema: T) =>
  z.preprocess((v) => (v === "" ? undefined : v), schema.optional());

/**
 * Valida las variables de entorno al arrancar: si falta algo, el proceso
 * falla acá con un mensaje claro en vez de romperse a mitad de un request.
 */
export const env = createEnv({
  server: {
    DATABASE_URL: z.url(),
    AUTH_SECRET: optional(z.string().min(1)),
    R2_ACCOUNT_ID: optional(z.string().min(1)),
    R2_ACCESS_KEY_ID: optional(z.string().min(1)),
    R2_SECRET_ACCESS_KEY: optional(z.string().min(1)),
    R2_BUCKET: optional(z.string().min(1)),
    R2_PUBLIC_URL: optional(z.url()),
    ADMIN_SEED_EMAIL: optional(z.email()),
    ADMIN_SEED_PASSWORD: optional(z.string().min(8)),
  },
  client: {
    NEXT_PUBLIC_SITE_URL: z.url(),
    NEXT_PUBLIC_UMAMI_URL: optional(z.url()),
    NEXT_PUBLIC_UMAMI_WEBSITE_ID: optional(z.string().min(1)),
  },
  runtimeEnv: {
    DATABASE_URL: process.env.DATABASE_URL,
    AUTH_SECRET: process.env.AUTH_SECRET,
    R2_ACCOUNT_ID: process.env.R2_ACCOUNT_ID,
    R2_ACCESS_KEY_ID: process.env.R2_ACCESS_KEY_ID,
    R2_SECRET_ACCESS_KEY: process.env.R2_SECRET_ACCESS_KEY,
    R2_BUCKET: process.env.R2_BUCKET,
    R2_PUBLIC_URL: process.env.R2_PUBLIC_URL,
    ADMIN_SEED_EMAIL: process.env.ADMIN_SEED_EMAIL,
    ADMIN_SEED_PASSWORD: process.env.ADMIN_SEED_PASSWORD,
    NEXT_PUBLIC_SITE_URL: process.env.NEXT_PUBLIC_SITE_URL,
    NEXT_PUBLIC_UMAMI_URL: process.env.NEXT_PUBLIC_UMAMI_URL,
    NEXT_PUBLIC_UMAMI_WEBSITE_ID: process.env.NEXT_PUBLIC_UMAMI_WEBSITE_ID,
  },
});
