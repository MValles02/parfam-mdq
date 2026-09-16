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

| Tema | Decisión |
|---|---|
| Stack | Next.js 15 full-stack (App Router) + TypeScript + Tailwind + shadcn/ui + Prisma + PostgreSQL |
| Imágenes | Cloudflare R2 (S3-compatible), subida con presigned URLs |
| Pedidos | Se persisten con estados (pendiente/confirmado/entregado/cancelado) |
| Variantes | Frasco entero / tester / decant, precio por variante, **sin stock**: toggle activo-inactivo |
| Checkout | Formulario con nombre + teléfono → crea el pedido → abre WhatsApp |
| Auth admin | Auth.js v5 con credenciales, usuarios en Postgres |
| Datos de fragancias | **FragDB v5** (licencia comercial comprada) |
| Ratings de comunidad | No se muestran |
| Precios | ARS, cargados a mano por variante |
| Idioma | Español, con `next-intl` configurado para sumar idiomas después |
| Analítica | Umami self-hosted como app aparte en Dokploy |
| Deploy | GitHub Actions → GHCR → webhook de Dokploy |

---

## Hallazgos del análisis (2026-09-16)

### 1. La identidad visual ya está definida — y no es la que asumí

De `brand/*.png` salen valores concretos que reemplazan la propuesta original de
"paleta oscura con dorado":

| Elemento | Valor |
|---|---|
| Fondo | `#F2EEE9` (crema cálido) — 90-97% de cada pieza |
| Tinta | `#000000` puro |
| Logotipo | `ParfamMdq` en geométrica muy bold + `P E R F U M E R I A` en versalitas espaciadas |
| Tipografía | Geométrica sans ExtraBold, tipo Gilroy/Cocogoose. Equivalente libre: **Outfit** o **Poppins** (Google Fonts) |
| Tagline | **"No solo es un perfume"** |
| Instagram | **@parfam_mdq** |
| WhatsApp | **+54 9 223 616 3910** |

La estética es minimalista: crema, negro, tipografía pesada, mucho aire. El diseño del sitio
sigue eso — nada de dorados ni degradés. El color lo ponen las fotos de los frascos y los
chips de acordes (que traen su propio hex desde el dataset).

> Falta el logo vectorial. Los PNG son piezas de Canva a 1920×1080, no assets. Si podés
> exportar el logo en **SVG** (o PNG con fondo transparente), mejor; si no, lo recorto del
> `1.png`. También: los QR de las piezas, ¿apuntan al Instagram o al WhatsApp?

### 2. Venden testers, y eso cambia el modelo

La pieza `4.png` explica qué es un tester (producto nuevo, auténtico, envase simple sin tapa
decorativa, más barato). Dos consecuencias:

- `ProductVariant.kind` pasa a ser **`FULL_BOTTLE` | `TESTER` | `DECANT`**.
- Se agrega la página **`/que-es-un-tester`** usando ese texto, que ya está escrito por
  ellos. Es contenido propio, se reutiliza tal cual, y sirve para SEO y para bajar la
  fricción de la venta.

### 3. ⚠️ Falta la base completa de FragDB

Lo que está en `data/fragdb/` es el **sample gratis**: 10 filas por CSV y los parquet de
muestra (25/20/20 filas). El `data_dictionary.md` documenta la base real:

| Archivo | Filas reales | Filas subidas |
|---|---:|---:|
| `fragrances.csv` | 137.147 | 10 |
| `brands.csv` | 8.210 | 10 |
| `perfumers.csv` | 3.102 | 10 |
| `notes.csv` | 2.588 | 10 |
| `accords.csv` | 92 | 10 |
| `translations.csv` | 34 | 34 ✅ |

**Hace falta subir los CSV completos del .zip que compraste.** Y hay un detalle importante:
extrapolando el tamaño del sample, `fragrances.csv` completo pesa ~900 MB, muy por encima
del límite de 100 MB por archivo de GitHub. **No pueden ir por la web de GitHub ni
commitearse**; van por `scp` a la carpeta, que ya está en `.gitignore`:

```bash
scp fragdb-v5.zip mateo@<IP-VPS>:/home/mateo/projects/parfam-mdq/data/fragdb/
```

Los 10-filas que ya subiste **se quedan** como fixtures: los muevo a
`data/fragdb/samples/` y los uso para testear el importador sin cargar los 900 MB.

### 4. El formato de FragDB, ya decodificado

Delimitador **`|`**. Los campos compuestos se parsean así:

