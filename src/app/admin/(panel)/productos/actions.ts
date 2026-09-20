"use server";

import { revalidatePath, revalidateTag } from "next/cache";
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
import { type Resultado } from "@/lib/admin/resultado";
import { nombrePropio } from "@/lib/catalogo";
import { borrarObjeto, r2Configurado } from "@/lib/r2";
import { TAG_SITEMAP_URLS } from "@/lib/tienda/consultas";
import { erroresPorCampo } from "@/lib/validations/errores";
import {
  productoSchema,
  type ProductoFormValues,
} from "@/lib/validations/producto";

/**
 * Toda accion de este archivo arranca con `requireAdmin()`. Una Server Action
 * es un endpoint POST publico: el layout de /admin no la protege.
 */

function fallo(mensaje: string, errores?: Record<string, string[]>) {
  return { ok: false as const, mensaje, errores };
}

/**
 * Invalida las paginas publicas que dependen del catalogo.
 *
 * Las rutas de la tienda no leen `searchParams` en todos sus segmentos, asi
 * que Next las guarda en el cache de rutas: sin esto, publicar un producto
 * desde el panel no se ve en la tienda hasta el proximo deploy. `/producto` y
 * `/marca` se invalidan como "page" para no tirar abajo el layout entero.
 *
 * El sitemap no es una ruta cacheada sino un `unstable_cache` (`force-dynamic`
 * + tag), así que se invalida con `revalidateTag`, no con `revalidatePath`
 * (F-04 en `docs/findings.md`). Perfil `"max"`: es justo el caso que
 * `node_modules/next/dist/docs/.../revalidateTag.md` pone de ejemplo
 * ("product catalogs"), donde una demora corta sirviendo el sitemap viejo
 * mientras se recalcula en el fondo es aceptable.
 */
function revalidarTienda(slug?: string, marcaSlug?: string) {
  revalidatePath("/");
  revalidatePath("/catalogo");
  revalidateTag(TAG_SITEMAP_URLS, "max");
  if (slug) revalidatePath(`/producto/${slug}`, "page");
  if (marcaSlug) revalidatePath(`/marca/${marcaSlug}`, "page");
}

/**
 * Borra de R2 las claves que ya no tiene ninguna fila de `ProductImage`.
 *
 * `duplicarProducto` comparte `storageKey` con el original a propósito (ver
 * su comentario más abajo: "borrar la copia no puede borrar el archivo del
 * otro producto"), así que una clave sólo se borra del bucket cuando la
 * última fila que la referencia desaparece de la base -- nunca por la sola
 * desaparición de una fila puntual. Se llama siempre después de que la
 * transacción que borró esas filas ya confirmó: contar referencias contra una
 * fila que todavía no se borró (adentro de la misma transacción) las
 * encontraría a todas "en uso".
 *
 * Best-effort a propósito: si `borrarObjeto` falla, el objeto queda huérfano
 * en R2 (el problema original, ver F-06 en `docs/findings.md`) pero no hay
 * nada que revertir en la base -- ya se guardó lo que el admin pidió guardar.
 */
async function borrarSiHuerfanas(storageKeys: string[]) {
  const distintas = [...new Set(storageKeys)];
  if (distintas.length === 0 || !r2Configurado()) return;

  const enUso = await prisma.productImage.findMany({
    where: { storageKey: { in: distintas } },
    select: { storageKey: true },
    distinct: ["storageKey"],
  });
  const enUsoSet = new Set(enUso.map((i) => i.storageKey));

  await Promise.all(
    distintas
      .filter((clave) => !enUsoSet.has(clave))
      .map((clave) =>
        borrarObjeto(clave).catch((error: unknown) => {
          console.error(`No se pudo borrar "${clave}" de R2:`, error);
        }),
      ),
  );
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
    select: { id: true, name: true },
  });
  // Ordenar y cortar en JS, no en la consulta: `Perfumer.name` tiene
  // mayúsculas inconsistentes del import (ver F-21 en docs/findings.md), así
  // que un `orderBy: { name: "asc" }` de Postgres no da orden alfabético
  // real. La tabla completa son ~1.400 filas -- ordenar en memoria no pesa.
  const datos = filas
    .map((p) => ({ id: p.id, nombre: nombrePropio(p.name) }))
    .sort((a, b) => a.nombre.localeCompare(b.nombre, "es-AR"))
    .slice(0, 20);
  return { ok: true, datos };
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

