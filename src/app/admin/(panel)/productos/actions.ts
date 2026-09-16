"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import type { Prisma } from "@/generated/prisma/client";
import { ProductStatus } from "@/generated/prisma/enums";
import { requireAdmin } from "@/lib/admin/guard";
import { aSlug, slugLibre } from "@/lib/admin/slug";
import { prisma } from "@/lib/db";
import {
  buscarReferencias,
  referenciaParaAdoptar,
  type ReferenciaAdoptable,
  type ResultadoReferencia,
} from "@/lib/admin/referencias";
import {
  productoSchema,
  type ProductoFormValues,
} from "@/lib/validations/producto";

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

// ---------------------------------------------------------------------------
// Buscador de referencias
// ---------------------------------------------------------------------------

export async function buscarReferenciasAction(
  query: string,
): Promise<Resultado<ResultadoReferencia[]>> {
  await requireAdmin();
  const q = z.string().max(120).catch("").parse(query);
  return { ok: true, datos: await buscarReferencias(q) };
}

export async function adoptarReferenciaAction(
  id: string,
): Promise<Resultado<ReferenciaAdoptable>> {
  await requireAdmin();
  const ref = await referenciaParaAdoptar(id);
  if (!ref)
    return fallo("Esa fragancia ya no está en el catálogo de referencia.");
  return { ok: true, datos: ref };
}

// ---------------------------------------------------------------------------
// Vocabularios (notas, perfumistas, marcas) para los autocompletados
// ---------------------------------------------------------------------------

export async function buscarNotasAction(
  query: string,
): Promise<Resultado<{ id: string; nombre: string; traducida: boolean }[]>> {
  await requireAdmin();
  const q = query.trim();
  const notas = await prisma.note.findMany({
    where: q
      ? {
          OR: [
            { nameEs: { contains: q, mode: "insensitive" } },
            { nameEn: { contains: q, mode: "insensitive" } },
          ],
        }
      : undefined,
    // Las mas usadas primero: con 1.882 notas, el orden alfabetico enterraria
    // las obvias detras de ingredientes rarisimos.
    orderBy: [{ usageCount: "desc" }, { nameEn: "asc" }],
    take: 20,
    select: { id: true, nameEn: true, nameEs: true },
  });
  return {
    ok: true,
    datos: notas.map((n) => ({
      id: n.id,
      nombre: n.nameEs ?? n.nameEn,
      traducida: n.nameEs !== null,
    })),
  };
}

export async function crearNotaAction(
  nombre: string,
): Promise<Resultado<{ id: string; nombre: string; traducida: boolean }>> {
  await requireAdmin();
  const parseado = z.string().trim().min(2).max(80).safeParse(nombre);
  if (!parseado.success) return fallo("El nombre de la nota es muy corto.");

  const limpio = parseado.data;
  const slug = aSlug(limpio);
  if (!slug) return fallo("Ese nombre no sirve como nota.");

  // Se carga en espaniol porque la escribe el admin: nameEn queda igual para
  // no dejar el campo vacio y para que el fallback siga funcionando.
  const nota = await prisma.note.upsert({
    where: { slug },
    create: { slug, nameEn: limpio, nameEs: limpio },
    update: {},
    select: { id: true, nameEn: true, nameEs: true },
  });
  return {
    ok: true,
    datos: {
      id: nota.id,
      nombre: nota.nameEs ?? nota.nameEn,
      traducida: nota.nameEs !== null,
    },
  };
}

export async function buscarPerfumistasAction(
  query: string,
): Promise<Resultado<{ id: string; nombre: string }[]>> {
  await requireAdmin();
  const q = query.trim();
  const filas = await prisma.perfumer.findMany({
    where: q ? { name: { contains: q, mode: "insensitive" } } : undefined,
    orderBy: { name: "asc" },
    take: 20,
    select: { id: true, name: true },
  });
  return { ok: true, datos: filas.map((p) => ({ id: p.id, nombre: p.name })) };
}

