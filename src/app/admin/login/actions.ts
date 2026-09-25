"use server";

import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { AuthError } from "next-auth";
import { z } from "zod";
import { signIn } from "@/lib/auth";
import { rateLimit, resetRateLimit } from "@/lib/rate-limit";

const loginSchema = z.object({
  email: z.email("Revisá el email."),
  password: z.string().min(1, "Escribí tu contraseña."),
});

export interface LoginState {
  error?: string;
}

/** The response intentionally does not reveal whether the email exists. */
const INVALID_CREDENTIALS_MESSAGE = "Email o contraseña incorrectos.";

export async function authenticate(
  _prevState: LoginState,
  formData: FormData,
): Promise<LoginState> {
  const parsed = loginSchema.safeParse({
    email: formData.get("email"),
    password: formData.get("password"),
  });

  if (!parsed.success) {
    return {
      error: parsed.error.issues[0]?.message ?? INVALID_CREDENTIALS_MESSAGE,
    };
  }

  const headerList = await headers();
  const ipAddress =
    headerList.get("x-forwarded-for")?.split(",")[0]?.trim() ??
    headerList.get("x-real-ip") ??
    "unknown";
  const rateLimitKey = `login:${ipAddress}:${parsed.data.email.toLowerCase()}`;

  const limit = rateLimit(rateLimitKey, {
    limit: 5,
    windowMs: 1000 * 60 * 10,
  });
  if (!limit.ok) {
    const retryAfterMinutes = Math.ceil(limit.retryAfter / 60);
    return {
      error: `Demasiados intentos. Probá de nuevo en ${retryAfterMinutes} ${retryAfterMinutes === 1 ? "minuto" : "minutos"}.`,
    };
  }

  // Accept a submitted legacy form from a tab opened before this deployment.
  const rawReturnTo = formData.get("returnTo") ?? formData.get("volverA");
  const returnTo =
    typeof rawReturnTo === "string" && rawReturnTo.startsWith("/admin")
      ? rawReturnTo
      : "/admin";

  try {
    await signIn("credentials", {
      email: parsed.data.email,
      password: parsed.data.password,
      redirect: false,
    });
  } catch (error) {
    if (error instanceof AuthError) {
      return { error: INVALID_CREDENTIALS_MESSAGE };
    }
    throw error;
  }

  resetRateLimit(rateLimitKey);
  redirect(returnTo);
}
