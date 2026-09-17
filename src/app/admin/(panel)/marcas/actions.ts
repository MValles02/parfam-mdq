"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { requireAdmin } from "@/lib/admin/guard";
import { prisma } from "@/lib/db";
import { marcaSchema } from "@/lib/validations/marca";

/**
 * Toda accion de este archivo arranca con `requireAdmin()`. Una Server Action
 * es un endpoint POST publico: el layout de /admin no la protege.
 */

export type Resultado =
  | { ok: true }
  | { ok: false; mensaje: string; errores?: Record<string, string[]> };

function fallo(mensaje: string, errores?: Record<string, string[]>): Resultado {
  return { ok: false, mensaje, errores };
}

function erroresPorCampo(error: z.ZodError) {
  const salida: Record<string, string[]> = {};
  for (const issue of error.issues) {
    const clave = issue.path.join(".") || "_";
    (salida[clave] ??= []).push(issue.message);
  }
  return salida;
}

/**
 * Invalida lo que muestra el nombre de esta marca en la tienda: la grilla
 * (catalogo y home), la ficha de cada producto suyo, y `/marca/[slug]`.
 * Mismo criterio que `revalidarTienda()` en productos/actions.ts, pero acá
 * hay que revalidar potencialmente varias fichas de producto en vez de una
 * sola -- son pocas (hoy 6, y la Fase 8 carga ~40 productos reales en total,
 * no por marca), así que iterar es más simple que inventar otro mecanismo.
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