export async function crearPerfumistaAction(
  nombre: string,
): Promise<Resultado<{ id: string; nombre: string }>> {
  await requireAdmin();
  const parseado = z.string().trim().min(2).max(120).safeParse(nombre);
  if (!parseado.success) return fallo("El nombre del perfumista es muy corto.");

  const limpio = parseado.data;
  const slug = aSlug(limpio);
  if (!slug) return fallo("Ese nombre no sirve como perfumista.");

  const p = await prisma.perfumer.upsert({
    where: { slug },
    create: { slug, name: limpio },
    update: {},
    select: { id: true, name: true },
  });
  return { ok: true, datos: { id: p.id, nombre: p.name } };
}

export async function buscarMarcasAction(
  query: string,
): Promise<Resultado<{ id: string; nombre: string }[]>> {
  await requireAdmin();
  const q = query.trim();
  const filas = await prisma.brand.findMany({
    where: q ? { name: { contains: q, mode: "insensitive" } } : undefined,
    orderBy: { name: "asc" },
    take: 20,
    select: { id: true, name: true },
  });
  return { ok: true, datos: filas.map((b) => ({ id: b.id, nombre: b.name })) };
}

// ---------------------------------------------------------------------------
// Guardado
// ---------------------------------------------------------------------------

/** Aplana los errores de zod a `{ "variants.0.priceArs": ["..."] }`. */
function erroresPorCampo(error: z.ZodError) {
  const salida: Record<string, string[]> = {};
  for (const issue of error.issues) {
    const clave = issue.path.join(".") || "_";
    (salida[clave] ??= []).push(issue.message);
  }
  return salida;
}

async function resolverMarca(
  tx: Prisma.TransactionClient,
  v: ProductoFormValues,
) {
  if (v.brandId) {
    const existe = await tx.brand.findUnique({
      where: { id: v.brandId },
      select: { id: true },
    });
    if (existe) return existe.id;
  }
  // Carga manual: la marca puede no estar en las 1.748 del dataset.
  const slug = aSlug(v.brandName);
  if (!slug) throw new Error("La marca no tiene un nombre válido.");
  const marca = await tx.brand.upsert({
    where: { slug },
    create: { slug, name: v.brandName },
    update: {},
    select: { id: true },
  });
  return marca.id;
}

/**
 * Reemplaza las relaciones N-N del producto. Son tablas de union puras, sin
 * nada que las referencie, asi que borrar y recrear es mas simple y mas seguro
 * que diferenciar: no hay estado que perder.
 */
async function sincronizarRelaciones(
  tx: Prisma.TransactionClient,
  productId: string,
  v: ProductoFormValues,
) {
  await tx.productNote.deleteMany({ where: { productId } });
  await tx.productAccord.deleteMany({ where: { productId } });
  await tx.productPerfumer.deleteMany({ where: { productId } });

  if (v.notes.length) {
    // El orden dentro de cada nivel de la piramide es el del formulario.
    const orden = new Map<string, number>();
    const filas = v.notes.map((n) => {
      const i = orden.get(n.position) ?? 0;
      orden.set(n.position, i + 1);
      return {
        productId,
        noteId: n.noteId,
        position: n.position,
        sortOrder: i,
      };
    });
    await tx.productNote.createMany({ data: filas, skipDuplicates: true });
  }

  if (v.accordIds.length) {
    await tx.productAccord.createMany({
      data: v.accordIds.map((accordId, i) => ({
        productId,
        accordId,
        sortOrder: i,
      })),
      skipDuplicates: true,
    });
  }

  if (v.perfumerIds.length) {
    await tx.productPerfumer.createMany({
      data: v.perfumerIds.map((perfumerId) => ({ productId, perfumerId })),
      skipDuplicates: true,
    });
  }
}

/**
 * Las variantes se diferencian en vez de borrarse y recrearse: `OrderItem`
 * apunta a `variantId` y un delete lo pondria en null (onDelete: SetNull),
 * rompiendo el link de navegacion de los pedidos ya hechos.
 */
