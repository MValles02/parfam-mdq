"use server";

import { revalidatePath } from "next/cache";
import { requireAdmin } from "@/lib/admin/guard";
import { fallo, type Resultado } from "@/lib/admin/resultado";
import { prisma } from "@/lib/db";
import { erroresPorCampo } from "@/lib/validations/errores";
import { marcaSchema } from "@/lib/validations/marca";

/**
 * Toda accion de este archivo arranca con `requireAdmin()`. Una Server Action
 * es un endpoint POST publico: el layout de /admin no la protege.
 */

/**
 * Invalida lo que muestra el nombre de esta marca en la tienda: la grilla
 * (catalogo y home), la ficha de cada producto suyo, y `/marca/[slug]`.
 * Mismo criterio que `revalidarTienda()` en productos/actions.ts, pero acá
 * hay que revalidar potencialmente varias fichas de producto en vez de una
 * sola -- son pocas, porque el catálogo entero son decenas de productos y no
 * decenas por marca, así que iterar es más simple que inventar otro mecanismo.
 */
async function revalidarMarca(brandId: string, slug: string) {
  const productos = await prisma.product.findMany({
    where: { brandId },
    select: { slug: true },
  });

  revalidatePath("/");
  revalidatePath("/catalogo");
  revalidatePath(`/marca/${slug}`, "page");
  for (const p of productos) revalidatePath(`/producto/${p.slug}`, "page");
}

export async function actualizarMarca(
  id: string,
  entrada: unknown,
): Promise<Resultado> {
  await requireAdmin();

  const parseado = marcaSchema.safeParse(entrada);
  if (!parseado.success) {
    return fallo("Revisá el nombre.", erroresPorCampo(parseado.error));
  }

  const marca = await prisma.brand.update({
    where: { id },
    data: { name: parseado.data.name },
    select: { id: true, slug: true },
  });

  await revalidarMarca(marca.id, marca.slug);
  return { ok: true };
}
