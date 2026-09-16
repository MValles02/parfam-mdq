import { Prisma } from "@/generated/prisma/client";
import type { Gender } from "@/generated/prisma/enums";
import { prisma } from "@/lib/db";

export type ResultadoReferencia = {
  id: string;
  name: string;
  brandName: string;
  year: number | null;
  gender: Gender | null;
  hasPyramid: boolean;
  /** Interno: nunca se publica, sólo ordena y da contexto en el panel. */
  ratingValue: number | null;
  ratingCount: number | null;
};

/**
 * Escapa los comodines de LIKE. Sin esto, un `%` tipeado por el admin haría
 * que la busqueda traiga cualquier cosa, y un `_` cambiaria el significado.
 * El backslash tiene que ir primero o se re-escaparia a si mismo.
 */
function patronLike(termino: string) {
  const escapado = termino
    .replace(/\\/g, "\\\\")
    .replace(/%/g, "\\%")
    .replace(/_/g, "\\_");
  return `%${escapado}%`;
}

/**
 * Un indice trigram no puede resolver un patron de menos de 3 caracteres:
 * no hay trigrama que buscar. Con menos, Postgres cae a un seq scan de las
 * 70k filas — medido: 244 ms para "le" contra 9 ms para "noir".
 */
const MINIMO_INDEXABLE = 3;

/**
 * Parte la consulta en palabras. Cada una tiene que aparecer en el texto de
 * busqueda, asi "sauvage dior" encuentra el Sauvage de Dior y no todos los
 * Sauvage ni todos los Dior.
 *
 * Las palabras de menos de 3 letras se descartan del filtro (no del orden):
 * en "eau de nuit", el "de" no aporta nada y forzaria el seq scan. Y el caso
 * que importa sigue andando — "le male" filtra por "male", que alcanza.
 */
function terminos(query: string) {
  return query
    .trim()
    .toLowerCase()
    .split(/\s+/)
    .filter((t) => t.length >= MINIMO_INDEXABLE)
    .slice(0, 6);
}

const LIMITE = 12;

/** Cuantas filas se re-puntuan por relevancia antes de quedarse con LIMITE. */
const CANDIDATOS = 60;

/**
 * Ordenar por rating crudo no sirve: el dataset tiene una mediana de 25 votos,
 * asi que una edicion limitada con 14 votos y 4,79 le gana al Angel de Mugler.
 * Se usa un promedio bayesiano (el truco del top 250 de IMDb): cada fragancia
 * arranca con `VOTOS_PREVIOS` votos imaginarios en la media del dataset y solo
 * se despega de ahi si junto votos de verdad.
 *
 *   bayes = (v * R + m * C) / (v + m)
 *
 * Medido sobre las 63.769 filas con rating: C = 3,977, mediana 25 votos.
 * m = 150 cae entre el percentil 75 (110) y el 90 (390).
 */
const VOTOS_PREVIOS = 150;
const RATING_MEDIO = 3.977;

/**
 * Pero la popularidad sola tampoco alcanza: "angel mugler" traia
 * "The Taste of Fragrance Angel" antes que el Angel de 1992, porque el
 * original es polarizante (3,57 con 29.722 votos). Falta una senal de
 * *relevancia*, y `similarity()` de pg_trgm la da: el searchText "Angel Mugler"
 * puntua 1,00 contra la consulta y "Angel Les Parfums de Cuir Mugler" 0,45.
 *
 * El peso reparte 75/25 entre parecido y popularidad, y el bayesiano se
 * reescala de [3;5] a [0;1] para que las dos senales jueguen en la misma
 * escala — si no, la popularidad (comprimida entre 3,5 y 4,3) no movia nada.
 */
const PESO_PARECIDO = 0.75;
const PESO_POPULARIDAD = 0.25;

/**
 * Busqueda difusa sobre las ~70k fragancias de referencia.
 *
 * Usa `parfam_normalize` (unaccent + lower) contra el indice GIN trgm de
 * `searchText`, que es nombre + marca desnormalizados — ver la migracion
 * `busqueda_difusa_referencias` para por que hizo falta desnormalizar.
 * Se ordena por el promedio bayesiano de mas arriba, que es el mejor proxy de
 * "la que el admin esta buscando".
 */
