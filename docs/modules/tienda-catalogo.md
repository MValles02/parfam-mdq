# Módulo · Catálogo público

## Responsabilidad

Todo lo que un visitante ve del catálogo: grilla, filtros, paginado, ficha de
producto y página de marca. Es el único módulo que decide **qué se publica**, y
aplica dos reglas que no se negocian:

1. Sólo productos `PUBLISHED`.
2. Sólo variantes `isActive`.

Y una tercera, de negocio: **nada de Fragrantica se muestra**. Las imágenes,
`descriptionEn`, `ratingValue` y `ratingCount` nunca entran a un `select`
público.

## Entry points

| Ruta               | Archivo                                       |
| ------------------ | --------------------------------------------- |
| `/`                | `src/app/(tienda)/page.tsx`                   |
| `/catalogo`        | `src/app/(tienda)/catalogo/page.tsx`          |
| `/marca/[slug]`    | `src/app/(tienda)/marca/[slug]/page.tsx`      |
| `/producto/[slug]` | `src/app/(tienda)/producto/[slug]/page.tsx`   |
| `/sitemap.xml`     | `src/app/sitemap.ts` (consume `urlsDelSitio`) |

## Archivos principales

| Archivo                                                                                       | Rol                                                             |
| --------------------------------------------------------------------------------------------- | --------------------------------------------------------------- |
| `src/lib/tienda/consultas.ts`                                                                 | **El corazón.** Todas las consultas públicas                    |
| `src/lib/tienda/filtros.ts`                                                                   | Parsers nuqs, rangos de precio, órdenes, `contarFiltrosActivos` |
| `src/components/tienda/catalogo/seccion-catalogo.tsx`                                         | Compone el bloque completo; lo usan las tres rutas de grilla    |
| `src/components/tienda/catalogo/grilla.tsx`                                                   | Llama a `listarCatalogo`, dentro del `Suspense`                 |
| `src/components/tienda/catalogo/{panel-filtros,controles-filtro,drawer-filtros}.tsx`          | Filtros desktop y mobile                                        |
| `src/components/tienda/catalogo/{buscador,select-orden,paginado,grilla-skeleton}.tsx`         | Controles                                                       |
| `src/components/tienda/tarjeta-producto.tsx` · `foto-producto.tsx` · `chip-acorde.tsx`        | Tarjeta y piezas                                                |
| `src/components/tienda/producto/{galeria,comprar,piramide,ficha-tecnica,barras-caracter}.tsx` | La ficha                                                        |

## API pública interna

```ts
// src/lib/tienda/consultas.ts
PRODUCTOS_POR_PAGINA = 12

listarCatalogo(f: FiltrosCatalogo)
  → { tarjetas: TarjetaProducto[], total, pagina, paginas }

opcionesDeFiltro()
  → { marcas[], acordes[], notas[] }     // sólo lo que existe publicado

productoPorSlug(slug) → ProductoPublico | null   // null si es DRAFT
relacionados({ id, marcaSlug, acordes }) → TarjetaProducto[]   // hasta 4
marcaPorSlug(slug) → { name, slug, country } | null
urlsDelSitio() → { productos, marcas }
```

```ts
// src/lib/tienda/filtros.ts
(parsersCatalogo, opcionesCatalogo, cargarFiltros(searchParams));
(GENEROS, PRESENTACIONES, ORDENES, RANGOS_PRECIO, LIMITES_PRECIO);
(ETIQUETA_ORDEN, ETIQUETA_PRECIO, contarFiltrosActivos(f));
```

## Dependencias

`lib/db` · `lib/r2` (`urlPublica`) · `lib/catalogo`
(`CONCENTRACION_CORTA`, `etiquetaVariante`, `NIVELES`, `nombrePropio`) ·
`nuqs/server` · `@/generated/prisma`.

**No depende de** `lib/admin/*` ni de `lib/configuracion` (la ficha sí recibe
`whatsappNumber` como prop, resuelto por la página).

## Entidades

`Product`, `Brand`, `ProductVariant`, `ProductImage`, `ProductNote` + `Note`,
`ProductAccord` + `Accord`, `ProductPerfumer` + `Perfumer`.

## Persistencia

Sólo lectura. Ninguna función de este módulo escribe.

---

## Cómo se arma una tarjeta

`SELECT_TARJETA` (`consultas.ts:70-93`) es el `select` compartido por
`listarCatalogo` y `relacionados`. Trae la imagen `isPrimary` (una), el primer
acorde por `sortOrder` (uno) y **sólo las variantes activas**.

`aTarjeta()` transforma eso en:

