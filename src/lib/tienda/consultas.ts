import type { Prisma } from "@/generated/prisma/client";
import { ProductStatus } from "@/generated/prisma/enums";
import type {
  Concentration,
  NotePosition,
  VariantKind,
} from "@/generated/prisma/enums";
import { prisma } from "@/lib/db";
import { urlPublica } from "@/lib/r2";
import {
  CONCENTRACION_CORTA,
  etiquetaVariante,
  NIVELES,
  nombrePropio,
} from "@/lib/catalogo";
import { LIMITES_PRECIO, type FiltrosCatalogo } from "@/lib/tienda/filtros";

/**
 * Consultas publicas del storefront. Todo lo que sale de acá ya viene filtrado
 * por las dos reglas que no se negocian (PLAN.md):
 *
 *   - sólo productos PUBLISHED,
 *   - sólo variantes isActive,
 *
 * y con los Decimal pasados a string, porque no son serializables hacia un
 * Client Component. Las URLs de las fotos se arman con `urlPublica()` a partir
 * de la clave guardada: ningun componente sabe cual es el host de R2.
 *
 * Lo que es de Fragrantica (imagenes, `descriptionEn`, ratings de la
 * comunidad) no se selecciona nunca: es referencia interna del panel.
 */

export const PRODUCTOS_POR_PAGINA = 12;

/**
 * Un lanzamiento cuenta como "nuevo" si salió en los ultimos 3 aniversarios.
 *
 * La primera version miraba `createdAt` del producto, y eso se rompe solo: en
 * la Fase 8 se cargan los ~40 productos el mismo dia y el catalogo entero
 * queda con el cartel de NUEVO durante un mes. El aniversario de lanzamiento
 * es un dato del perfume, no de cuando lo cargamos, y es lo que el mockup
 * muestra en Le Male Elixir.
 */
const ANIOS_NOVEDAD = 3;

type EtiquetaTarjeta = "NUEVO" | "DECANT" | "TESTER" | null;

export type TarjetaProducto = {
  slug: string;
  nombre: string;
  marca: string;
  marcaSlug: string;
  /** "EDP · 2021 · Especiado", ya armado: la tarjeta no formatea nada. */
  meta: string;
  imagen: { url: string; alt: string } | null;
  /** Precio más barato entre las variantes activas, como string. */
  desde: string | null;
  etiqueta: EtiquetaTarjeta;
  /** Tamaños disponibles ("5 ml", "10 ml"), hasta tres. */
  tamanios: string[];
};

type VarianteCruda = {
  kind: VariantKind;
  sizeMl: number | null;
  priceArs: Prisma.Decimal;
  isActive: boolean;
};

const SELECT_TARJETA = {
  id: true,
  slug: true,
  name: true,
  concentration: true,
  year: true,
  createdAt: true,
  isFeatured: true,
  brand: { select: { name: true, slug: true } },
  images: {
    where: { isPrimary: true },
    take: 1,
    select: { storageKey: true, alt: true },
  },
  accords: {
    orderBy: { sortOrder: "asc" },
    take: 1,
    select: { accord: { select: { nameEs: true } } },
  },
  variants: {
    where: { isActive: true },
    select: { kind: true, sizeMl: true, priceArs: true, isActive: true },
  },
} satisfies Prisma.ProductSelect;

function capitalizar(texto: string): string {
  return texto.charAt(0).toUpperCase() + texto.slice(1);
}

/** El más barato entre las variantes activas, o null si no hay ninguna. */
function precioDesde(variantes: VarianteCruda[]): string | null {
  return variantes.reduce<string | null>((min, v) => {
    const precio = v.priceArs.toString();
    return min === null || Number(precio) < Number(min) ? precio : min;
  }, null);
}

/**
 * Un solo cartel por tarjeta, en este orden de prioridad: lo recién cargado
 * primero, después lo que tiene decant (que es el diferencial de precio del
 * negocio) y por último el tester suelto.
 */
function etiquetaDe(
  anio: number | null,
  variantes: VarianteCruda[],
): EtiquetaTarjeta {
  if (anio !== null && anio >= new Date().getFullYear() - ANIOS_NOVEDAD) {
    return "NUEVO";
  }
  const tipos = new Set(variantes.map((v) => v.kind));
  if (tipos.has("DECANT")) return "DECANT";
  if (tipos.has("TESTER") && !tipos.has("FULL_BOTTLE")) return "TESTER";
  return null;
}

