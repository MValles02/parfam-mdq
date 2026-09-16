# Parfam MDQ — Storefront + Panel de administración

## Contexto

El emprendimiento de perfumería de tu hermano (Mar del Plata) vende perfumes originales —
frasco entero, **tester** y **decants** — y hoy todo pasa por WhatsApp. El objetivo es una
tienda propia en `parfammdq.com` con:

- Home con encabezado de marca y, al scrollear, el catálogo con filtros.
- Ficha por producto con datos detallados de la fragancia (estilo Fragrantica).
- Carrito y checkout que termina en un mensaje de WhatsApp prearmado (no hay pasarela de pago).
- Panel de administración para el CRUD de productos y la configuración del sitio.

Deploy en Dokploy sobre la VPS (7.6 GB RAM, 61 GB libres, Docker 29.8), siguiendo la
[doc de producción de Dokploy](https://docs.dokploy.com/docs/core/applications/going-production):
**buildear en CI y desplegar la imagen**, no compilar en el servidor.

### Decisiones tomadas

| Tema                      | Decisión                                                                                     |
| ------------------------- | -------------------------------------------------------------------------------------------- |
| Stack                     | Next.js 16 full-stack (App Router) + TypeScript + Tailwind + shadcn/ui + Prisma + PostgreSQL |
| Imágenes                  | Cloudflare R2, bucket `parfam-mdq-imagenes` servido por `img.parfammdq.com`                  |
| Pedidos                   | Se persisten con estados (pendiente/confirmado/entregado/cancelado)                          |
| Variantes                 | Frasco entero / tester / decant, precio por variante, **sin stock**: toggle activo-inactivo  |
| Checkout                  | Formulario con nombre + teléfono → crea el pedido → abre WhatsApp                            |
| Auth admin                | Auth.js v5 con credenciales, usuarios en Postgres                                            |
| Datos de fragancias       | Datasets públicos de Fragrantica (Kaggle): 69.948 referencias                                |
| Idioma de notas y acordes | Español, con diccionario propio en el repo y fallback al inglés                              |
| Ratings de comunidad      | No se muestran (se importan sólo para ordenar el buscador del admin)                         |
| Precios                   | ARS, cargados a mano por variante                                                            |
| Idioma del sitio          | Español, con `next-intl` configurado para sumar idiomas después                              |
| Analítica                 | Umami self-hosted como app aparte en Dokploy                                                 |
| Deploy                    | GitHub Actions → GHCR → webhook de Dokploy                                                   |
| Diseño                    | Canvas de Claude Design antes de codear el storefront                                        |

---

## Identidad visual

Extraída de las piezas de Canva en `brand/`. No hay SVG del logo, así que se reconstruye
con tipografía web.

| Elemento   | Valor                                                                                           |
| ---------- | ----------------------------------------------------------------------------------------------- |
| Fondo      | `#F2EEE9` (crema cálido) — ocupa el 90-97% de cada pieza                                        |
| Tinta      | `#000000` puro                                                                                  |
| Logotipo   | `ParfamMdq` en geométrica muy bold + `P E R F U M E R I A` en versalitas espaciadas             |
| Tipografía | Geométrica sans ExtraBold (tipo Gilroy/Cocogoose). Equivalente libre: **Outfit** (Google Fonts) |
| Tagline    | **"No solo es un perfume"**                                                                     |
| Instagram  | **@parfam_mdq**                                                                                 |
| WhatsApp   | **+54 9 223 616 3910**                                                                          |

La estética es minimalista: crema, negro, tipografía pesada, mucho aire. Nada de dorados ni
degradés — el color lo ponen las fotos de los frascos y los chips de acordes. El logotipo se
arma con Outfit ExtraBold + tracking en el subtítulo, y se exporta a SVG desde el propio
sitio para el favicon y los OG images.

### Venden testers, y eso entra en el modelo

La pieza `4.png` explica qué es un tester (producto nuevo, auténtico, envase simple sin tapa
decorativa, más barato). Dos consecuencias:

- `ProductVariant.kind` es **`FULL_BOTTLE` | `TESTER` | `DECANT`**.
- Se agrega la página **`/que-es-un-tester`** con ese texto, que ya está escrito por ellos.
  Es contenido propio, sirve para SEO y baja la fricción de la venta.

---

## El catálogo de referencia

Ver `data/fragrantica/README.md` para el detalle del formato. Lo esencial:

- Dos CSV de Kaggle que se unen por el **PID** del final de la URL. `fra_cleaned` (24.063)
  está contenido en `fra_perfumes` (69.948). **Unión: 69.948 referencias.**
- **46.578 (67%) tienen pirámide de notas**, combinando los campos Top/Middle/Base de
  `fra_cleaned` y el parseo por regex de la descripción de `fra_perfumes`
  (`Top notes are …; middle notes are …; base notes are …`).
- Todo viene en inglés y sin colores, íconos ni grupos.

### Diccionarios propios (`data/dictionaries/`)

Lo que el dataset no trae lo ponemos nosotros, versionado en el repo:

- `accords.es.json` — los ~90 acordes con su traducción y un **color hex propio** (no se copia
  ninguna paleta de terceros). Son los chips de color de la ficha.
- `notes.es.json` — las ~500 notas más frecuentes traducidas (cubren >95% de las apariciones).

**Fallback:** una nota sin traducción se muestra en inglés y aparece marcada en
`/admin/notas`, donde tu hermano la traduce en un click. Con ~40 productos en catálogo, en la
práctica se completa solo en los primeros días.

### Cuando un perfume no está en el dataset

Son 30k+ perfumes fuera del dataset, y los lanzamientos nuevos no están. En `/admin/productos/nuevo`,
si el buscador no encuentra la fragancia:

1. Botón **"Buscar en Fragrantica"** que abre `fragrantica.com/search/?query=<lo tipeado>`
   en otra pestaña.
2. Al lado, el mismo formulario en blanco con todos los campos (notas con autocompletado
   sobre el vocabulario ya importado, acordes, año, perfumista) para cargarlo a mano.
3. Un campo `sourceUrl` para pegar el link de Fragrantica y dejar la referencia guardada.

---

## Librerías (nada hecho a mano que ya exista)

| Necesidad                       | Librería                                                                                          |
| ------------------------------- | ------------------------------------------------------------------------------------------------- |
| Framework / routing / SSR / SEO | `next` 16 (App Router, Server Actions)                                                            |
| UI base + accesibilidad         | `tailwindcss` v4, `shadcn/ui` (Radix), `tailwind-merge`, `class-variance-authority`               |
| Íconos                          | `lucide-react`                                                                                    |
| Tipografía                      | `next/font` con **Outfit** (Google Fonts)                                                         |
| Tema claro/oscuro               | `next-themes`                                                                                     |
| Formularios + validación        | `react-hook-form`, `zod`, `@hookform/resolvers`                                                   |
| Estado de filtros en la URL     | `nuqs`                                                                                            |
| Carrito persistente             | `zustand` + middleware `persist`                                                                  |
| Tablas del admin                | `@tanstack/react-table` (shadcn data-table)                                                       |
| Toasts                          | `sonner`                                                                                          |
| Galería de producto             | `embla-carousel-react` (shadcn carousel)                                                          |
| Autocompletado de notas         | `cmdk` (shadcn combobox)                                                                          |
| ORM + migraciones               | `prisma` 7 + `@prisma/client` + `@prisma/adapter-pg` (driver adapter, obligatorio desde Prisma 7) |
| Auth                            | `next-auth@5` (Auth.js) + `@node-rs/argon2`                                                       |
| Subida a R2                     | `@aws-sdk/client-s3`, `@aws-sdk/s3-request-presigner`, `react-dropzone`                           |
| Import del dataset              | `csv-parse` (streaming)                                                                           |
| Slugs                           | `slugify`                                                                                         |
| Validación de env               | `@t3-oss/env-nextjs`                                                                              |
| Teléfonos AR                    | `libphonenumber-js`                                                                               |
| i18n                            | `next-intl`                                                                                       |
| Fechas                          | `date-fns` (locale `es`)                                                                          |
| Rate limit del checkout         | `lru-cache`                                                                                       |
| Calidad                         | `eslint`, `prettier`, `husky`, `lint-staged`                                                      |
| Smoke tests                     | `@playwright/test`                                                                                |

---

## Modelo de datos (Prisma)

Dos capas separadas, y ésta es la decisión estructural clave: **el catálogo de referencia no
es el catálogo de la tienda**. Se importan las 69.948 fragancias como referencia consultable,
y el admin "adopta" las que vende.

### Capa 1 — Referencia (read-only, sembrada por el importador)

- `Brand` — slug, nombre normalizado desde la URL, país.
- `Perfumer` — slug, nombre.
- `Note` — slug, `nameEn`, `nameEs?` (del diccionario, editable desde el panel), `usageCount`.
- `Accord` — slug, `nameEn`, `nameEs`, `color` (nuestro hex).
- `FragranceRef` — `pid`, `url`, `brandId`, nombre, año, `gender`, `ratingValue`/`ratingCount`
  (internos, para ordenar el buscador), `descriptionEn` (interna), `hasPyramid`,
  `originCountry` (de `fra_cleaned.Country`, informativo).
- `FragranceRefNote` — ref × nota × `position` (TOP/MIDDLE/BASE) × orden.
- `FragranceRefAccord` — ref × acorde × `rank` (el dataset no trae porcentaje real, sólo el
  orden de aparición).
- `FragranceRefPerfumer` — ref × perfumista.

> ✅ **Resuelto en la Fase 3:** la búsqueda difusa vive en la migración
> `busqueda_difusa_referencias` (`pg_trgm` + `unaccent` + `parfam_normalize()`), y hubo que
> sumarle una columna desnormalizada `FragranceRef.searchText` porque el `OR` entre
> `FragranceRef.name` y `Brand.name` obligaba a un seq scan. Ver la Fase 3 para los números.

### Capa 2 — Tienda (lo que edita el admin)

- `Product` — slug, nombre, `brandId`, `fragranceRefId?`, `sourceUrl?`, descripción propia en
  español, género, **concentración** (manual), año, `seasons[]`, `occasions[]`,
  `longevity`/`sillage`/`intensity` (1-5, fijados por el admin), `status` (DRAFT/PUBLISHED),
  `isFeatured`, `sortOrder`, `seoTitle`, `seoDescription`.
- `ProductNote` / `ProductAccord` / `ProductPerfumer` — **copiados** de la referencia al
  adoptarla y editables después, así una corrección del admin no se pisa al reimportar.
- `ProductImage` — `url` (R2), `alt`, orden, `isPrimary`.
- `ProductVariant` — `kind` (**FULL_BOTTLE / TESTER / DECANT**), `sizeMl`, `priceArs`
  (Decimal), `isActive`, orden, `sku?`.

### Capa 3 — Pedidos, configuración y usuarios

- `Order` — `number` (`PM-0042`), `customerName`, `customerPhone`, `status`, `totalArs`,
  `adminNotes`, `createdAt`.
- `OrderItem` — **snapshot** de `productName`, `variantLabel`, `unitPriceArs`, `qty`, más FKs
  opcionales, para que un cambio de precio no altere el histórico.
- `SiteSetting` — fila singleton: WhatsApp, plantilla del mensaje, nombre y tagline, logo,
  hero, Instagram, info de envío, barra de anuncio, defaults de SEO.
- `User` — email, `passwordHash` (argon2), nombre, rol. Sesión JWT en cookie.

---

## Rutas

**Storefront**

- `/` — hero con la marca sobre crema; al scrollear, el catálogo con filtros.
- `/catalogo` — misma grilla con filtros y paginado, URL propia para SEO.
- `/producto/[slug]` — galería, variantes, pirámide olfativa, chips de acordes, ficha técnica,
  barras de carácter, relacionados.
- `/marca/[slug]`
- `/que-es-un-tester`
- `/carrito`, `/checkout`, `/pedido/[number]/gracias`
- `/como-comprar`, `/contacto`
- `sitemap.xml`, `robots.txt`, OG images con `next/og`.

**Filtros** (estado en la URL con `nuqs`): búsqueda por texto, marca, género, acorde, nota,
concentración, estación, ocasión, tipo de presentación, rango de precio y orden.

**Admin** (`/admin/*`, protegido por `proxy.ts` + chequeo en el layout)

- `/admin` — pedidos recientes, productos publicados, accesos rápidos.
- `/admin/productos` — tabla con búsqueda y filtros; `nuevo` con el buscador de referencias +
  el fallback a Fragrantica; `[id]` edita ficha, notas, imágenes y variantes.
- `/admin/notas` — notas sin traducción al español, para completar en un click.
- `/admin/pedidos` y `/admin/pedidos/[id]` — estados y link al chat del cliente.
- `/admin/configuracion` — WhatsApp, plantilla del mensaje, marca, textos, redes, envío.
- `/admin/cuenta`.

---

## Fases de implementación

### ✅ Fase 0 — Repo (hecha)

`git init`, PLAN.md, estructura, `.gitignore`, `.env.example`, datasets y assets de marca en
[MValles02/parfam-mdq](https://github.com/MValles02/parfam-mdq).

### ✅ Fase 0.5 — Entorno de desarrollo (hecha)

Node **24.21** (LTS) + pnpm 12.4. Next.js **16.3.5** con React 19, Tailwind v4, `src/` y
alias `@/*`. shadcn/ui inicializado con el preset `radix-nova` (iconos Lucide). La paleta de
marca ya está en `globals.css` como tokens oklch — crema `#F2EEE9` sobre tinta negra, más el
modo oscuro derivado manteniendo el matiz cálido — y **Outfit** como familia tipográfica.
Prettier + ESLint + husky + lint-staged, `docker-compose.dev.yml` con Postgres 17 en el
puerto **5433**, `src/lib/site.ts` con los defaults de marca y `AGENTS.md` con las
convenciones del proyecto.

**Verificado:** `pnpm build` compila, `pnpm typecheck` y `pnpm lint` en limpio, y `pnpm dev`
sirve la home con la marca en :3000.

> 📌 **Node:** hay un binario de Node 24 en `~/.local/bin` que gana por PATH sobre el Node 22
> que se había instalado con nvm — el `.bashrc` de Debian corta la ejecución para shells no
> interactivas antes de llegar al bloque de nvm, así que nunca se activaba solo. En vez de
> pelear con eso, el proyecto quedó parado en ese Node 24 (LTS, funciona sin problemas); si
> hace falta otra versión, hay que apuntar directo a un binario, no depender de nvm.

> 📌 **Ojo con Next 16:** el scaffold genera un bloque en `AGENTS.md` avisando que hay
> breaking changes respecto de versiones anteriores. Antes de escribir código específico del
> framework, consultar `node_modules/next/dist/docs/`.

### Fase 0.75 — Diseño

Canvas de Claude Design con las pantallas clave — home (hero + catálogo), ficha de producto,
carrito, checkout y una del admin — sobre la paleta crema/negro y Outfit. Queda publicado como
Artifact editable, y de ahí salen los tokens y el layout que después se codean con shadcn.

**Verificación:** el canvas abre, se puede editar y refleja la identidad de las piezas de Canva.

### ✅ Fase 1 — Esquema, diccionarios e importador (hecha)

1. `prisma/schema.prisma` con las tres capas. **Prisma 7 cambió el modelo de conexión**: ya
   no admite `url` en el `datasource` del schema — la URL vive en `prisma.config.ts` (para
   Migrate/CLI) y en un driver adapter (`@prisma/adapter-pg`) que arma `src/lib/db.ts` para
   runtime. El generador también cambió de `prisma-client-js` (deprecado) a `prisma-client`,
   que emite TypeScript plano a `src/generated/prisma/` en vez de meterse en `node_modules`
   — queda fuera de git y se rearma con `prisma generate` (`postinstall` y antes de `build`).
2. `data/dictionaries/accords.es.json` (93 acordes, todos traducidos, con color propio en
   oklch) y `notes.es.json` (500 notas, cubren ~97% de las apariciones reales). Se sumó
   `note-aliases.json` para fusionar typos del dataset (`vanila`→`vanilla`,
   `sandalowood`→`sandalwood`, etc.) en una sola nota canónica.
3. `scripts/lib/fragrantica-parse.ts` (funciones puras: URL → marca/nombre/pid, normalización
   de género, parseo de pirámide por regex desde la descripción, parseo de listas al estilo
   `repr()` de Python) con su propio smoke test, y `scripts/lib/read-fragrantica-csv.ts` que
   lee y fusiona los dos CSV — **`fra_cleaned.csv` está en Windows-1252, no UTF-8** (se
   decodifica con `TextDecoder`, no con `Buffer.toString('latin1')`, que rompe comillas
   tipográficas y otros caracteres del rango 0x80-0x9F).
4. `scripts/import-fragrantica.ts`: `fra_perfumes.csv` es la base (unión completa de PIDs),
   `fra_cleaned.csv` enriquece/pisa por PID donde tiene mejor dato (pirámide estructurada,
   país, perfumistas, rating, año). Idempotente por lote (borra y recrea por `pid`, lo que
   cascadea a las tablas de unión) y transaccional; `--limit` y `--batch-size` para pruebas.
5. `prisma/seed.ts`: usuario admin desde `ADMIN_SEED_EMAIL`/`ADMIN_SEED_PASSWORD` (con
   `@node-rs/argon2`, sólo si no existe ya) + `SiteSetting` singleton con los valores reales
   de la marca, con `upsert(..., update: {})` para no pisar ediciones futuras del admin.

**Verificado** contra la base local: `--limit 200` y `--limit 10.000` primero, después la
corrida completa (69.946 fragancias, 3m13s) y re-ejecutada para confirmar idempotencia
(mismos conteos, sin duplicar). Resultado real, contra el estimado de la Fase 0.75:

| Métrica                 |     Estimado |                                                     Real |
| ----------------------- | -----------: | -------------------------------------------------------: |
| FragranceRef            |       69.948 | 69.946 (3 URLs mal formadas + ~154 duplicados en el CSV) |
| Con pirámide de notas   | 46.578 (67%) |                                           46.888 (67,0%) |
| Marcas                  |            — |                                                    1.748 |
| Perfumistas             |            — |                                                    1.355 |
| Notas distintas         |       ~1.884 |               1.882 (1.398 sin traducir, caen al inglés) |
| Acordes                 |           93 |           93 (siempre completo, no depende de `--limit`) |
| Relaciones sin resolver |            — |                                                        0 |

Se verificó a mano una fragancia conocida (Sauvage, Angel, Organza) en Prisma Studio: marca,
pirámide por nivel, acordes con su color y perfumista, todo correcto.

### ✅ Fase 2 — Auth y shell del admin (hecha)

Auth.js v5 (`next-auth@5.0.0-beta.32`, la rama que soporta Next 16) con provider de
credenciales, verificación argon2 contra la tabla `User` y sesión JWT en cookie de 30 días.

- **`middleware.ts` ya no existe en Next 16: se llama `proxy.ts`** y corre en runtime Node
  en vez de Edge. `src/proxy.ts` hace el chequeo optimista y guarda a dónde quería entrar
  el usuario (`?volverA=`) para devolverlo ahí después de loguearse.
- La autorización real la hace `src/app/admin/(panel)/layout.tsx` con `auth()`, del lado del
  servidor y pegada a los datos — el proxy es sólo UX, como recomienda la doc de Next.
- La config está partida en dos: `auth.config.ts` (sin DB, lo único que importa el proxy) y
  `auth.ts` (con Prisma + argon2), así el proxy no arrastra el binario de argon2 en cada
  request.
- Login en `/admin/login`, fuera del route group `(panel)` para que no quede atrapado por su
  propio layout protegido (si no, bucle de redirecciones).
- Rate limit de 5 intentos cada 10 minutos por IP + email (`src/lib/rate-limit.ts`, in-memory
  vía `lru-cache`), mensaje de error genérico que no revela si el email existe, y un `verify`
  contra un hash descartable cuando el usuario no existe para que los tiempos de respuesta
  sean iguales y no se puedan enumerar emails.
- Shell con sidebar negro (los tokens `--sidebar-*` de `globals.css` ahora siguen el diseño
  aprobado), navegación con estado activo, menú de usuario con logout, y dashboard con
  métricas reales de la base. Las páginas de Productos/Pedidos/Notas/Configuración quedan
  como placeholders que indican en qué fase se construyen.
- `AUTH_SECRET` pasó a ser obligatoria en `src/lib/env.ts`: sin ella Auth.js no puede firmar
  la cookie, y es mejor que falle al arrancar que en el primer login.

**Verificado** contra el servidor real: `/admin` sin sesión redirige con `volverA`; login
válido crea la cookie y el dashboard renderiza con datos reales; contraseña incorrecta y
usuario inexistente no crean sesión y tardan lo mismo (51,7 ms vs 50,8 ms); estando logueado
`/admin/login` redirige a `/admin`; las cuatro subpáginas responden 200; y después del
logout `/admin` vuelve a redirigir al login. El rate limit tiene su propio test.

> 📌 De paso hubo que reescribir `src/hooks/use-mobile.ts`, que viene de shadcn y hacía
> `setState` dentro de un `useEffect` — la regla `react-hooks/set-state-in-effect` de React 19
> lo marca como error. Ahora usa `useSyncExternalStore`, que es la API correcta para
> suscribirse a `matchMedia` y además evita el flash del primer render.

### ✅ Fase 3 — CRUD de productos (hecha)

#### El buscador sobre las 70k: dos cosas no cerraban con lo planeado

**1. El índice `pg_trgm` solo no alcanzaba.** La migración
`20260916124255_busqueda_difusa_referencias` crea `pg_trgm`, `unaccent` y un wrapper
`parfam_normalize()` (unaccent + lower) marcado `IMMUTABLE`, porque `unaccent()` viene
declarada `STABLE` y Postgres no indexa funciones que no sean inmutables. Con eso,
`lancome tresor` encuentra `Lancôme Trésor`.

Pero el buscador tiene que aceptar `"sauvage dior"`, que mezcla nombre de fragancia y marca,
y eso son dos columnas en dos tablas: el `OR` entre ellas obliga a un seq scan de las 70k
filas aunque cada una tenga su índice GIN. **Medido: 293 ms.** La solución fue desnormalizar
nombre + marca en una columna `FragranceRef.searchText` con un único índice GIN trgm encima:

| Consulta                   |  Antes |                         Después |
| -------------------------- | -----: | ------------------------------: |
| `sauvage dior` (selectiva) | 293 ms |                      **0,6 ms** |
| `noir` (poco selectiva)    |      — | 12 ms (cae al índice de rating) |

`scripts/import-fragrantica.ts` ahora llena `searchText`, y la migración hace el backfill de
las filas ya importadas.

**2. Ordenar por rating, como decía el plan, daba resultados malos.** La mediana del dataset
es de 25 votos, así que una edición limitada con 14 votos y 4,79 le ganaba al Angel de
Mugler. Se pasó a **dos señales combinadas**:

- **Popularidad**: promedio bayesiano (el truco del top 250 de IMDb), con 150 votos previos
  en la media del dataset (C = 3,977, medida sobre las 63.769 filas con rating).
- **Parecido**: `similarity()` de pg_trgm entre la consulta y el `searchText`. Esto es lo que
  faltaba: el Angel de 1992 es polarizante (3,57), y sin la señal de parecido nunca subía.

Se mezclan 75 % parecido / 25 % popularidad, en dos fases: primero se acotan los 60 candidatos
más populares con el índice, y recién ahí se calcula `similarity()` sobre esos 60, para que
una consulta poco selectiva no lo evalúe sobre miles de filas. Resultado — los cuatro casos
que antes fallaban ahora devuelven el buque insignia primero:

| Consulta          | Antes (rating puro)                    | Ahora                    |
| ----------------- | -------------------------------------- | ------------------------ |
| `angel mugler`    | Angel Winter Star (14 votos)           | **Angel** (1992)         |
| `lancome tresor`  | Tresor original (36 votos)             | **Tresor** (1990)        |
| `sauvage dior`    | Eau Sauvage Parfum 2017                | **Sauvage** (2015)       |
| `tobacco vanille` | Charuto Tobacco Vanille (Paris Corner) | **Tobacco Vanille** (TF) |

#### 🐛 Bug de la Fase 1 que salió acá: `Note.usageCount` estaba casi todo en cero

El importador tomaba `usageCount` del diccionario `notes.es.json`, que sólo cubre las ~500
notas traducidas. Resultado: las 484 notas con traducción tenían su conteo, y **las 1.398 sin
traducir estaban todas en 0** — justo las que `/admin/notas` tiene que ordenar por prioridad.
La pantalla habría listado 1.398 notas en orden arbitrario.

Arreglado en el importador: `usageCount` se recalcula al final, desde las filas reales de
`FragranceRefNote`, que es el único dato verdadero (y recién se conoce cuando terminó el
import). La base local ya quedó con los conteos reales — la nota sin traducir más usada es
`Acacia`, con 64 apariciones.

#### Lo demás

1. **R2** (`src/lib/r2.ts`): bucket **`parfam-mdq-imagenes`**, servido por
   **`img.parfammdq.com`**. Cliente S3 perezoso, presigned PUT de 5 minutos, lista blanca de
   tipos (`jpeg/png/webp/avif`) y tope de 8 MB validados **en el servidor**, y la clave del
   objeto la genera el servidor (`productos/<año>/<mes>/<uuid>.<ext>`) — nunca con el nombre
   de archivo del cliente. Si no hay credenciales, `r2Configurado()` da `false` y la UI
   muestra la zona de subida deshabilitada, sin romper nada.
2. **Buscador de referencias** con precarga de notas, acordes, perfumista, año y género al
   adoptar, y el fallback a `fragrantica.com/search/?query=…` + carga manual.
3. **Formulario** (`react-hook-form` + `standardSchemaResolver` + Zod). El schema
   `src/lib/validations/producto.ts` es **el mismo en cliente y servidor**: el cliente valida
   para dar feedback, el servidor porque es el único borde real.
4. **Editor de variantes inline** con tipo, ml, precio ARS (string de punta a punta, nunca
   float), activo y orden.
5. **Tabla de productos** con búsqueda y filtro por estado en la URL (`nuqs`), duplicar y
   publicar/despublicar desde la fila.
6. **`/admin/notas`** con búsqueda, filtro pendientes/traducidas, paginado de a 50 y guardado
   con Enter.

#### Decisiones que se apartaron del plan

- **Sin `@tanstack/react-table`.** El plan lo listaba para las tablas del admin, pero el
  diseño no pide ordenar, paginar ni esconder columnas del lado del cliente, y el filtrado es
  server-side sobre decenas de filas. Se usó el `table` de shadcn. Si más adelante hace falta
  ordenar por columna, se suma ahí.
- **Las notas van sin color.** El mockup mostraba un puntito de color por nota, pero el
  diccionario sólo le puso color a los 93 acordes: inventar un color por nota sería mostrar un
  dato que no existe. Los chips de acordes sí usan su color real.
- **Token `--success`** nuevo en `globals.css` (claro y oscuro) para el verde de "Publicado",
  que es el único color del panel fuera de la paleta crema/negro. Antes iba a quedar hardcodeado.
- **Se agregó un campo de slug** editable en el paso de SEO. El plan no lo mencionaba, pero
  sin él un renombre después de publicar cambiaría la URL en silencio.

#### Cloudflare R2: qué se configuró y por qué así

El provider que ya existía en Dokploy es un **Destination de backups**
(bucket `vps-dokploy-backups`). No se reusó, por dos razones: ese bucket es privado y las
fotos tienen que ser públicas, y sus credenciales alcanzan los backups de la VPS — si la
tienda las llevara en su `.env`, un problema en la tienda expondría los backups.

Quedó entonces un bucket aparte, **`parfam-mdq-imagenes`**, con un token acotado sólo a él
(verificado: `ListBuckets` devuelve `AccessDenied` y cualquier otro nombre de bucket da 403).

El dominio público es **`img.parfammdq.com`**. `parfammdq.com` está registrado en Hostinger,
y R2 pide que la **zona DNS** esté en Cloudflare, no que el dominio esté comprado ahí: se
movieron los nameservers a Cloudflare manteniendo la registración en Hostinger. Eso no obliga
a proxear el resto del sitio — en la Fase 7, `parfammdq.com` y `www` pueden ir como _DNS only_
a la IP de la VPS para que Traefik y Let's Encrypt trabajen sin intermediarios.

> ⚠️ **El paso que rompe todo en silencio es el CORS del bucket.** La foto sube por PUT
> directo desde el navegador a la URL firmada, sin pasar por el servidor. Sin una política
> CORS que permita `PUT` desde los orígenes de la app y el header `content-type`, la subida
> falla con un error críptico. El `content-type` es obligatorio porque la firma lo incluye.

#### La base guarda la clave, no la URL

`ProductImage.url` pasó a ser **`ProductImage.storageKey`** (migración
`imagenes_guardan_clave`): se guarda `productos/2026/09/<uuid>.png` y la URL se arma al
renderizar con `R2_PUBLIC_URL`. El host público es configuración, no dato.

Esto salió de una pregunta concreta: si arrancábamos con un `pub-xxxx.r2.dev` y después
pasábamos al dominio propio, había que reescribir todas las filas ya cargadas. Ahora es
cambiar una variable de entorno. **Verificado**: apuntando `R2_PUBLIC_URL` a otro host, las
URLs renderizadas cambiaron y la fila de la base quedó byte por byte igual.

De paso, `storageKey` llega del cliente en el formulario, así que se valida el prefijo
(`esClaveDeProducto`): sin eso, se podría apuntar a cualquier objeto del bucket o pedir el
borrado de uno ajeno.

#### 🐛 Menos de 3 caracteres se iba a seq scan

Un índice trigram no puede resolver un patrón de menos de 3 caracteres: no hay trigrama que
buscar. Medido: `"le"` tardaba **244 ms** contra 9 ms de `"noir"`, cayendo a un seq scan de
las 70k filas — y el admin pasa por ahí en cada búsqueda mientras tipea. Ahora
`buscarReferencias` descarta del **filtro** los términos de menos de 3 letras (no del orden:
el `similarity()` sigue usando la consulta entera, que es lo que hace que `"le male"` puntúe
como `"le male"`). El caso que importa sigue andando, porque `"le male"` filtra por `"male"`.

También se borró `FragranceRef_rating_idx`, que había creado en la migración anterior: servía
el `ORDER BY ratingValue DESC NULLS LAST` original, pero al pasar al promedio bayesiano el
orden es una expresión y el planner ya no puede usarlo. Confirmado con `EXPLAIN` — todas las
consultas resuelven por el índice trgm más un top-N heapsort sobre 60 candidatos.

#### Verificado con fotos reales

Subiendo 3 imágenes por la zona de drag & drop del panel, contra el bucket de verdad:

- Las 3 suben, quedan en `productos/2026/09/<uuid>.png` y se ven en la galería cargadas desde
  `img.parfammdq.com` (`naturalWidth` real, no miniaturas rotas).
- La primera queda como principal sola; marcar otra desmarca la anterior — siempre exactamente
  una.
- Reordenar con las flechas y recargar la página conserva el orden y la principal.
- La miniatura de la tabla de productos es la marcada como principal.
- Lectura pública OK, y el bucket **no** expone listado de directorio (404 en la raíz y en
  claves inexistentes).

#### Verificado contra el servidor andando

Con Playwright manejando un Chromium **dentro de un contenedor Docker** (el navegador del
host no arranca: falta `libnspr4` y no hay sudo). Los scripts quedaron en el scratchpad, no
en el repo — los de verdad llegan en la Fase 8.

- Adoptar `Sauvage Elixir` del buscador precarga nombre, año 2021, género y 16 chips entre
  notas, acordes y perfumista.
- Cargarle **frasco entero 100 ml, tester 100 ml y decants de 10 y 5 ml**, y publicarlo:
  queda con slug `dior-sauvage-elixir`, 10 notas con su nivel y orden, 5 acordes, 1
  perfumista, y los precios como `Decimal` (`289000.00`…). En la tabla aparece como
  "Publicado · 4 variantes · $ 15.400" (el "desde" mira sólo las variantes activas).
- **Flujo de fallback**: buscar algo que no existe muestra el link correcto a Fragrantica,
  y se carga a mano creando una marca nueva sobre la marcha.
- **Volver a guardar dos veces no duplica variantes ni notas.** Esto tenía trampa: las
  variantes recién creadas no tienen `id` en el formulario, así que un segundo guardado las
  habría duplicado. La página de edición remonta el formulario con `key={updatedAt}`.
- Publicar sin descripción ni variante activa se rechaza con los dos mensajes en español,
  y **la tabla aplica la misma regla** que el formulario (son dos caminos al mismo cambio).
- Duplicar deja la copia en borrador, con sus 4 variantes y sin SKU.
- Traducir una nota desde `/admin/notas` la saca de pendientes.
- **Seguridad**: las 15 Server Actions arrancan con `requireAdmin()`. Verificado que no
  alcanza con el proxy: posteando la misma acción a `/` en vez de `/admin/...` el proxy no
  interviene (sólo matchea `/admin/:path*`) y la llamada igual vuelve vacía, sin filtrar datos.
- Sin errores de runtime ni de hidratación en la consola del navegador. Había uno: el
  `list=` de los `<datalist>` usaba el `field.id` de `useFieldArray`, que es un UUID nuevo en
  cada render — el build pasaba igual y sólo se veía en el navegador.

> 📌 `pnpm build`, `pnpm typecheck` y `pnpm lint` en limpio (quedan 2 warnings a propósito de
> `no-img-element`, con su `TODO(Fase 7)`: las miniaturas usan `<img>` porque `next.config.ts`
> todavía no tiene los `remotePatterns` de R2 y `next/image` rompería).

> 📌 Para la Fase 7: `next.config.ts` necesita `remotePatterns` con **`img.parfammdq.com`**
> para poder pasar las miniaturas a `next/image`. Hoy van con `<img>` común justamente por eso
> (son los 2 warnings de `no-img-element`, cada uno con su `TODO(Fase 7)`).

### Fase 4 — Storefront

1. Tema con los valores reales: `--background: #F2EEE9`, `--foreground: #000000`, Outfit,
   modo oscuro derivado.
2. Home: hero con el logotipo y el tagline + catálogo con filtros (sidebar en desktop, drawer
   en mobile), grilla responsive, skeletons y paginado.
3. Ficha: galería con Embla, selector de variante con precio, pirámide agrupada por nivel,
   chips de acordes con el color del diccionario, ficha técnica, barras de carácter,
   agregar al carrito, relacionados.
4. `/que-es-un-tester` y páginas de contenido.
5. SEO: metadata por página, JSON-LD `Product` + `Offer`, sitemap dinámico, OG images.

**Verificación:** recorrido en mobile y desktop, filtros que sobreviven al refresh, Lighthouse
≥90 en Performance y SEO.

### Fase 5 — Carrito y checkout por WhatsApp

1. Carrito con Zustand + persist, drawer y badge en el header.
2. `/checkout`: nombre + teléfono (validado con `libphonenumber-js`), resumen, honeypot.
3. Server Action: valida con Zod, **recalcula precios desde la DB**, rechaza variantes
   inactivas, crea la `Order` en PENDING y devuelve el link `wa.me`.
4. Mensaje desde plantilla configurable (`{{numero}}`, `{{nombre}}`, `{{items}}`, `{{total}}`).
5. `/pedido/[number]/gracias`: limpia el carrito y ofrece reintento si el popup fue bloqueado.
6. Admin de pedidos: listado, detalle, estados, link al chat.

**Verificación:** checkout completo contra un número de prueba; el mensaje llega bien
formateado, el pedido aparece en `/admin/pedidos` y cambiar el precio después no lo altera.

### Fase 6 — Configuración del sitio

Formulario único sobre `SiteSetting`, cacheado con `unstable_cache` e invalidado al guardar.

**Verificación:** cambiar el número de WhatsApp desde el panel y ver que el siguiente checkout
usa el nuevo sin redeploy.

### Fase 7 — Deploy

1. `next.config.ts` con `output: 'standalone'` y `remotePatterns` del dominio de R2.
2. Dockerfile multi-stage (deps → builder → runner sobre `node:22-alpine`, usuario no-root,
   `HEALTHCHECK`) y `/api/health` que verifica la DB. Los CSV quedan fuera de la imagen.
3. Entrypoint con `prisma migrate deploy` antes de arrancar.
4. GitHub Actions: build + push a `ghcr.io/MValles02/parfam-mdq:{sha,latest}` con cache de
   capas y `curl` al webhook de Dokploy.
5. Dokploy: Postgres como servicio, app tipo **Docker** apuntando a GHCR, env vars, dominio
   `parfammdq.com` + `www` con Let's Encrypt, healthcheck, `FailureAction: rollback` y update
   order `start-first`.
6. DNS: A de `parfammdq.com` a la IP de la VPS, CNAME de `www`.
7. La importación corre una sola vez contra la DB de producción, desde la VPS.
8. Umami en `stats.parfammdq.com` + backups programados de Postgres hacia R2.

**Verificación:** push a `main` → Actions verde → imagen en GHCR → Dokploy redespliega solo →
`https://parfammdq.com` con SSL, `/api/health` en 200 y checkout funcionando. Probar un deploy
roto a propósito para confirmar el rollback.

### Fase 8 — Cierre

Carga de los ~40 productos reales, revisión de textos, smoke test de Playwright
(home → producto → carrito → checkout) en CI, y `docs/admin.md` para tu hermano.

---

## Variables de entorno

```
DATABASE_URL
AUTH_SECRET
NEXT_PUBLIC_SITE_URL
R2_ACCOUNT_ID / R2_ACCESS_KEY_ID / R2_SECRET_ACCESS_KEY / R2_BUCKET / R2_PUBLIC_URL
NEXT_PUBLIC_UMAMI_URL / NEXT_PUBLIC_UMAMI_WEBSITE_ID
ADMIN_SEED_EMAIL / ADMIN_SEED_PASSWORD
```

Validadas al arrancar con `@t3-oss/env-nextjs`.

---

## Pendientes tuyos

1. ✅ **Bucket de R2 — listo.** `parfam-mdq-imagenes` servido por `img.parfammdq.com`, con un
   token acotado a ese bucket. Las credenciales están en el `.env` local; falta cargarlas en
   Dokploy cuando se cree la app (Fase 7).
2. 🟢 Un número de WhatsApp de prueba para el checkout (si no, usamos el real).
3. 🟢 Fotos propias de los productos para la carga de la Fase 8.
4. 🟢 Cuando arranque la Fase 2 (auth), definir `ADMIN_SEED_EMAIL`/`ADMIN_SEED_PASSWORD`
   reales en el `.env` de cada entorno — el `.env` local tiene credenciales de prueba
   (`admin@parfammdq.com`) que no son para producción.
