"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { requireAdmin } from "@/lib/admin/guard";
import { prisma } from "@/lib/db";

/**
 * Toda accion de este archivo arranca con `requireAdmin()`. Una Server Action
 * es un endpoint POST publico: el layout de /admin no la protege.
 */

export type Resultado<T = undefined> =
  | ({ ok: true } & (T extends undefined ? object : { datos: T }))
  | { ok: false; mensaje: string; errores?: Record<string, string[]> };

function fallo(mensaje: string, errores?: Record<string, string[]>) {
  return { ok: false as const, mensaje, errores };
}

const nameEsSchema = z.string().trim().min(2).max(80);

export async function traducirNota(
  id: string,
  nameEs: string,
): Promise<Resultado> {
  await requireAdmin();

  const parseado = nameEsSchema.safeParse(nameEs);
  if (!parseado.success) {
    return fallo("La traducción tiene que tener entre 2 y 80 caracteres.");
  }

  await prisma.note.update({
    where: { id },
    data: { nameEs: parseado.data },
  });
  revalidatePath("/admin/notas");
  return { ok: true };
}

/** Deshace una traduccion cargada por error: vuelve la nota a "sin traducir". */
export async function borrarTraduccion(id: string): Promise<Resultado> {
  await requireAdmin();

  await prisma.note.update({
    where: { id },
    data: { nameEs: null },
  });
  revalidatePath("/admin/notas");
  return { ok: true };
}