function tamaniosDe(variantes: VarianteCruda[]): string[] {
  const ml = [
    ...new Set(variantes.map((v) => v.sizeMl).filter((n) => n !== null)),
  ];
  return ml
    .sort((a, b) => a - b)
    .slice(0, 3)
    .map((n) => `${n} ml`);
}

function aTarjeta(p: {
  slug: string;
  name: string;
  concentration: Concentration | null;
  year: number | null;
  createdAt: Date;
  brand: { name: string; slug: string };
  images: { storageKey: string; alt: string | null }[];
  accords: { accord: { nameEs: string } }[];
  variants: VarianteCruda[];
}): TarjetaProducto {
  const meta = [
    p.concentration ? CONCENTRACION_CORTA[p.concentration] : null,
    p.year ? String(p.year) : null,
    p.accords[0] ? capitalizar(p.accords[0].accord.nameEs) : null,
  ]
    .filter(Boolean)
    .join(" · ");

  const foto = p.images[0];
  const url = foto ? urlPublica(foto.storageKey) : null;

  return {
    slug: p.slug,
    nombre: p.name,
    marca: p.brand.name,
    marcaSlug: p.brand.slug,
    meta,
    imagen: url
      ? { url, alt: foto?.alt ?? `${p.name} de ${p.brand.name}` }
      : null,
    desde: precioDesde(p.variants),
    etiqueta: etiquetaDe(p.year, p.variants),
    tamanios: tamaniosDe(p.variants),
  };
}

/**
 * Filtro sobre las variantes. Cuando estan puestos presentacion y precio a la
 * vez, van en el mismo `some` a proposito: lo que se pregunta es si hay *una*
 * variante que cumpla las dos cosas, no un decant por un lado y algo barato
 * por el otro.
 */
function whereVariante(f: FiltrosCatalogo): Prisma.ProductVariantWhereInput {
  const limites = f.precio ? LIMITES_PRECIO[f.precio] : null;
  return {
    isActive: true,
    kind: f.presentacion ?? undefined,
    priceArs: limites
      ? { gte: limites.min ?? undefined, lte: limites.max ?? undefined }
      : undefined,
  };
}

function wherePublico(f: FiltrosCatalogo): Prisma.ProductWhereInput {
  const termino = f.q.trim();
  return {
    status: ProductStatus.PUBLISHED,
    // Un publicado sin ninguna variante activa no tiene nada que vender, asi
    // que no entra a la grilla (su ficha sigue siendo accesible por URL).
    variants: { some: whereVariante(f) },
    brand: f.marca ? { slug: f.marca } : undefined,
    gender: f.genero ?? undefined,
    accords: f.acorde ? { some: { accord: { slug: f.acorde } } } : undefined,
    notes: f.nota ? { some: { note: { slug: f.nota } } } : undefined,
    ...(termino
      ? {
          // El catalogo propio son decenas de filas, no las 70k de referencia:
          // un contains insensible alcanza, igual que en el panel.
          OR: [
            { name: { contains: termino, mode: "insensitive" as const } },
            {
              brand: {
                name: { contains: termino, mode: "insensitive" as const },
              },
            },
          ],
        }
      : {}),
  };
}

const COMPARADOR = new Intl.Collator("es-AR", { sensitivity: "base" });

/**
 * Trae el catalogo ya filtrado y lo ordena y pagina en memoria.
 *
 * Ordenar por precio es ordenar por el minimo de las variantes activas, que es
 * una agregacion sobre otra tabla y Prisma no la sabe expresar en un `orderBy`.
 * Con un catalogo de decenas de productos --no las 70k de referencia-- traer
 * las filas que matchean y ordenarlas acá es una consulta contra las dos o
 * tres que haria falta para resolverlo en SQL. Si algun dia el catalogo pasa
 * de unos cientos de productos, esto se reescribe con SQL crudo.
 */