async function sincronizarVariantes(
  tx: Prisma.TransactionClient,
  productId: string,
  v: ProductoFormValues,
) {
  const previas = await tx.productVariant.findMany({
    where: { productId },
    select: { id: true },
  });
  const conservadas = new Set(
    v.variants.map((x) => x.id).filter((x): x is string => x !== null),
  );
  const aBorrar = previas
    .filter((p) => !conservadas.has(p.id))
    .map((p) => p.id);
  if (aBorrar.length) {
    await tx.productVariant.deleteMany({
      where: { id: { in: aBorrar }, productId },
    });
  }

  for (const [i, variante] of v.variants.entries()) {
    const datos = {
      kind: variante.kind,
      sizeMl: variante.sizeMl,
      priceArs: variante.priceArs,
      isActive: variante.isActive,
      sku: variante.sku,
      sortOrder: i,
    };
    if (variante.id) {
      // `productId` en el where evita que un id de otro producto entre por acá.
      await tx.productVariant.updateMany({
        where: { id: variante.id, productId },
        data: datos,
      });
    } else {
      await tx.productVariant.create({ data: { productId, ...datos } });
    }
  }
}

async function sincronizarImagenes(
  tx: Prisma.TransactionClient,
  productId: string,
  v: ProductoFormValues,
) {
  const previas = await tx.productImage.findMany({
    where: { productId },
    select: { id: true },
  });
  const conservadas = new Set(
    v.images.map((x) => x.id).filter((x): x is string => x !== null),
  );
  const aBorrar = previas
    .filter((p) => !conservadas.has(p.id))
    .map((p) => p.id);
  if (aBorrar.length) {
    await tx.productImage.deleteMany({
      where: { id: { in: aBorrar }, productId },
    });
  }

  for (const [i, imagen] of v.images.entries()) {
    const datos = {
      url: imagen.url,
      alt: imagen.alt,
      isPrimary: imagen.isPrimary,
      sortOrder: i,
    };
    if (imagen.id) {
      await tx.productImage.updateMany({
        where: { id: imagen.id, productId },
        data: datos,
      });
    } else {
      await tx.productImage.create({ data: { productId, ...datos } });
    }
  }
}

export async function guardarProducto(
  id: string | null,
  entrada: unknown,
): Promise<Resultado<{ id: string; slug: string }>> {
  await requireAdmin();

  const parseado = productoSchema.safeParse(entrada);
  if (!parseado.success) {
    return fallo(
      "Revisá los campos marcados.",
      erroresPorCampo(parseado.error),
    );
  }
  const v = parseado.data;

  // Los ids que manda el cliente son datos, no verdad: si apuntan a filas que
  // no existen, el createMany explotaria con un error de FK ilegible.
  const [notasOk, acordesOk, perfumistasOk, refOk] = await Promise.all([
    prisma.note.count({ where: { id: { in: v.notes.map((n) => n.noteId) } } }),
    prisma.accord.count({ where: { id: { in: v.accordIds } } }),
    prisma.perfumer.count({ where: { id: { in: v.perfumerIds } } }),
    v.fragranceRefId
      ? prisma.fragranceRef.count({ where: { id: v.fragranceRefId } })
      : Promise.resolve(1),
  ]);
  const notasDistintas = new Set(v.notes.map((n) => n.noteId)).size;
  if (notasOk !== notasDistintas)
    return fallo("Alguna de las notas ya no existe.");
  if (acordesOk !== new Set(v.accordIds).size)
    return fallo("Alguno de los acordes ya no existe.");
  if (perfumistasOk !== new Set(v.perfumerIds).size)
    return fallo("Alguno de los perfumistas ya no existe.");
  if (refOk === 0) return fallo("La fragancia de referencia ya no existe.");

  const resultado = await prisma.$transaction(async (tx) => {
    const brandId = await resolverMarca(tx, v);
    const slug = await slugLibre(tx, v.slug ?? `${v.brandName} ${v.name}`, id);

    const campos = {
      name: v.name,
      brandId,
      fragranceRefId: v.fragranceRefId,
      sourceUrl: v.sourceUrl,
      description: v.description,
      gender: v.gender,
      concentration: v.concentration,
      year: v.year,
      seasons: v.seasons,
      occasions: v.occasions,
      longevity: v.longevity,
      sillage: v.sillage,
      intensity: v.intensity,
      status: v.status,
      isFeatured: v.isFeatured,
      seoTitle: v.seoTitle,
      seoDescription: v.seoDescription,
    };

    const producto = id
      ? await tx.product.update({
          where: { id },
          data: { ...campos, slug },
          select: { id: true, slug: true },
        })
      : await tx.product.create({
          data: { ...campos, slug },
          select: { id: true, slug: true },
        });

    await sincronizarRelaciones(tx, producto.id, v);
    await sincronizarVariantes(tx, producto.id, v);
    await sincronizarImagenes(tx, producto.id, v);

    return producto;
  });

  revalidatePath("/admin/productos");
  revalidatePath(`/admin/productos/${resultado.id}`);
  return { ok: true, datos: resultado };
}

