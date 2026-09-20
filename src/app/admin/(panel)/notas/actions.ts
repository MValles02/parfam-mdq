"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { requireAdmin } from "@/lib/admin/guard";
import { fallo, type Resultado } from "@/lib/admin/resultado";
import { prisma } from "@/lib/db";

/**
 * Toda accion de este archivo arranca con `requireAdmin()`. Una Server Action
 * es un endpoint POST publico: el layout de /admin no la protege.
 */

const nameEsSchema = z.string().trim().min(2).max(80);

/**
 * `nameEs` se muestra en público (pirámide olfativa y filtro de notas del
 * catálogo, con fallback a `nameEn`), así que traducir o destraducir una nota
 * tiene que invalidar la tienda igual que `actualizarMarca` -- no sólo
 * `/admin/notas` (ver F-10 en docs/findings.md). La lista de productos sale
 * de `ProductNote`, no hay forma de saber de antemano cuáles la muestran.
 */
async function revalidarNota(noteId: string) {
  const productos = await prisma.product.findMany({
    where: { notes: { some: { noteId } } },
    select: { slug: true },
  });

  revalidatePath("/");
  revalidatePath("/catalogo");
  for (const p of productos) revalidatePath(`/producto/${p.slug}`, "page");
}

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
  await revalidarNota(id);
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
  await revalidarNota(id);
  return { ok: true };
}