export async function listarCatalogo(f: FiltrosCatalogo) {
  const productos = await prisma.product.findMany({
    where: wherePublico(f),
    select: SELECT_TARJETA,
  });

  // Las claves de orden van al costado y no adentro de la tarjeta: `creado` y
  // `destacado` son criterios de la consulta, no algo que la UI muestre.
  const filas = productos.map((p) => ({
    tarjeta: aTarjeta(p),
    creado: p.createdAt.getTime(),
    destacado: p.isFeatured,
  }));

  filas.sort((a, b) => {
    switch (f.orden) {
      case "precio-asc":
      case "precio-desc": {
        // Sin precio no se puede comparar: esas van siempre al final.
        if (a.tarjeta.desde === null) return b.tarjeta.desde === null ? 0 : 1;
        if (b.tarjeta.desde === null) return -1;
        const diff = Number(a.tarjeta.desde) - Number(b.tarjeta.desde);
        return f.orden === "precio-asc" ? diff : -diff;
      }
      case "nombre":
        return COMPARADOR.compare(a.tarjeta.nombre, b.tarjeta.nombre);
      default:
        // Novedades: lo destacado por el admin arriba, después lo más nuevo.
        if (a.destacado !== b.destacado) return a.destacado ? -1 : 1;
        return b.creado - a.creado;
    }
  });

  const total = filas.length;
  const paginas = Math.max(1, Math.ceil(total / PRODUCTOS_POR_PAGINA));
  const pagina = Math.min(Math.max(1, f.pagina), paginas);
  const desde = (pagina - 1) * PRODUCTOS_POR_PAGINA;

  return {
    tarjetas: filas
      .slice(desde, desde + PRODUCTOS_POR_PAGINA)
      .map((fila) => fila.tarjeta),
    total,
    pagina,
    paginas,
  };
}

/**
 * Opciones de los selects. Sólo lo que existe en el catalogo publicado: un
 * filtro que no puede devolver nada es ruido (y las 1.748 marcas de referencia
 * no tienen por qué aparecer acá).
 */
export async function opcionesDeFiltro() {
  const [marcas, acordes, notas] = await Promise.all([
    prisma.brand.findMany({
      where: { products: { some: { status: ProductStatus.PUBLISHED } } },
      orderBy: { name: "asc" },
      select: { slug: true, name: true },
    }),
    prisma.accord.findMany({
      where: {
        products: { some: { product: { status: ProductStatus.PUBLISHED } } },
      },
      orderBy: { nameEs: "asc" },
      select: { slug: true, nameEs: true, color: true },
    }),
    prisma.note.findMany({
      where: {
        products: { some: { product: { status: ProductStatus.PUBLISHED } } },
      },
      orderBy: [{ usageCount: "desc" }],
      select: { slug: true, nameEs: true, nameEn: true },
    }),
  ]);

  return {
    marcas,
    acordes: acordes.map((a) => ({
      slug: a.slug,
      nombre: capitalizar(a.nameEs),
      color: a.color,
    })),
    // Fallback al ingles mientras la nota no esté traducida (ver /admin/notas).
    notas: notas
      .map((n) => ({ slug: n.slug, nombre: capitalizar(n.nameEs ?? n.nameEn) }))
      .sort((a, b) => COMPARADOR.compare(a.nombre, b.nombre)),
  };
}

export type OpcionesDeFiltro = Awaited<ReturnType<typeof opcionesDeFiltro>>;

/**
 * Ficha completa. Devuelve null si el producto no existe o está en borrador:
 * un borrador no tiene que ser alcanzable desde la tienda ni entrando al slug
 * directo.
 */