| Campo | Formato | Ejemplo |
|---|---|---|
| `brand` | `nombre;brand_id` | `Dior;b3` |
| `accords` | `accord_id:percent;…` desc | `a34:100;a4:71;a24:69` |
| `notes_pyramid` | `top(id,opacity,weight;…)middle(…)base(…)` o `notes(…)` | `top(n1963,1.0,4.42)middle(n213,0.96,3.67)base(n563,1.0,5.0)` |
| `perfumers` | `nombre;id;nombre;id` | `François Demachy;p187` |
| `gender` | translation id | `gender_for_men` → `translations.csv` → "para hombres" |
| `season` / `time_of_day` | `tid:votos:porcentaje;…` | `season_summer:13900:93.1` |
| `by_designer`, `also_like` | PIDs separados por `;` | `228;23280;101016` |

Lo bueno de esto para el proyecto:

- **El español ya viene incluido**: `notes.note_name_es`, `notes.note_group_es`,
  `accords.name_es`, `brands.country_es` y `translations.es`. No hay que traducir nada a mano.
- **Los acordes traen su color**: `bar_color` y `font_color` en hex. Los chips de acordes de
  la ficha salen con los mismos colores que hacen reconocible el look de Fragrantica, sin
  copiar ningún asset.
- **Las notas traen `group`** (Citrus, Flowers, Woods and mosses…) con traducción al español:
  sirve para agrupar y colorear la pirámide.
- `season` y `time_of_day` vienen con porcentajes: los uso para **presetear** las etiquetas
  de estación/ocasión del producto (ej. ≥70% → se marca la etiqueta), que el admin después
  confirma o corrige. No se muestran votos ni porcentajes en ningún lado, según lo acordado.

Dos cosas que **no** se usan:

- `main_photo`, `info_card`, `user_photoes` y `notes.main_icon` apuntan al CDN de Fragrantica
  (`fimgs.net`). No se hotlinkean ni se muestran en público: quedan sólo como referencia
  interna en el panel, para que tu hermano compare mientras carga. Las imágenes públicas son
  siempre fotos propias subidas a R2.
- `description` es HTML en inglés autogenerado por Fragrantica. Se guarda como referencia
  interna; el texto que ve el cliente lo escribimos nosotros en español.

**Bug conocido del dataset:** las traducciones de algunos acordes están mal (`powdery` figura
como "florales" en español y "blumig" en alemán). Son sólo 92 acordes: los reviso a mano y
dejo un archivo de overrides en el repo.

---

## Librerías (nada hecho a mano que ya exista)

| Necesidad | Librería |
|---|---|
| Framework / routing / SSR / SEO | `next` 15 (App Router, Server Actions) |
| UI base + accesibilidad | `tailwindcss` v4, `shadcn/ui` (Radix), `tailwind-merge`, `class-variance-authority` |
| Íconos | `lucide-react` |
| Tipografía | `next/font` con **Outfit** (Google Fonts) |
| Tema claro/oscuro | `next-themes` |
| Formularios + validación | `react-hook-form`, `zod`, `@hookform/resolvers` |
| Estado de filtros en la URL | `nuqs` |
| Carrito persistente | `zustand` + middleware `persist` |
| Tablas del admin | `@tanstack/react-table` (shadcn data-table) |
| Toasts | `sonner` |
| Galería de producto | `embla-carousel-react` (shadcn carousel) |
| ORM + migraciones | `prisma` + `@prisma/client` |
| Auth | `next-auth@5` (Auth.js) + `@node-rs/argon2` |
| Subida a R2 | `@aws-sdk/client-s3`, `@aws-sdk/s3-request-presigner`, `react-dropzone` |
| Import del dataset | `csv-parse` (streaming, los CSV son de ~900 MB) |
| Slugs | `slugify` |
| Validación de env | `@t3-oss/env-nextjs` |
| Teléfonos AR | `libphonenumber-js` |
| i18n | `next-intl` |
| Fechas | `date-fns` (locale `es`) |
| Rate limit del checkout | `lru-cache` |
| Calidad | `eslint`, `prettier`, `husky`, `lint-staged` |
| Smoke tests | `@playwright/test` |

---

## Modelo de datos (Prisma)

Dos capas separadas, y ésta es la decisión estructural clave: **el catálogo de referencia de
FragDB no es el catálogo de la tienda**. Se importan las 137k fragancias como referencia
consultable, y el admin "adopta" las que vende.

### Capa 1 — Referencia FragDB (read-only, sembrada por el importador)

