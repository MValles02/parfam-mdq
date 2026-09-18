# Módulo · Buscador de referencias

## Responsabilidad

Encontrar una fragancia entre las **69.948** de Fragrantica y devolver todo lo
que el formulario de producto necesita para "adoptarla". Es el módulo con más
ingeniería concentrada del proyecto: mezcla SQL crudo, `pg_trgm` y un promedio
bayesiano.

## Entry points

| Superficie                       | Archivo                                         |
| -------------------------------- | ----------------------------------------------- |
| `buscarReferenciasAction(query)` | `src/app/admin/(panel)/productos/actions.ts:54` |
| `adoptarReferenciaAction(id)`    | `.../actions.ts:62`                             |
| UI                               | `.../productos/_components/paso-referencia.tsx` |

## Archivos principales

| Archivo                                                                      | Rol                                                       |
| ---------------------------------------------------------------------------- | --------------------------------------------------------- |
| `src/lib/admin/referencias.ts`                                               | Todo el módulo                                            |
| `prisma/migrations/20260916124255_busqueda_difusa_referencias/migration.sql` | Extensiones, `parfam_normalize()`, `searchText` e índices |

## API pública interna

```ts
buscarReferencias(query: string) → ResultadoReferencia[]   // hasta 12
referenciaParaAdoptar(id: string) → ReferenciaAdoptable | null
```

## Dependencias

`lib/db` (`prisma.$queryRaw`, `Prisma.sql`, `Prisma.join`). Nada más.

## Entidades

`FragranceRef`, `Brand`, `Note`, `Accord`, `Perfumer` y las tres join tables de
referencia. **Sólo lectura.**

## Persistencia

Ninguna escritura. La capa de referencia la puebla
[`modules/datos-referencia.md`](datos-referencia.md).

---

## Por qué no es una consulta de Prisma

Tres problemas que Prisma no resuelve, resueltos en la migración:

### 1. El `OR` entre dos tablas fuerza un seq scan

El admin escribe `"sauvage dior"`, que mezcla nombre (`FragranceRef.name`) y
marca (`Brand.name`). Con las columnas en tablas distintas, el `OR` obliga a un
seq scan de las 70k filas aunque cada una tenga índice — **medido: 293 ms**.

Solución: desnormalizar en `FragranceRef.searchText = "<nombre> <marca>"`, que
escribe el importador, y poner un GIN trigram encima.

### 2. `unaccent()` no es indexable

`unaccent()` viene declarada `STABLE` (depende del `search_path` para resolver
el diccionario) y Postgres no indexa funciones que no sean `IMMUTABLE`.

```sql
CREATE OR REPLACE FUNCTION parfam_normalize(text)
  RETURNS text LANGUAGE sql IMMUTABLE PARALLEL SAFE STRICT
AS $$ SELECT lower(public.unaccent('public.unaccent'::regdictionary, $1)) $$;
```

Fijar el diccionario por nombre calificado la vuelve determinista, y recién ahí
se puede usar en un índice de expresión:

```sql
CREATE INDEX "FragranceRef_search_trgm_idx"
  ON "FragranceRef" USING gin (parfam_normalize("searchText") gin_trgm_ops);
```

`gin_trgm_ops` es lo que hace que un `LIKE '%algo%'` use índice.

### 3. Ordenar por rating crudo da resultados malos

Ver abajo.

---

## Cómo se tokeniza la consulta

```ts
const MINIMO_INDEXABLE = 3;

function terminos(query) {
  return query
    .trim()
    .toLowerCase()
    .split(/\s+/)
    .filter((t) => t.length >= MINIMO_INDEXABLE)
    .slice(0, 6);
}
```

- **Un `AND` por palabra**: `"sauvage dior"` encuentra el Sauvage **de Dior**, no
  todos los Sauvage ni todos los Dior.
- **Palabras de menos de 3 letras se descartan del filtro** (no del orden): un
  índice trigram no puede resolver un patrón de menos de 3 caracteres — no hay
  trigrama que buscar. Medido: **244 ms** para `"le"` contra **9 ms** para
  `"noir"`. En `"eau de nuit"`, el `"de"` no aporta y forzaría el seq scan; en
  `"le male"`, filtra por `"male"`, que alcanza.
- Máximo 6 términos.
- Si no queda ninguna palabra de 3+ caracteres, devuelve `[]` sin consultar.

