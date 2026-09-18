# Rutas

Inventario completo. Extraído de `src/app/**/{page,route,layout}.tsx` y de
`src/proxy.ts`. Los route groups `(tienda)` y `(panel)` **no** aparecen en la URL.

- Rutas públicas: **10**
- Rutas del panel: **9** (+ `/admin/login`, que queda fuera del grupo `(panel)`)
- Route Handlers: **2** → [`api.md`](api.md)
- Rutas de metadata: `robots.ts`, `sitemap.ts`, `icon.tsx`, 10 × `opengraph-image.tsx`

---

## Layouts

| Layout     | Archivo                            | Envuelve        | Qué aporta                                                                                                                                                                                |
| ---------- | ---------------------------------- | --------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Root**   | `src/app/layout.tsx`               | todo            | `<html lang="es-AR">`, fuente Outfit, `generateMetadata()` que lee `SiteSetting` (título/descripción por defecto + `template: "%s — {brandName}"`), verificación de Google Search Console |
| **Tienda** | `src/app/(tienda)/layout.tsx`      | las 10 públicas | `ThemeProvider` (next-themes, sin toggle) → `NuqsAdapter` → `Header` + `<main>` + `Footer` + `Toaster`                                                                                    |
| **Panel**  | `src/app/admin/(panel)/layout.tsx` | las 9 del panel | **`auth()` + `redirect("/admin/login")`** ← control de acceso real · `TooltipProvider` · `NuqsAdapter` · `SidebarProvider` + `AdminSidebar` + `UserMenu` · `Toaster`                      |

`/admin/login` queda **fuera** de `(panel)`: usa sólo el root layout, así que no
se envuelve en el guard ni en el sidebar.

---

## Tienda

Ninguna requiere autenticación. Todas usan el layout de tienda.

### `/` — Home

| Campo            | Valor                                                                                              |
| ---------------- | -------------------------------------------------------------------------------------------------- |
| **Archivo**      | `src/app/(tienda)/page.tsx`                                                                        |
| **Datos**        | `cargarFiltros(searchParams)` + `opcionesDeFiltro()`, en paralelo                                  |
| **Render**       | `<Hero>` (lee `SiteSetting.brandTagline`) + `<SeccionCatalogo titulo="Catálogo" nivelTitulo="h2">` |
| **Query params** | Los de `parsersCatalogo` (ver abajo)                                                               |
| **Navegación**   | `/producto/:slug`, `/marca/:slug`, `/catalogo`, ancla al catálogo                                  |
| **Nota**         | El `<h1>` es el logotipo del hero; por eso el catálogo entra como `h2`                             |

### `/catalogo`

| Campo            | Valor                                                                                 |
| ---------------- | ------------------------------------------------------------------------------------- |
| **Archivo**      | `src/app/(tienda)/catalogo/page.tsx`                                                  |
| **Datos**        | Igual que la home                                                                     |
| **Query params** | `q`, `genero`, `presentacion`, `marca`, `acorde`, `nota`, `precio`, `orden`, `pagina` |
| **Metadata**     | Estática vía `metadataDePagina()`                                                     |
| **Navegación**   | Migas a `/`; tarjetas a `/producto/:slug`                                             |

#### Query params del catálogo

Definidos una sola vez en `src/lib/tienda/filtros.ts` y compartidos por el
Server Component (`cargarFiltros`) y los controles de cliente
(`useQueryStates(parsersCatalogo)`).

| Param          | Tipo    | Default     | Valores                                                           |
| -------------- | ------- | ----------- | ----------------------------------------------------------------- |
| `q`            | string  | `""`        | texto libre; matchea `Product.name` o `Brand.name` (insensible)   |
| `genero`       | literal | `null`      | `WOMEN` · `MEN` · `UNISEX`                                        |
| `presentacion` | literal | `null`      | `FULL_BOTTLE` · `TESTER` · `DECANT`                               |
| `marca`        | string  | `null`      | slug de `Brand`                                                   |
| `acorde`       | string  | `null`      | slug de `Accord`                                                  |
| `nota`         | string  | `null`      | slug de `Note`                                                    |
| `precio`       | literal | `null`      | `hasta-50000` · `50000-100000` · `100000-200000` · `desde-200000` |
| `orden`        | literal | `novedades` | `novedades` · `precio-asc` · `precio-desc` · `nombre`             |
| `pagina`       | int     | `1`         | se acota a `[1, paginas]` en `listarCatalogo()`                   |