export async function productoPorSlug(slug: string) {
  const p = await prisma.product.findFirst({
    where: { slug, status: ProductStatus.PUBLISHED },
    select: {
      id: true,
      slug: true,
      name: true,
      description: true,
      gender: true,
      concentration: true,
      year: true,
      seasons: true,
      occasions: true,
      longevity: true,
      sillage: true,
      intensity: true,
      seoTitle: true,
      seoDescription: true,
      updatedAt: true,
      brand: { select: { name: true, slug: true } },
      images: {
        orderBy: [{ isPrimary: "desc" }, { sortOrder: "asc" }],
        select: { id: true, storageKey: true, alt: true },
      },
      variants: {
        where: { isActive: true },
        orderBy: { sortOrder: "asc" },
        select: { id: true, kind: true, sizeMl: true, priceArs: true },
      },
      notes: {
        orderBy: { sortOrder: "asc" },
        select: {
          position: true,
          note: { select: { slug: true, nameEs: true, nameEn: true } },
        },
      },
      accords: {
        orderBy: { sortOrder: "asc" },
        select: {
          accord: { select: { slug: true, nameEs: true, color: true } },
        },
      },
      perfumers: { select: { perfumer: { select: { name: true } } } },
    },
  });
  if (!p) return null;

  const piramide = NIVELES.map((nivel: NotePosition) => ({
    nivel,
    notas: p.notes
      .filter((n) => n.position === nivel)
      .map((n) => ({
        slug: n.note.slug,
        nombre: capitalizar(n.note.nameEs ?? n.note.nameEn),
      })),
  })).filter((n) => n.notas.length > 0);

  return {
    id: p.id,
    slug: p.slug,
    nombre: p.name,
    descripcion: p.description,
    genero: p.gender,
    concentracion: p.concentration,
    anio: p.year,
    estaciones: p.seasons,
    ocasiones: p.occasions,
    duracion: p.longevity,
    estela: p.sillage,
    intensidad: p.intensity,
    seoTitle: p.seoTitle,
    seoDescription: p.seoDescription,
    actualizado: p.updatedAt,
    marca: p.brand.name,
    marcaSlug: p.brand.slug,
    perfumistas: p.perfumers.map((x) => nombrePropio(x.perfumer.name)),
    imagenes: p.images
      .map((img) => ({
        id: img.id,
        url: urlPublica(img.storageKey),
        alt: img.alt ?? `${p.name} de ${p.brand.name}`,
      }))
      .filter((img): img is { id: string; url: string; alt: string } =>
        Boolean(img.url),
      ),
    variantes: p.variants.map((v) => ({
      id: v.id,
      kind: v.kind,
      sizeMl: v.sizeMl,
      etiqueta: etiquetaVariante(v.kind, v.sizeMl),
      precio: v.priceArs.toString(),
    })),
    acordes: p.accords.map((a) => ({
      slug: a.accord.slug,
      nombre: capitalizar(a.accord.nameEs),
      color: a.accord.color,
    })),
    piramide,
  };
}

export type ProductoPublico = NonNullable<
  Awaited<ReturnType<typeof productoPorSlug>>
>;

/**
 * "Te puede gustar": primero la misma marca, después cualquier otro que
 * comparta algún acorde. Se pide de a uno para que la marca gane siempre,
 * y se completa hasta cuatro.
 */
export async function relacionados(producto: {
  id: string;
  marcaSlug: string;
  acordes: { slug: string }[];
}): Promise<TarjetaProducto[]> {
  const base: Prisma.ProductWhereInput = {
    status: ProductStatus.PUBLISHED,
    id: { not: producto.id },
    variants: { some: { isActive: true } },
  };
  const CUANTOS = 4;

  const mismaMarca = await prisma.product.findMany({
    where: { ...base, brand: { slug: producto.marcaSlug } },
    select: SELECT_TARJETA,
    take: CUANTOS,
    orderBy: [{ isFeatured: "desc" }, { createdAt: "desc" }],
  });

  const faltan = CUANTOS - mismaMarca.length;
  const porAcorde =
    faltan > 0 && producto.acordes.length > 0
      ? await prisma.product.findMany({
          where: {
            ...base,
            id: { notIn: [producto.id, ...mismaMarca.map((p) => p.id)] },
            accords: {
              some: {
                accord: { slug: { in: producto.acordes.map((a) => a.slug) } },
              },
            },
          },
          select: SELECT_TARJETA,
          take: faltan,
          orderBy: [{ isFeatured: "desc" }, { createdAt: "desc" }],
        })
      : [];

  return [...mismaMarca, ...porAcorde].map(aTarjeta);
}

/** Cabecera de /marca/[slug]. Null si la marca no vende nada publicado. */
export async function marcaPorSlug(slug: string) {
  const marca = await prisma.brand.findFirst({
    where: { slug, products: { some: { status: ProductStatus.PUBLISHED } } },
    select: { name: true, slug: true, country: true },
  });
  return marca;
}

/** Todo lo que entra al sitemap, con su fecha para el `lastModified`. */
export async function urlsDelSitio() {
  const [productos, marcas] = await Promise.all([
    prisma.product.findMany({
      where: {
        status: ProductStatus.PUBLISHED,
        variants: { some: { isActive: true } },
      },
      select: { slug: true, updatedAt: true },
      orderBy: { updatedAt: "desc" },
    }),
    prisma.brand.findMany({
      where: { products: { some: { status: ProductStatus.PUBLISHED } } },
      select: { slug: true, updatedAt: true },
      orderBy: { name: "asc" },
    }),
  ]);
  return { productos, marcas };
}
