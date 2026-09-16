import type { Prisma } from "@/generated/prisma/client";
import { ProductStatus } from "@/generated/prisma/enums";
import { prisma } from "@/lib/db";
import { urlPublica } from "@/lib/r2";

export type FiltroEstado = "todos" | "publicados" | "borradores";

const ESTADO_A_WHERE: Record<FiltroEstado, ProductStatus | undefined> = {
  todos: undefined,
  publicados: ProductStatus.PUBLISHED,
  borradores: ProductStatus.DRAFT,
};

function whereBusqueda(q: string): Prisma.ProductWhereInput {
  const termino = q.trim();
  if (!termino) return {};
  // El catalogo propio son decenas de filas, no las 70k de referencia: un
  // contains insensible alcanza y evita depender del indice trgm.
  return {
    OR: [
      { name: { contains: termino, mode: "insensitive" } },
      { brand: { name: { contains: termino, mode: "insensitive" } } },
    ],
  };
}

/**
 * Filas de la tabla de /admin/productos, con lo que la pantalla muestra:
 * foto principal, cantidad de variantes y precio "desde" entre las activas.
 */
export async function listarProductos(opciones: {
  q?: string;
  estado?: FiltroEstado;
}) {
  const q = opciones.q ?? "";
  const estado = opciones.estado ?? "todos";
  const where: Prisma.ProductWhereInput = {
    ...whereBusqueda(q),
    status: ESTADO_A_WHERE[estado],
  };

  const [productos, publicados, total] = await Promise.all([
    prisma.product.findMany({
      where,
      orderBy: [{ updatedAt: "desc" }],
      select: {
        id: true,
        slug: true,
        name: true,
        status: true,
        updatedAt: true,
        brand: { select: { name: true } },
        images: {
          where: { isPrimary: true },
          take: 1,
          select: { storageKey: true, alt: true },
        },
        variants: {
          select: { priceArs: true, isActive: true },
        },
      },
    }),
    prisma.product.count({ where: { status: ProductStatus.PUBLISHED } }),
    prisma.product.count(),
  ]);

  const filas = productos.map((p) => {
    const activas = p.variants.filter((v) => v.isActive);
    // "Desde" tiene que reflejar lo que el cliente puede comprar hoy, asi que
    // mira solo las variantes activas.
    const desde = activas.reduce<string | null>((min, v) => {
      const precio = v.priceArs.toString();
      return min === null || Number(precio) < Number(min) ? precio : min;
    }, null);

    return {
      id: p.id,
      slug: p.slug,
      name: p.name,
      brandName: p.brand.name,
      status: p.status,
      updatedAt: p.updatedAt,
      // La URL se arma acá, a partir de la clave: los componentes no tienen
      // por qué saber cuál es el host público.
      imagen: p.images[0]
        ? { url: urlPublica(p.images[0].storageKey), alt: p.images[0].alt }
        : null,
      variantes: p.variants.length,
      variantesActivas: activas.length,
      desde,
    };
  });

  return {
    filas,
    publicados,
    borradores: total - publicados,
    total,
  };
}

export type FilaProducto = Awaited<
  ReturnType<typeof listarProductos>
>["filas"][number];

/** Producto completo para precargar el formulario de edicion. */
export async function productoParaEditar(id: string) {
  const p = await prisma.product.findUnique({
    where: { id },
    select: {
      id: true,
      slug: true,
      name: true,
      brandId: true,
      brand: { select: { id: true, name: true } },
      fragranceRefId: true,
      fragranceRef: { select: { name: true, url: true } },
      sourceUrl: true,
      description: true,
      gender: true,
      concentration: true,
      year: true,
      seasons: true,
      occasions: true,
      longevity: true,
      sillage: true,
      intensity: true,
      status: true,
      isFeatured: true,
      seoTitle: true,
      seoDescription: true,
      // La pagina de edicion la usa como `key` del formulario: cambia en cada
      // guardado y fuerza el remonte con los ids ya persistidos.
      updatedAt: true,
      notes: {
        orderBy: { sortOrder: "asc" },
        select: {
          position: true,
          note: { select: { id: true, nameEn: true, nameEs: true } },
        },
      },
      accords: {
        orderBy: { sortOrder: "asc" },
        select: {
          accord: { select: { id: true, nameEs: true, color: true } },
        },
      },
      perfumers: {
        select: { perfumer: { select: { id: true, name: true } } },
      },
      variants: {
        orderBy: { sortOrder: "asc" },
        select: {
          id: true,
          kind: true,
          sizeMl: true,
          priceArs: true,
          isActive: true,
          sku: true,
        },
      },
      images: {
        orderBy: { sortOrder: "asc" },
        select: { id: true, storageKey: true, alt: true, isPrimary: true },
      },
    },
  });
  if (!p) return null;

  return {
    ...p,
    // Decimal no es serializable hacia un Client Component: viaja como string,
    // que ademas es lo que espera el formulario.
    variants: p.variants.map((v) => ({
      ...v,
      priceArs: v.priceArs.toString(),
    })),
  };
}

export type ProductoEditable = NonNullable<
  Awaited<ReturnType<typeof productoParaEditar>>
>;

/** Los 93 acordes con su color: entran enteros en el selector del formulario. */
export function listarAcordes() {
  return prisma.accord.findMany({
    orderBy: { nameEs: "asc" },
    select: { id: true, nameEs: true, nameEn: true, color: true },
  });
}
