"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { requireAdmin } from "@/lib/admin/guard";
import { actionFailure, type ActionResult } from "@/lib/admin/action-result";
import { prisma } from "@/lib/db";

/**
 * Every action in this file starts with `requireAdmin()`. A Server Action is
 * a public POST endpoint, so the `/admin` layout does not protect it.
 */

const nameEsSchema = z.string().trim().min(2).max(80);

/**
 * `nameEs` appears publicly in the note pyramid and catalog filter, with a
 * `nameEn` fallback. Translating or clearing a translation must invalidate
 * store pages as well as `/admin/notas`. Product references come from
 * `ProductNote`, so their full set is only known from the database.
 */
async function revalidateNote(noteId: string) {
  const products = await prisma.product.findMany({
    where: { notes: { some: { noteId } } },
    select: { slug: true },
  });

  revalidatePath("/");
  revalidatePath("/catalogo");
  for (const product of products)
    revalidatePath(`/producto/${product.slug}`, "page");
}

export async function translateNote(
  id: string,
  nameEs: string,
): Promise<ActionResult> {
  await requireAdmin();

  const parsed = nameEsSchema.safeParse(nameEs);
  if (!parsed.success) {
    return actionFailure(
      "La traducción tiene que tener entre 2 y 80 caracteres.",
    );
  }

  await prisma.note.update({
    where: { id },
    data: { nameEs: parsed.data },
  });
  revalidatePath("/admin/notas");
  await revalidateNote(id);
  return { ok: true };
}

/** Clears an incorrectly entered translation and returns the note to pending. */
export async function clearNoteTranslation(id: string): Promise<ActionResult> {
  await requireAdmin();

  await prisma.note.update({
    where: { id },
    data: { nameEs: null },
  });
  revalidatePath("/admin/notas");
  await revalidateNote(id);
  return { ok: true };
}