export async function buscarReferencias(
  query: string,
): Promise<ResultadoReferencia[]> {
  const palabras = terminos(query);
  if (palabras.length === 0) return [];
  // Para el parecido se usa la consulta entera, no los terminos filtrados:
  // ahi si importa que "le male" puntue como "le male".
  const consultaCompleta = query.trim().toLowerCase();

  // Un AND por palabra. Se arma con Prisma.sql para que cada patron viaje como
  // parametro ligado, no interpolado en el texto de la query.
  const condiciones = Prisma.join(
    palabras.map(
      (p) =>
        Prisma.sql`parfam_normalize(f."searchText") LIKE ${patronLike(p)} ESCAPE '\\'`,
    ),
    " AND ",
  );

  const filas = await prisma.$queryRaw<
    {
      id: string;
      name: string;
      brandName: string;
      year: number | null;
      gender: Gender | null;
      hasPyramid: boolean;
      ratingValue: Prisma.Decimal | null;
      ratingCount: number | null;
    }[]
  >`
    WITH bayes AS (
      SELECT f."id",
             f."name",
             f."year",
             f."gender",
             f."hasPyramid",
             f."ratingValue",
             f."ratingCount",
             f."brandId",
             parfam_normalize(f."searchText") AS "normalizado",
             (COALESCE(f."ratingCount", 0) * COALESCE(f."ratingValue", ${RATING_MEDIO}::numeric)
              + ${VOTOS_PREVIOS}::numeric * ${RATING_MEDIO}::numeric)
             / (COALESCE(f."ratingCount", 0) + ${VOTOS_PREVIOS}::numeric) AS "popularidad"
        FROM "FragranceRef" f
       WHERE ${condiciones}
       -- Acotar acá es lo que mantiene barato el similarity() de abajo: sin
       -- este LIMIT, una consulta poco selectiva lo evaluaría sobre miles de
       -- filas. Los 60 más populares siempre contienen al que se busca.
       ORDER BY "popularidad" DESC
       LIMIT ${CANDIDATOS}
    )
    SELECT c."id",
           c."name",
           b."name" AS "brandName",
           c."year",
           c."gender",
           c."hasPyramid",
           c."ratingValue",
           c."ratingCount"
      FROM bayes c
      JOIN "Brand" b ON b."id" = c."brandId"
     ORDER BY similarity(c."normalizado", ${consultaCompleta}) * ${PESO_PARECIDO}
              + (c."popularidad" - 3) / 2 * ${PESO_POPULARIDAD} DESC,
              c."ratingCount" DESC NULLS LAST,
              c."name" ASC
     LIMIT ${LIMITE}
  `;

  return filas.map((f) => ({
    ...f,
    ratingValue: f.ratingValue === null ? null : Number(f.ratingValue),
  }));
}

/**
 * Trae una referencia con todo lo que el formulario precarga al adoptarla.
 * Las notas vienen con su traduccion al espaniol (o el ingles como fallback)
 * y los acordes con su color, que son los chips de la pantalla.
 */
export async function referenciaParaAdoptar(id: string) {
  const ref = await prisma.fragranceRef.findUnique({
    where: { id },
    select: {
      id: true,
      name: true,
      year: true,
      gender: true,
      url: true,
      descriptionEn: true,
      brand: { select: { id: true, name: true } },
      notes: {
        orderBy: { sortOrder: "asc" },
        select: {
          position: true,
          sortOrder: true,
          note: { select: { id: true, nameEn: true, nameEs: true } },
        },
      },
      accords: {
        orderBy: { rank: "asc" },
        select: {
          rank: true,
          accord: {
            select: { id: true, nameEn: true, nameEs: true, color: true },
          },
        },
      },
      perfumers: {
        select: { perfumer: { select: { id: true, name: true } } },
      },
    },
  });
  if (!ref) return null;

  return {
    id: ref.id,
    name: ref.name,
    year: ref.year,
    gender: ref.gender,
    url: ref.url,
    // Interno: es el texto en ingles de Fragrantica. Se muestra en el panel
    // como ayuda para redactar, nunca se publica (ver AGENTS.md).
    descriptionEn: ref.descriptionEn,
    brand: ref.brand,
    notes: ref.notes.map((n) => ({
      noteId: n.note.id,
      nombre: n.note.nameEs ?? n.note.nameEn,
      traducida: n.note.nameEs !== null,
      position: n.position,
      sortOrder: n.sortOrder,
    })),
    accords: ref.accords.map((a) => ({
      accordId: a.accord.id,
      nombre: a.accord.nameEs,
      color: a.accord.color,
    })),
    perfumers: ref.perfumers.map((p) => ({
      perfumerId: p.perfumer.id,
      nombre: p.perfumer.name,
    })),
  };
}

export type ReferenciaAdoptable = NonNullable<
  Awaited<ReturnType<typeof referenciaParaAdoptar>>
>;