/** Resuelve el id de marca: usa `brandId` si sigue existiendo en la base, o
 * busca/crea la marca por slug a partir de `brandName`. */
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

/** Devuelve los `storageKey` de las filas que borró, para que el llamador
 * decida -- ya fuera de la transacción -- si conviene borrarlos de R2. */
async function sincronizarImagenes(
  tx: Prisma.TransactionClient,
  productId: string,
  v: ProductoFormValues,
): Promise<string[]> {
  const previas = await tx.productImage.findMany({
    where: { productId },
    select: { id: true, storageKey: true },
  });
  const conservadas = new Set(
    v.images.map((x) => x.id).filter((x): x is string => x !== null),
  );
  const aBorrar = previas.filter((p) => !conservadas.has(p.id));
  if (aBorrar.length) {
    await tx.productImage.deleteMany({
      where: { id: { in: aBorrar.map((p) => p.id) }, productId },
    });
  }

  for (const [i, imagen] of v.images.entries()) {
    const datos = {
      storageKey: imagen.storageKey,
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

  return aBorrar.map((p) => p.storageKey);
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
          select: { id: true, slug: true, brand: { select: { slug: true } } },
        })
      : await tx.product.create({
          data: { ...campos, slug },
          select: { id: true, slug: true, brand: { select: { slug: true } } },
        });

    await sincronizarRelaciones(tx, producto.id, v);
    await sincronizarVariantes(tx, producto.id, v);
    const imagenesBorradas = await sincronizarImagenes(tx, producto.id, v);

    return { producto, imagenesBorradas };
  });

  // Recién después de que la transacción confirmó: contar referencias contra
  // una fila que la propia transacción todavía no borró las encontraría a
  // todas "en uso" (ver el comentario de `borrarSiHuerfanas`).
  await borrarSiHuerfanas(resultado.imagenesBorradas);

  revalidatePath("/admin/productos");
  revalidatePath(`/admin/productos/${resultado.producto.id}`);
  revalidarTienda(resultado.producto.slug, resultado.producto.brand.slug);
  return { ok: true, datos: resultado.producto };
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

  const actualizado = await prisma.product.update({
    where: { id },
    data: { status: publicar ? ProductStatus.PUBLISHED : ProductStatus.DRAFT },
    select: { slug: true, brand: { select: { slug: true } } },
  });
  revalidatePath("/admin/productos");
  revalidarTienda(actualizado.slug, actualizado.brand.slug);
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
              storageKey: i.storageKey,
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

  // Mismo criterio que `cambiarEstadoProducto` y `duplicarProducto`: buscar
  // antes de escribir, para que un doble click o una pestaña vieja vean el
  // mensaje del producto y no el error generico de Server Action de Next
  // (P2025 de Prisma) -- ver F-18 en docs/findings.md.
  const producto = await prisma.product.findUnique({
    where: { id },
    select: { images: { select: { storageKey: true } } },
  });
  if (!producto) return fallo("Ese producto ya no existe.");

  // Las relaciones del producto cascadean; OrderItem tiene onDelete: SetNull,
  // asi que los pedidos historicos conservan su snapshot de nombre y precio.
  const borrado = await prisma.product.delete({
    where: { id },
    select: { slug: true, brand: { select: { slug: true } } },
  });

  // Recién después del delete: contar referencias antes lo encontraría "en
  // uso" contra sus propias filas, que todavía no se borraron.
  await borrarSiHuerfanas(producto.images.map((i) => i.storageKey));

  revalidatePath("/admin/productos");
  revalidarTienda(borrado.slug, borrado.brand.slug);
  return { ok: true };
}
