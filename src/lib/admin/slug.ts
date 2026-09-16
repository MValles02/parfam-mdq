import slugify from "slugify";
import type { Prisma } from "@/generated/prisma/client";

/** Mismas opciones que usa el importador, para que marca y producto coincidan. */
export function aSlug(texto: string) {
  return slugify(texto, { lower: true, strict: true, trim: true });
}

/**
 * Devuelve un slug libre, agregando -2, -3... si hace falta.
 *
 * `excluirId` es el propio producto al editar: sin eso, guardar sin cambiar el
 * nombre chocaria consigo mismo y le sumaria un sufijo en cada guardado.
 */
export async function slugLibre(
  tx: Prisma.TransactionClient,
  base: string,
  excluirId: string | null,
) {
  const raiz = aSlug(base) || "producto";
  for (let intento = 0; ; intento++) {
    const candidato = intento === 0 ? raiz : `${raiz}-${intento + 1}`;
    const chocado = await tx.product.findFirst({
      where: {
        slug: candidato,
        id: excluirId ? { not: excluirId } : undefined,
      },
      select: { id: true },
    });
    if (!chocado) return candidato;
  }
}
