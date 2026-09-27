"use server";

import { redirect } from "next/navigation";
import { AuthError } from "next-auth";
import { z } from "zod";
import { RateLimitedSignin, signIn } from "@/lib/auth";

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
    if (error instanceof RateLimitedSignin) {
      const retryAfterMinutes = Math.ceil(error.retryAfter / 60);
      return {
        error: `Demasiados intentos. Probá de nuevo en ${retryAfterMinutes} ${retryAfterMinutes === 1 ? "minuto" : "minutos"}.`,
      };
    }
    if (error instanceof AuthError) {
      return { error: INVALID_CREDENTIALS_MESSAGE };
    }
    throw error;
  }

  redirect(returnTo);
}