- `Brand` — `fragdbId` (`b3`), nombre, slug, país (es), casa madre, `sourceLogoUrl` (interno).
- `Perfumer` — `fragdbId` (`p187`), nombre, slug.
- `Note` — `fragdbId` (`n1963`), `name`, `nameEs`, `group`, `groupEs`, `odorProfile`, `sourceIconUrl` (interno).
- `Accord` — `fragdbId` (`a34`), `name`, `nameEs`, `barColor`, `fontColor`.
- `FragranceRef` — `pid`, `brandId`, nombre, año, `gender`, colección, `sourceUrl`,
  `sourcePhotoUrl` (interno), `sourceDescriptionHtml` (interno),
  `seasonScores`/`timeOfDayScores` (JSON, para presetear etiquetas).
- `FragranceRefNote` — ref × nota × `position` (TOP/MIDDLE/BASE/UNKNOWN) × `weight` × orden.
- `FragranceRefAccord` — ref × acorde × `percent`.
- `FragranceRefPerfumer` — ref × perfumista.

Índice `pg_trgm` sobre nombre + marca para que el buscador del admin responda rápido sobre
137k filas.

### Capa 2 — Tienda (lo que edita el admin)

- `Product` — slug, nombre, `brandId`, `fragranceRefId?`, descripción propia en español,
  género, concentración, año, `seasons[]`, `occasions[]`, `longevity`/`sillage`/`intensity`
  (1-5, fijados por el admin), `status` (DRAFT/PUBLISHED), `isFeatured`, `sortOrder`,
  `seoTitle`, `seoDescription`.
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
- `SiteSetting` — fila singleton: número de WhatsApp, plantilla del mensaje, nombre y tagline,
  logo, hero, Instagram, info de envío, barra de anuncio, defaults de SEO.
- `User` — email, `passwordHash` (argon2), nombre, rol. Sesión JWT en cookie.

---

## Rutas

**Storefront**
- `/` — hero con la marca sobre crema; al scrollear, el catálogo con filtros.
- `/catalogo` — misma grilla con filtros y paginado, URL propia para SEO.
- `/producto/[slug]` — galería, variantes (frasco / tester / decant), pirámide olfativa,
  chips de acordes con su color, ficha técnica, barras de carácter, relacionados.
- `/marca/[slug]`
- `/que-es-un-tester` — el texto de la pieza de Canva.
- `/carrito`, `/checkout`, `/pedido/[number]/gracias`
- `/como-comprar`, `/contacto`
- `sitemap.xml`, `robots.txt`, OG images con `next/og`.

**Filtros** (estado en la URL con `nuqs`, consulta en Prisma con paginado): búsqueda por
texto, marca, género, acorde, nota, concentración, estación, ocasión, tipo de presentación,
rango de precio y orden.

**Admin** (`/admin/*`, protegido por middleware)
- `/admin` — pedidos recientes, productos publicados, accesos rápidos.
- `/admin/productos` — tabla con búsqueda y filtros; `nuevo` arranca con el buscador de
  FragDB (o "crear en blanco"); `[id]` edita ficha, notas, imágenes y variantes.
- `/admin/pedidos` y `/admin/pedidos/[id]` — estado y link al chat del cliente.
- `/admin/configuracion` — WhatsApp, plantilla del mensaje, marca, textos, redes, envío.
- `/admin/cuenta`.

---

## Fases de implementación

