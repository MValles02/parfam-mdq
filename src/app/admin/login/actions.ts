"use server";

import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { AuthError } from "next-auth";
import { z } from "zod";
import { signIn } from "@/lib/auth";
import { rateLimit, resetRateLimit } from "@/lib/rate-limit";

const schema = z.object({
  email: z.email("Revisá el email."),
  password: z.string().min(1, "Escribí tu contraseña."),
});

export interface LoginState {
  error?: string;
}

/** Mensaje genérico a propósito: no revelamos si el email existe o no. */
const CREDENCIALES_INVALIDAS = "Email o contraseña incorrectos.";

export async function login(
  _prevState: LoginState,
  formData: FormData,
): Promise<LoginState> {
  const parsed = schema.safeParse({
    email: formData.get("email"),
    password: formData.get("password"),
  });

  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? CREDENCIALES_INVALIDAS };
  }

  const headerList = await headers();
  const ip =
    headerList.get("x-forwarded-for")?.split(",")[0]?.trim() ??
    headerList.get("x-real-ip") ??
    "desconocida";
  const key = `login:${ip}:${parsed.data.email.toLowerCase()}`;

  const limit = rateLimit(key, { limit: 5, windowMs: 1000 * 60 * 10 });
  if (!limit.ok) {
    const minutos = Math.ceil(limit.retryAfter / 60);
    return {
      error: `Demasiados intentos. Probá de nuevo en ${minutos} ${minutos === 1 ? "minuto" : "minutos"}.`,
    };
  }

  const volverA = formData.get("volverA");
  const destino =
    typeof volverA === "string" && volverA.startsWith("/admin")
      ? volverA
      : "/admin";

  try {
    await signIn("credentials", {
      email: parsed.data.email,
      password: parsed.data.password,
      redirect: false,
    });
  } catch (error) {
    if (error instanceof AuthError) {
      return { error: CREDENCIALES_INVALIDAS };
    }
    throw error;
  }

  resetRateLimit(key);
  redirect(destino);
}
