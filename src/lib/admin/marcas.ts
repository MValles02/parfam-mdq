import { prisma } from "@/lib/db";

export type FilaMarca = {
  id: string;
  slug: string;
  name: string;
  productos: number;
};

/**
 * El dataset de Fragrantica trae 1.748 marcas (una por cada fragancia de
 * referencia), pero sólo un puñado tiene productos reales en la tienda hoy.
 * Sin `q`, la lista arranca acotada a esas -- son las que de verdad importan
 * para corregir un nombre mal traído del slug (PLAN.md, Fase 6) -- y con `q`
 * busca en las 1.748, para poder corregir una marca de referencia antes de
 * cargarle el primer producto.
 */
export async function listarMarcas(q: string): Promise<FilaMarca[]> {
  const query = q.trim();

  const marcas = await prisma.brand.findMany({
    where: query
      ? {
          OR: [
            { name: { contains: query, mode: "insensitive" } },
            { slug: { contains: query, mode: "insensitive" } },
          ],
        }
      : { products: { some: {} } },
    orderBy: { name: "asc" },
    take: query ? 50 : undefined,
    select: {
      id: true,
      slug: true,
      name: true,
      _count: { select: { products: true } },
    },
  });

  return marcas.map((m) => ({
    id: m.id,
    slug: m.slug,
    name: m.name,
    productos: m._count.products,
  }));
}