### ✅ Fase 0 — Repo (hecha)
`git init`, PLAN.md, estructura, `.gitignore`, `.env.example` y repo privado
[MValles02/parfam-mdq](https://github.com/MValles02/parfam-mdq).

### Fase 0.5 — Entorno de desarrollo
1. Node 22 LTS con `nvm` (no hay `node` en la VPS) + `pnpm` vía corepack.
2. `pnpm create next-app` (TS, Tailwind, App Router, ESLint) + `shadcn init`.
3. `docker-compose.dev.yml` con Postgres 17 para desarrollo local.
4. ESLint + Prettier + husky + lint-staged; scripts `dev`, `build`, `lint`, `typecheck`, `db:*`.
5. Mover los CSV de muestra a `data/fragdb/samples/` como fixtures.

**Verificación:** `pnpm dev` levanta en :3000, `pnpm typecheck` y `pnpm lint` en limpio.

### Fase 1 — Esquema e importador de FragDB
1. `prisma/schema.prisma` con las tres capas y primera migración.
2. `scripts/import-fragdb.ts`: parser streaming (`csv-parse`) para los formatos decodificados
   arriba, idempotente por `fragdbId`/`pid`, con `--limit`, `--only=notes,accords,...` y
   barra de progreso. Orden: accords → notes → brands → perfumers → translations → fragrances.
3. `data/accord-overrides.es.json` con las traducciones de acordes corregidas a mano.
4. Seed: usuario admin (por env) + `SiteSetting` con los valores reales de la marca
   (WhatsApp +54 9 223 616 3910, IG @parfam_mdq, tagline "No solo es un perfume").

**Verificación:** correr contra `samples/` primero (10 filas, segundos), revisar en Prisma
Studio que la pirámide de Sauvage quede con top/middle/base bien enlazados y los acordes con
su color; después la carga completa midiendo tiempo y tamaño de la DB.

### Fase 2 — Auth y shell del admin
Auth.js v5 con credenciales + argon2, `middleware.ts` protegiendo `/admin`, layout con
sidebar, login con rate limit.

**Verificación:** login con el usuario del seed; `/admin` redirige si no hay sesión.

### Fase 3 — CRUD de productos
1. Bucket R2 + presigned URLs + upload con `react-dropzone` (drag & drop, reorden, principal).
2. Buscador de FragDB en "nuevo producto": busca por nombre/marca sobre las 137k referencias,
   muestra la ficha (con la foto de referencia de Fragrantica visible **sólo en el panel**) y
   precarga notas, acordes, perfumista, año, género y etiquetas de estación al adoptarla.
3. Formulario de producto (RHF + Zod) con la descripción en español, barras de carácter y SEO.
4. Editor de variantes inline: tipo (frasco/tester/decant), ml, precio ARS, activo, orden.
5. Tabla de productos con búsqueda, filtro por estado, duplicar y publicar/despublicar.

**Verificación:** crear un producto real desde FragDB con frasco + tester + 2 decants, subir
3 fotos, publicar y revisar el registro completo.

### Fase 4 — Storefront
1. Tema con los valores reales: `--background: #F2EEE9`, `--foreground: #000000`, Outfit como
   familia tipográfica, modo oscuro derivado (invirtiendo crema/negro).
2. Home: hero con el logotipo y el tagline sobre crema + catálogo debajo con filtros (sidebar
   en desktop, drawer en mobile), grilla responsive, skeletons y paginado.
3. Ficha de producto: galería con Embla, selector de variante con precio, pirámide olfativa
   agrupada por nivel, chips de acordes con `barColor`/`fontColor` del dataset, ficha técnica,
   barras de carácter, agregar al carrito, relacionados.
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
   `HEALTHCHECK`) y `/api/health` que verifica la DB.
3. Entrypoint con `prisma migrate deploy` antes de arrancar.
4. GitHub Actions: build + push a `ghcr.io/MValles02/parfam-mdq:{sha,latest}` con cache de
   capas y `curl` al webhook de Dokploy.
5. Dokploy: Postgres como servicio, app tipo **Docker** apuntando a GHCR, env vars, dominio
   `parfammdq.com` + `www` con Let's Encrypt, healthcheck, `FailureAction: rollback` y update
   order `start-first`.
6. DNS: A de `parfammdq.com` a la IP de la VPS, CNAME de `www`.
7. **La importación de FragDB corre una sola vez contra la DB de producción desde la VPS**
   (los 900 MB de CSV nunca entran a la imagen Docker).
8. Umami en `stats.parfammdq.com` + backups programados de Postgres hacia R2.

**Verificación:** push a `main` → Actions verde → imagen en GHCR → Dokploy redespliega solo →
`https://parfammdq.com` con SSL, `/api/health` en 200 y checkout funcionando. Probar un deploy
roto a propósito para confirmar el rollback.

### Fase 8 — Cierre
Carga de los ~40 productos reales, revisión de textos, smoke test de Playwright
(home → producto → carrito → checkout) en CI, y `docs/admin.md`: instructivo corto para tu
hermano.

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

1. 🔴 **Los CSV completos de FragDB** por `scp` (no por la web de GitHub: superan los 100 MB).
   Sin esto, la Fase 1 corre sólo contra los samples de 10 filas.
2. 🟡 El **logo en SVG** (o PNG con fondo transparente). Si no lo tenés, lo recorto del `1.png`.
3. 🟡 Credenciales de **Cloudflare R2** (o creamos la cuenta juntos en la Fase 3).
4. 🟡 ¿Los **QR** de las piezas apuntan al Instagram o al WhatsApp?
5. 🟢 Un número de WhatsApp de prueba para el checkout (si no, usamos el real).
