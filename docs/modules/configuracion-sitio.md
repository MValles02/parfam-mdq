# Módulo · Configuración del sitio

## Responsabilidad

Una única fila (`SiteSetting`, `id: "singleton"`) con todo lo que el dueño puede
cambiar **sin tocar código**: número de WhatsApp, plantilla del mensaje de
pedido, nombre y tagline de la marca, Instagram, texto de envío y los
title/description por defecto de SEO.

Es el módulo con más consumidores del proyecto: el root layout la lee en
`generateMetadata()`, así que **toda ruta** depende de él.

## Entry points

| Superficie                      | Archivo                                                    |
| ------------------------------- | ---------------------------------------------------------- |
| `/admin/configuracion`          | `src/app/admin/(panel)/configuracion/page.tsx`             |
| `guardarConfiguracion(entrada)` | `.../configuracion/actions.ts:36`                          |
| Lectura pública                 | `src/lib/configuracion.ts` → `obtenerConfiguracionSitio()` |

## Archivos principales

| Archivo                                                      | Rol                                                             |
| ------------------------------------------------------------ | --------------------------------------------------------------- |
| `src/lib/configuracion.ts`                                   | Lectura **cacheada con tag**, con fallback a `siteDefaults`     |
| `src/lib/admin/configuracion.ts`                             | Lectura **cruda**, para precargar el formulario                 |
| `src/lib/site.ts`                                            | `siteDefaults`: semilla y fallback. Importable desde el cliente |
| `src/lib/validations/configuracion.ts`                       | `configuracionSchema`                                           |
| `.../configuracion/_components/formulario-configuracion.tsx` | El formulario                                                   |
| `prisma/seed.ts`                                             | Crea la fila `singleton`                                        |

## API pública interna

```ts
// src/lib/configuracion.ts
TAG_CONFIGURACION_SITIO = "site-settings"
obtenerConfiguracionSitio(): Promise<ConfiguracionSitio>   // cacheada, con fallbacks

// src/lib/admin/configuracion.ts
obtenerConfiguracionEditable(): Promise<ConfiguracionEditable>   // cruda, sin fallbacks

// src/lib/site.ts
siteDefaults  // name, legalName, tagline, description, city, whatsapp, instagram, url
```

## Entidades

`SiteSetting` — la única fila. Columnas obligatorias: `whatsappNumber`,
`whatsappMessageTemplate`, `brandName`, `brandTagline`. Opcionales: `logoUrl`,
`heroImageUrl`, `instagramHandle`, `shippingInfo`, `announcementBar`,
`seoDefaultTitle`, `seoDefaultDescription`.