**Escape de comodines**: `patronLike()` escapa `\`, `%` y `_` (el backslash
primero, o se re-escaparía a sí mismo). Sin esto, un `%` tipeado traería
cualquier cosa. Cada patrón viaja como **parámetro ligado** vía `Prisma.sql` /
`Prisma.join`, nunca interpolado en el texto de la query.

---

## El ranking: dos señales

### Señal 1 — Popularidad (promedio bayesiano)

Ordenar por `ratingValue` crudo no sirve: el dataset tiene una **mediana de 25
votos**, así que una edición limitada con 14 votos y 4,79 le gana al Angel de
Mugler.

```
bayes = (v·R + m·C) / (v + m)
```

Cada fragancia arranca con `m` votos imaginarios en la media del dataset y sólo
se despega de ahí si juntó votos de verdad (el truco del top 250 de IMDb).

Medido sobre las **63.769 filas con rating**: `C = 3,977`, mediana 25 votos.
`m = VOTOS_PREVIOS = 150` cae entre el percentil 75 (110) y el 90 (390).

### Señal 2 — Parecido (`similarity()` de `pg_trgm`)

La popularidad sola tampoco alcanza: `"angel mugler"` traía
_"The Taste of Fragrance Angel"_ antes que el Angel de 1992, porque el original
es polarizante (3,57 con 29.722 votos).

`similarity()` da la señal de **relevancia**: el `searchText` `"Angel Mugler"`
puntúa **1,00** contra la consulta y `"Angel Les Parfums de Cuir Mugler"`, 0,45.

### La mezcla

```sql
ORDER BY similarity(normalizado, consulta) * 0.75
       + (popularidad - 3) / 2 * 0.25   DESC,
         ratingCount DESC NULLS LAST,
         name ASC
```

El bayesiano se reescala de `[3;5]` a `[0;1]` para que las dos señales jueguen
en la misma escala: sin eso, la popularidad (comprimida entre 3,5 y 4,3) no
movía nada.

Para el parecido se usa la **consulta entera**, no los términos filtrados: ahí
sí importa que `"le male"` puntúe como `"le male"`.

---

## La estructura de la consulta

```sql
WITH bayes AS (
  SELECT …, parfam_normalize(f."searchText") AS normalizado,
         (COALESCE(ratingCount,0)*COALESCE(ratingValue,3.977) + 150*3.977)
         / (COALESCE(ratingCount,0) + 150) AS popularidad
    FROM "FragranceRef" f
   WHERE parfam_normalize(f."searchText") LIKE $1 ESCAPE '\'
     AND parfam_normalize(f."searchText") LIKE $2 ESCAPE '\'
   ORDER BY popularidad DESC
   LIMIT 60                      -- ← CANDIDATOS
)
SELECT … FROM bayes c JOIN "Brand" b ON b.id = c."brandId"
 ORDER BY <la mezcla de arriba>
 LIMIT 12                        -- ← LIMITE
```

**El `LIMIT 60` del CTE es lo que mantiene barato el `similarity()`**: sin él,
una consulta poco selectiva lo evaluaría sobre miles de filas. Los 60 más
populares siempre contienen al que se busca.

`ratingValue` vuelve como `Prisma.Decimal` y se convierte a `Number` al salir.

---

## Adoptar

`referenciaParaAdoptar(id)` trae todo lo que el formulario precarga:

| Campo                    | Destino                                                             |
| ------------------------ | ------------------------------------------------------------------- |
| `name`, `year`, `gender` | Campos del formulario                                               |
| `brand` (`id` + `name`)  | Marca, ya vinculada                                                 |
| `notes`                  | Con `position`, `sortOrder` y `nameEs ?? nameEn` + flag `traducida` |
| `accords`                | Ordenados por `rank` (1 = más relevante), con su `color`            |
| `perfumers`              | Lista de ids + nombres                                              |
| `url`                    | Link a Fragrantica, para consultar                                  |
| `descriptionEn`          | **Interno**: ayuda para redactar. **Nunca se publica**              |

`descriptionEn` se muestra en el panel y **no** se copia a `Product.description`:
ese campo lo escribe el admin en español. Es una de las reglas de negocio
centrales del proyecto.

---

## Límites conocidos

- Una consulta con **todas** las palabras de menos de 3 caracteres devuelve `[]`.
  `"a s"` no encuentra nada, por diseño.
- El `LIMIT 60` puede, en teoría, dejar fuera una fragancia muy poco popular
  cuyo nombre matchea perfecto. El comentario del código asume que no pasa
  ("los 60 más populares siempre contienen al que se busca") — **[Inferido]** es
  una heurística calibrada, no una garantía.
- `Perfumer.name` llega con mayúsculas inconsistentes y el panel lo muestra
  crudo → [`findings.md#f-21`](../findings.md#f-21).

## Flujos relacionados

- [`flows/publicar-producto.md`](../flows/publicar-producto.md#paso-1--adoptar-una-referencia)
- [`modules/datos-referencia.md`](datos-referencia.md) — de dónde salen los datos