Opciones de nuqs (`opcionesCatalogo`): `shallow: false` (cada cambio vuelve al
servidor, el filtrado es server-side), `clearOnDefault: true` (URL limpia y
compartible), `scroll: false`.

### `/producto/[slug]`

| Campo              | Valor                                                                                                                                     |
| ------------------ | ----------------------------------------------------------------------------------------------------------------------------------------- |
| **Archivo**        | `src/app/(tienda)/producto/[slug]/page.tsx`                                                                                               |
| **Datos**          | `productoPorSlug(slug)` ∥ `obtenerConfiguracionSitio()`; después `relacionados(...)`                                                      |
| **Guard de datos** | `productoPorSlug` filtra `status: PUBLISHED`. Un borrador devuelve `null` → `notFound()` (404 aunque se conozca el slug)                  |
| **Metadata**       | `generateMetadata()`: usa `seoTitle`/`seoDescription` del producto, con fallback a `"{nombre} — {marca}"` y a la descripción              |
| **JSON-LD**        | `Product` + `AggregateOffer` + `BreadcrumbList` (`src/lib/seo.ts`)                                                                        |
| **Componentes**    | `Galeria`, `Comprar` (cliente), `Piramide`, `FichaTecnica`, `BarrasCaracter`, `ChipAcorde`, relacionados                                  |
| **APIs usadas**    | Ninguna en render. `Comprar` escribe en el store del carrito; el link "Consultar por WhatsApp" usa `linkWhatsappA(config.whatsappNumber)` |
| **Navegación**     | `/catalogo`, `/marca/:slug`, `/que-es-un-tester` (si hay variante TESTER), otros `/producto/:slug`                                        |

### `/marca/[slug]`

| Campo            | Valor                                                                                                           |
| ---------------- | --------------------------------------------------------------------------------------------------------------- |
| **Archivo**      | `src/app/(tienda)/marca/[slug]/page.tsx`                                                                        |
| **Datos**        | `marcaPorSlug(slug)` ∥ `opcionesDeFiltro()` ∥ `cargarFiltros(searchParams)`                                     |
| **Guard**        | `marcaPorSlug` exige `products: { some: { status: PUBLISHED } }`. Una marca sin nada publicado → `notFound()`   |
| **Filtro fijo**  | `{ ...filtrosUrl, marca: slug }` — el param `marca` de la URL se ignora y su select no se muestra (`marcaFija`) |
| **Query params** | Los del catálogo, menos `marca`                                                                                 |

### `/carrito`

| Campo          | Valor                                                                                      |
| -------------- | ------------------------------------------------------------------------------------------ |
| **Archivo**    | `src/app/(tienda)/carrito/page.tsx` (Server Component sin datos)                           |
| **Datos**      | **Ninguno del servidor.** Todo sale de `localStorage` vía `ContenidoCarrito` (cliente)     |
| **Acciones**   | `validarCarritoAction` al hidratar (vía `useReconciliacionCarrito` dentro de `ListaItems`) |
| **Navegación** | `/checkout`, `/catalogo`, `/producto/:slug`                                                |

### `/checkout`

| Campo          | Valor                                                                                                                                                     |
| -------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Archivo**    | `src/app/(tienda)/checkout/page.tsx`                                                                                                                      |
| **Datos**      | Sólo `SiteSetting.shippingInfo`; el resto es del cliente                                                                                                  |
| **Acciones**   | `validarCarritoAction` (reconciliación) y `crearPedido` (submit)                                                                                          |
| **Estados**    | Sin hidratar → `null` · carrito vacío → CTA a `/catalogo` · verificando → botón deshabilitado · hay cambios de precio → alerta con confirmación explícita |
| **Navegación** | `/pedido/:numero/gracias?link=…` en éxito; abre `wa.me` en una pestaña nueva                                                                              |

### `/pedido/[number]/gracias`