> `logoUrl`, `heroImageUrl` y `announcementBar` **existen en el schema y no se
> leen ni se escriben en ningún lado**: no están en `ConfiguracionSitio`, ni en
> `ConfiguracionEditable`, ni en `configuracionSchema`, ni en el formulario.
> Ver [`findings.md#f-24`](../findings.md#f-24).

## Consumidores

| Campo                                       | Quién lo usa                                                                           |
| ------------------------------------------- | -------------------------------------------------------------------------------------- |
| `brandName`                                 | Root layout (`title.template`), `armarMensajePedido` (`{{marca}}`)                     |
| `seoDefaultTitle` / `seoDefaultDescription` | Root layout (`generateMetadata`)                                                       |
| `brandTagline`                              | `Hero` de la home                                                                      |
| `whatsappNumber`                            | Footer, `/contacto`, `/como-comprar`, `Comprar` de la ficha, `crearPedido`, `/gracias` |
| `whatsappMessageTemplate`                   | `crearPedido` → `armarMensajePedido`                                                   |
| `instagramHandle`                           | Footer, `/contacto`                                                                    |
| `shippingInfo`                              | `/checkout`                                                                            |

---

## Por qué hay **dos** lecturas

|                                     | `obtenerConfiguracionSitio()` | `obtenerConfiguracionEditable()` |
| ----------------------------------- | ----------------------------- | -------------------------------- |
| **Quién**                           | La tienda y el checkout       | Sólo `/admin/configuracion`      |
| **Caché**                           | `unstable_cache` con tag      | **Ninguna**                      |
| **Si falta la fila**                | Cae a `siteDefaults`          | **Lanza** (`findUniqueOrThrow`)  |
| **Si un campo opcional está vacío** | Devuelve el fallback          | Devuelve `""`                    |

La diferencia del último punto es la razón de ser de la segunda función: si el
formulario mostrara el fallback de la tienda en un campo vacío, el admin
guardaría ese fallback **como si fuera texto elegido por él**
(`src/lib/admin/configuracion.ts:14-24`).

### Fallbacks de la versión pública

| Campo                        | Si la fila falta                 | Si el campo es `null`            |
| ---------------------------- | -------------------------------- | -------------------------------- |
| `whatsappNumber`             | `siteDefaults.whatsapp`          | — (obligatorio)                  |
| `whatsappMessageTemplate`    | `PLANTILLA_WHATSAPP_DEFECTO`     | — (obligatorio)                  |
| `brandName` / `brandTagline` | `siteDefaults.name` / `.tagline` | — (obligatorios)                 |
| `instagramHandle`            | `siteDefaults.instagram`         | `siteDefaults.instagram`         |
| `shippingInfo`               | `ENVIO_DEFECTO`                  | `ENVIO_DEFECTO`                  |
| `seoDefaultTitle`            | `"{name} — {tagline}"`           | `"{brandName} — {brandTagline}"` |
| `seoDefaultDescription`      | `siteDefaults.description`       | `siteDefaults.description`       |

---

## Caché: `unstable_cache` + tag + `connection()`

```ts
const configuracionCacheada = unstable_cache(
  leerConfiguracionSitio,
  ["site-settings"],
  { tags: [TAG_CONFIGURACION_SITIO] },
);

export async function obtenerConfiguracionSitio() {
  await connection(); // ← corta el prerender
  return configuracionCacheada();
}
```

**`unstable_cache` y no `"use cache"`**: la API nueva de Next 16 exige
`cacheComponents: true` en `next.config.ts`, que este proyecto no activó — así
que sigue vigente el modelo anterior.

**`connection()`** es la pieza clave. Sin ella, toda ruta que lea la
configuración —y son todas, porque el `generateMetadata()` del root layout la
lee— se prerenderizaría en `next build` con el valor que tuviera la base **en el
build**. Como el build corre en CI, ese valor sería el del seed: **cada deploy
revertiría el footer, el título y el texto de envío** hasta que alguien volviera
a guardar en el panel.

Con `connection()` el dato se lee siempre en runtime y el build deja de
necesitar Postgres. El costo: las cinco páginas que antes salían
prerenderizadas (`/carrito`, `/checkout`, `/contacto`, `/como-comprar`,
`/que-es-un-tester`) pasan a renderizarse por request. La consulta la sigue
ahorrando `unstable_cache`, así que lo que se paga es el render.

### Invalidación

```ts
revalidateTag(TAG_CONFIGURACION_SITIO, { expire: 0 });
```

`{ expire: 0 }` y no un profile como `"max"`: acá **no vale**
stale-while-revalidate. El checkout del pedido siguiente tiene que ver el número
nuevo **ya**, no eventualmente.

---

## Validación

`configuracionSchema` reusa piezas de otros módulos a propósito:

| Campo                     | Regla                                                                                                                                   |
| ------------------------- | --------------------------------------------------------------------------------------------------------------------------------------- |
| `whatsappNumber`          | **El mismo `telefono` de `validations/checkout.ts`**: `libphonenumber-js` región AR → E.164. Es el mismo dato que `Order.customerPhone` |
| `whatsappMessageTemplate` | 1-2000 chars. **No se valida que contenga los placeholders**                                                                            |
| `brandName`               | 1-120, obligatorio                                                                                                                      |
| `brandTagline`            | 1-200, obligatorio                                                                                                                      |
| `instagramHandle`         | ≤ 60. Quita el `@` inicial: se guarda sin arroba porque el `@` lo agrega el componente que lo muestra                                   |
| `shippingInfo`            | `textoOpcional(300)` — de `validations/producto.ts`                                                                                     |
| `seoDefaultTitle`         | `textoOpcional(70)`                                                                                                                     |
| `seoDefaultDescription`   | `textoOpcional(180)`                                                                                                                    |

`guardarConfiguracion` es **siempre un `update`**, nunca un `create`: la fila
`singleton` siempre existe porque la siembra el seed.

---

## La plantilla de WhatsApp

Cinco placeholders, expandidos por `src/lib/tienda/mensaje-pedido.ts`:

| Placeholder  | Valor                                                                        |
| ------------ | ---------------------------------------------------------------------------- |
| `{{marca}}`  | `brandName`                                                                  |
| `{{items}}`  | El único multilínea: `• <marca> <producto> — <variante> x<qty> — <subtotal>` |
| `{{total}}`  | Total formateado en ARS                                                      |
| `{{nombre}}` | Nombre del cliente                                                           |
| `{{numero}}` | `PM-0042`                                                                    |

Por defecto (`prisma/seed.ts` y el fallback de `configuracion.ts`):

```
¡Hola! Quiero hacer este pedido en {{marca}}:

{{items}}

Total: {{total}}

Nombre: {{nombre}}
Pedido: {{numero}}
```

`replaceAll` para cada uno: un placeholder puede repetirse. Un placeholder mal
escrito queda literal en el mensaje — **no hay validación** de que la plantilla
los contenga.

---

## Lo que **no** es configurable

Está en `src/lib/site.ts` (`siteDefaults`) o hardcodeado:

- El **logotipo** es tipografía (Outfit ExtraBold), no un archivo: `logoUrl` no
  se usa.
- `legalName`, `city` y `url` de `siteDefaults`.
- El token de verificación de Google Search Console (`src/app/layout.tsx`).
- Los textos de `/que-es-un-tester` y `/como-comprar`.
- La frase _"Perfumes originales en Mar del Plata."_ del footer.
- `"Envío en Mar del Plata · Retiro a convenir · 100% original"` de la ficha.

## Flujos relacionados

- [`data-flow.md`](../data-flow.md#5-caché-y-revalidación)
- [`modules/seo.md`](seo.md)
- [`flows/crear-pedido.md`](../flows/crear-pedido.md) — dónde se usa la plantilla