// ---------------------------------------------------------------------------
// Acciones de la tabla
// ---------------------------------------------------------------------------

export async function cambiarEstadoProducto(
  id: string,
  publicar: boolean,
): Promise<Resultado> {
  await requireAdmin();

  if (publicar) {
    // Mismo criterio que el formulario: no se publica algo que el cliente no
    // puede comprar. La tabla es otro camino hacia el mismo cambio de estado.
    const producto = await prisma.product.findUnique({
      where: { id },
      select: {
        description: true,
        variants: { where: { isActive: true }, select: { id: true } },
      },
    });
    if (!producto) return fallo("Ese producto ya no existe.");
    if (producto.variants.length === 0) {
      return fallo(
        "No tiene ninguna presentación activa: no se puede publicar.",
      );
    }
    if (!producto.description) {
      return fallo("Le falta la descripción: no se puede publicar.");
    }
  }

  await prisma.product.update({
    where: { id },
    data: { status: publicar ? ProductStatus.PUBLISHED : ProductStatus.DRAFT },
  });
  revalidatePath("/admin/productos");
  return { ok: true };
}

export async function duplicarProducto(
  id: string,
): Promise<Resultado<{ id: string }>> {
  await requireAdmin();

  const original = await prisma.product.findUnique({
    where: { id },
    include: {
      notes: true,
      accords: true,
      perfumers: true,
      variants: true,
      images: true,
    },
  });
  if (!original) return fallo("Ese producto ya no existe.");

  const copia = await prisma.$transaction(async (tx) => {
    const nombre = `${original.name} (copia)`;
    // La copia nace en borrador: duplicar suele ser el paso previo a editar,
    // y no queremos que aparezca en la tienda a medio corregir.
    return tx.product.create({
      data: {
        slug: await slugLibre(tx, nombre, null),
        name: nombre,
        brandId: original.brandId,
        fragranceRefId: original.fragranceRefId,
        sourceUrl: original.sourceUrl,
        description: original.description,
        gender: original.gender,
        concentration: original.concentration,
        year: original.year,
        seasons: original.seasons,
        occasions: original.occasions,
        longevity: original.longevity,
        sillage: original.sillage,
        intensity: original.intensity,
        status: ProductStatus.DRAFT,
        isFeatured: false,
        seoTitle: original.seoTitle,
        seoDescription: original.seoDescription,
        notes: {
          createMany: {
            data: original.notes.map((n) => ({
              noteId: n.noteId,
              position: n.position,
              sortOrder: n.sortOrder,
            })),
          },
        },
        accords: {
          createMany: {
            data: original.accords.map((a) => ({
              accordId: a.accordId,
              sortOrder: a.sortOrder,
            })),
          },
        },
        perfumers: {
          createMany: {
            data: original.perfumers.map((p) => ({ perfumerId: p.perfumerId })),
          },
        },
        variants: {
          createMany: {
            data: original.variants.map((v) => ({
              kind: v.kind,
              sizeMl: v.sizeMl,
              priceArs: v.priceArs,
              isActive: v.isActive,
              sortOrder: v.sortOrder,
              // El SKU no se copia: es identificador unico del original.
              sku: null,
            })),
          },
        },
        images: {
          // Las imagenes se comparten con el original (mismo objeto en R2):
          // borrar la copia no puede borrar el archivo del otro producto.
          createMany: {
            data: original.images.map((i) => ({
              url: i.url,
              alt: i.alt,
              sortOrder: i.sortOrder,
              isPrimary: i.isPrimary,
            })),
          },
        },
      },
      select: { id: true },
    });
  });

  revalidatePath("/admin/productos");
  return { ok: true, datos: copia };
}

export async function eliminarProducto(id: string): Promise<Resultado> {
  await requireAdmin();
  // Las relaciones del producto cascadean; OrderItem tiene onDelete: SetNull,
  // asi que los pedidos historicos conservan su snapshot de nombre y precio.
  await prisma.product.delete({ where: { id } });
  revalidatePath("/admin/productos");
  return { ok: true };
}