| Campo                     | Valor                                                                                                                                                                                                                                 |
| ------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Archivo**               | `src/app/(tienda)/pedido/[number]/gracias/page.tsx`                                                                                                                                                                                   |
| **Datos**                 | `params.number` (sólo para mostrar), `searchParams.link`, `SiteSetting.whatsappNumber`                                                                                                                                                |
| **Decisión de seguridad** | **Nunca consulta la base por `number`.** El número es adivinable (`PM-0043` sigue a `PM-0042`), así que la página no expone nada de un pedido ajeno: sin `link`, muestra el mismo mensaje genérico para cualquier número, exista o no |
| **Efecto**                | Vacía el carrito al hidratar — evita reenviar el mismo pedido con un F5                                                                                                                                                               |
| **Riesgo**                | `link` llega sin validar al `href` de un `<a>`. Ver [`F-05`](findings.md#f-05)                                                                                                                                                        |

### `/que-es-un-tester`, `/como-comprar`, `/contacto`

| Ruta                | Archivo                         | Datos                                         | Notas                                                            |
| ------------------- | ------------------------------- | --------------------------------------------- | ---------------------------------------------------------------- |
| `/que-es-un-tester` | `.../que-es-un-tester/page.tsx` | ninguno                                       | Contenido estático + `BreadcrumbList`                            |
| `/como-comprar`     | `.../como-comprar/page.tsx`     | `obtenerConfiguracionSitio()` (link WhatsApp) | 4 pasos + JSON-LD                                                |
| `/contacto`         | `.../contacto/page.tsx`         | `obtenerConfiguracionSitio()`                 | JSON-LD `Store` + `BreadcrumbList`; links a WhatsApp e Instagram |

> Las tres se renderizan por request pese a no tener datos dinámicos propios:
> `obtenerConfiguracionSitio()` llama a `connection()`, y el `generateMetadata()`
> del root layout la invoca en toda ruta. Documentado en
> `src/lib/configuracion.ts:85-101`.

---

## Panel de administración

Todas requieren sesión. Doble protección: `src/proxy.ts` redirige antes del
render, el layout de `(panel)` corta con `auth()`. Ver [`authentication.md`](authentication.md).

| Path                     | Archivo                        | Datos                                                                                                      | Acciones disponibles                                                                                                                |
| ------------------------ | ------------------------------ | ---------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------- |
| `/admin`                 | `admin/(panel)/page.tsx`       | `getStats()` local: 5 `count()` (publicados, borradores, pedidos PENDING, notas sin traducir, referencias) | Navegación a las secciones                                                                                                          |
| `/admin/productos`       | `.../productos/page.tsx`       | `listarProductos({ q, estado })`                                                                           | `cambiarEstadoProducto`, `duplicarProducto`, `eliminarProducto` (desde `fila-acciones.tsx`)                                         |
| `/admin/productos/nuevo` | `.../productos/nuevo/page.tsx` | `listarAcordes()`, `r2Configurado()`, `env.R2_PUBLIC_URL`                                                  | `buscarReferenciasAction`, `adoptarReferenciaAction`, `buscar*/crear*`, `pedirUrlDeSubida`, `borrarImagenSubida`, `guardarProducto` |
| `/admin/productos/[id]`  | `.../productos/[id]/page.tsx`  | `productoParaEditar(id)` ∥ `listarAcordes()`; `notFound()` si no existe                                    | Las mismas. El form se remonta con `key={updatedAt}` tras guardar                                                                   |
| `/admin/pedidos`         | `.../pedidos/page.tsx`         | `listarPedidos({ q, estado })` + 5 conteos                                                                 | —                                                                                                                                   |
| `/admin/pedidos/[id]`    | `.../pedidos/[id]/page.tsx`    | `pedidoPorId(id)`; `notFound()` si no existe                                                               | `cambiarEstadoPedido`, `guardarNotasPedido`; link `wa.me` al cliente                                                                |
| `/admin/marcas`          | `.../marcas/page.tsx`          | `listarMarcas(q)`                                                                                          | `actualizarMarca`                                                                                                                   |
| `/admin/notas`           | `.../notas/page.tsx`           | Prisma directo: `findMany` + 3 `count()`                                                                   | `traducirNota`, `borrarTraduccion`                                                                                                  |
| `/admin/configuracion`   | `.../configuracion/page.tsx`   | `obtenerConfiguracionEditable()` (**sin** caché ni fallback)                                               | `guardarConfiguracion`                                                                                                              |
| `/admin/login`           | `admin/login/page.tsx`         | `searchParams.volverA`                                                                                     | `login` (`useActionState`)                                                                                                          |

### Query params del panel

| Ruta               | Params                                                                   | Notas                                                                                                             |
| ------------------ | ------------------------------------------------------------------------ | ----------------------------------------------------------------------------------------------------------------- |
| `/admin/productos` | `q`, `estado` ∈ `todos\|publicados\|borradores`                          | Leídos a mano de `searchParams`, validados con un type guard. Los escribe `nuqs` desde los componentes de cliente |
| `/admin/pedidos`   | `q`, `estado` ∈ `todos\|pendientes\|confirmados\|entregados\|cancelados` | Ídem                                                                                                              |
| `/admin/marcas`    | `q`                                                                      | Sin `q`: sólo marcas con productos. Con `q`: busca en las 1.748, `take: 50`                                       |
| `/admin/notas`     | `q`, `estado` ∈ `pendientes\|traducidas`, `pagina`                       | 50 por página; el `hrefPagina()` local arma los links                                                             |
| `/admin/login`     | `volverA`                                                                | Lo pone el proxy. `login()` sólo lo acepta si empieza con `/admin`                                                |

---

## Redirecciones y guards

| Condición                                                   | Resultado                                                              | Dónde                                    |
| ----------------------------------------------------------- | ---------------------------------------------------------------------- | ---------------------------------------- |
| Sin sesión en `/admin/*`                                    | `302 → /admin/login?volverA=<path+search>`                             | `src/proxy.ts:28-33`                     |
| Con sesión en `/admin/login`                                | `302 → /admin`                                                         | `src/proxy.ts:20-25`                     |
| Sin sesión en el layout del panel                           | `redirect("/admin/login")`                                             | `src/app/admin/(panel)/layout.tsx:20-22` |
| Login OK                                                    | `redirect(volverA ?? "/admin")`, con `volverA` restringido a `/admin*` | `src/app/admin/login/actions.ts:50-70`   |
| Slug de producto inexistente **o en borrador**              | `notFound()` (404)                                                     | `producto/[slug]/page.tsx:58`            |
| Marca sin productos publicados                              | `notFound()`                                                           | `marca/[slug]/page.tsx:34`               |
| `/admin/productos/[id]` o `/admin/pedidos/[id]` inexistente | `notFound()`                                                           | ambas páginas                            |
| Checkout exitoso                                            | `router.push("/pedido/…/gracias?link=…")`                              | `formulario-checkout.tsx:124-126`        |

No hay `redirects` ni `rewrites` en `next.config.ts`.

---

## Rutas de metadata

| Archivo                                | URL                | Comportamiento                                                                                                                                                                                            |
| -------------------------------------- | ------------------ | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `src/app/robots.ts`                    | `/robots.txt`      | Estático. `allow: /`, `disallow: ["/admin/", "/api/"]`, apunta al sitemap                                                                                                                                 |
| `src/app/sitemap.ts`                   | `/sitemap.xml`     | `force-dynamic`; la consulta va en `unstable_cache(["sitemap-urls"], { revalidate: 3600 })`. 5 páginas estáticas + un entry por producto publicado con variante activa + uno por marca con algo publicado |
| `src/app/icon.tsx`                     | `/icon`            | Favicon 64×64 generado con `ImageResponse` (la "P" en Outfit ExtraBold)                                                                                                                                   |
| `src/app/(tienda)/opengraph-image.tsx` | `/opengraph-image` | 1200×630, sólo el logotipo. Calibrada para la miniatura ~200px que WhatsApp recorta al cuadrado central                                                                                                   |
| 9 × `opengraph-image.tsx`              | por segmento       | Reexportan la de `(tienda)/` — la convención de Next no se hereda a rutas anidadas                                                                                                                        |

El `force-dynamic` del sitemap es deliberado: con `export const revalidate`,
Next lo prerenderizaba en `next build` y era la primera ruta que rompía un build
sin Postgres (`src/app/sitemap.ts:6-18`).