| Campo      | Cómo se calcula                                                                                                             |
| ---------- | --------------------------------------------------------------------------------------------------------------------------- |
| `meta`     | `"EDP · 2021 · Especiado"` — concentración corta + año + primer acorde capitalizado, unidos por `·`, salteando lo que falte |
| `imagen`   | `urlPublica(storageKey)`; el `alt` cae a `"{nombre} de {marca}"`                                                            |
| `desde`    | El mínimo de `priceArs` entre las activas, **como string**                                                                  |
| `etiqueta` | Un solo cartel, en este orden: `NUEVO` (año ≥ actual − 3) → `DECANT` → `TESTER` (sólo si no hay `FULL_BOTTLE`)              |
| `tamanios` | Hasta tres `sizeMl` distintos, ordenados, como `"5 ml"`                                                                     |

> `NUEVO` mira el **año de lanzamiento del perfume**, no `createdAt`. La primera
> versión usaba `createdAt` y eso se rompía solo: cargar 40 productos el mismo
> día dejaba el catálogo entero con el cartel durante un mes
> (`consultas.ts:35-43`).

---

## Filtrado

```ts
wherePublico(f) = {
  status: PUBLISHED,
  variants: { some: whereVariante(f) },   // ← un publicado sin variante activa
                                          //   no entra a la grilla
  brand:   f.marca   ? { slug: f.marca } : undefined,
  gender:  f.genero  ?? undefined,
  accords: f.acorde  ? { some: { accord: { slug: f.acorde } } } : undefined,
  notes:   f.nota    ? { some: { note:   { slug: f.nota   } } } : undefined,
  ...(termino ? { OR: [ name contains, brand.name contains ] } : {})
}
```

`whereVariante()` pone presentación **y** rango de precio en el **mismo `some`**
a propósito: se pregunta si existe _una_ variante que cumpla las dos cosas, no
un decant por un lado y algo barato por el otro (`consultas.ts:172-187`).

Un producto publicado **sin ninguna variante activa** no entra a la grilla, pero
su ficha sigue respondiendo por URL.

El texto libre usa `contains` insensible, no el índice trigram: el catálogo
propio son decenas de filas, no las 70k de referencia.

### Rangos de precio

Opciones cerradas, no dos inputs: cuatro escalones legibles y el parámetro
acotado. Un producto entra al rango si **alguna** de sus variantes activas cae
adentro — así que _"hasta $ 50.000"_ significa _"tiene algo accesible"_, no
_"es barato"_.

Los cortes están calibrados contra el seed de desarrollo, con un `TODO` abierto
→ [`findings.md#f-20`](../findings.md#f-20).

---

## Orden y paginado

Se hacen **en memoria** (`consultas.ts:229-275`):

| `orden`                      | Criterio                                                       |
| ---------------------------- | -------------------------------------------------------------- |
| `novedades` (default)        | `isFeatured` primero, después `createdAt` descendente          |
| `precio-asc` / `precio-desc` | Por `desde`; los que no tienen precio van **siempre al final** |
| `nombre`                     | `Intl.Collator("es-AR", { sensitivity: "base" })`              |

Después: `paginas = ceil(total / 12)`, y `pagina` se acota a `[1, paginas]` —
un `?pagina=999` devuelve la última, no una vacía.

El motivo de ordenar en JS y el umbral para reescribirlo en SQL están en
[`findings.md#f-13`](../findings.md#f-13).

---

## Opciones de filtro

`opcionesDeFiltro()` devuelve **sólo lo que existe en el catálogo publicado**:
un filtro que no puede devolver nada es ruido, y las 1.748 marcas de referencia
no tienen por qué aparecer.

- **Marcas**: las que tienen al menos un producto `PUBLISHED`, alfabéticas.
- **Acordes**: los usados por algún publicado, con su `color`.
- **Notas**: se piden por `usageCount` descendente y **se reordenan en JS** con
  el `Collator` es-AR, con fallback `nameEs ?? nameEn`.

---

## Ficha de producto

`productoPorSlug()` filtra por `status: PUBLISHED` — por eso `notFound()`
alcanza para que un borrador dé 404 aunque nadie lo enlace.

Construye:

- **Pirámide**: `NIVELES` (`TOP`→`MIDDLE`→`BASE`, el orden en que se evapora),
  filtrando los niveles vacíos, con fallback al inglés por nota.
- **Imágenes**: ordenadas `isPrimary desc, sortOrder asc`, filtrando las que no
  tienen URL (R2 sin configurar).
- **Variantes**: sólo activas, por `sortOrder`, con `etiquetaVariante()` y
  precio como string.
- **Perfumistas**: normalizados con `nombrePropio()` →
  [`findings.md#f-21`](../findings.md#f-21).

### Relacionados

Dos consultas **secuenciales**, no una: primero hasta 4 de la misma marca,
después las que falten por acorde compartido, excluyendo las ya traídas. Así la
marca gana siempre. Ambas ordenan por `isFeatured desc, createdAt desc`.

---

## Flujos relacionados

- [`flows/ver-catalogo.md`](../flows/ver-catalogo.md)
- [`flows/agregar-al-carrito.md`](../flows/agregar-al-carrito.md) — la ficha es
  el entry point
- [`modules/seo.md`](seo.md) — `generateMetadata` y JSON-LD de la ficha
