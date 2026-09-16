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
| Imágenes                  | Cloudflare R2 (la cuenta ya está conectada al Dokploy; el bucket se crea en la Fase 3)       |
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

| Necesidad                       | Librería                                                                            |
| ------------------------------- | ----------------------------------------------------------------------------------- |
| Framework / routing / SSR / SEO | `next` 16 (App Router, Server Actions)                                              |
| UI base + accesibilidad         | `tailwindcss` v4, `shadcn/ui` (Radix), `tailwind-merge`, `class-variance-authority` |
| Íconos                          | `lucide-react`                                                                      |
| Tipografía                      | `next/font` con **Outfit** (Google Fonts)                                           |
| Tema claro/oscuro               | `next-themes`                                                                       |
| Formularios + validación        | `react-hook-form`, `zod`, `@hookform/resolvers`                                     |
| Estado de filtros en la URL     | `nuqs`                                                                              |
| Carrito persistente             | `zustand` + middleware `persist`                                                    |
| Tablas del admin                | `@tanstack/react-table` (shadcn data-table)                                         |
| Toasts                          | `sonner`                                                                            |
| Galería de producto             | `embla-carousel-react` (shadcn carousel)                                            |
| Autocompletado de notas         | `cmdk` (shadcn combobox)                                                            |
| ORM + migraciones               | `prisma` + `@prisma/client`                                                         |
| Auth                            | `next-auth@5` (Auth.js) + `@node-rs/argon2`                                         |
| Subida a R2                     | `@aws-sdk/client-s3`, `@aws-sdk/s3-request-presigner`, `react-dropzone`             |
| Import del dataset              | `csv-parse` (streaming)                                                             |
| Slugs                           | `slugify`                                                                           |
| Validación de env               | `@t3-oss/env-nextjs`                                                                |
| Teléfonos AR                    | `libphonenumber-js`                                                                 |
| i18n                            | `next-intl`                                                                         |
| Fechas                          | `date-fns` (locale `es`)                                                            |
| Rate limit del checkout         | `lru-cache`                                                                         |
| Calidad                         | `eslint`, `prettier`, `husky`, `lint-staged`                                        |
| Smoke tests                     | `@playwright/test`                                                                  |

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
  (internos, para ordenar el buscador), `descriptionEn` (interna), `hasPyramid`.
- `FragranceRefNote` — ref × nota × `position` (TOP/MIDDLE/BASE) × orden.
- `FragranceRefAccord` — ref × acorde × `rank`.
- `FragranceRefPerfumer` — ref × perfumista.

Índice `pg_trgm` sobre nombre + marca para que el buscador responda rápido sobre 70k filas.

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

**Admin** (`/admin/*`, protegido por middleware)

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

Node 22.23 + pnpm 12.4 vía nvm/corepack. Next.js **16.3.5** con React 19, Tailwind v4,
`src/` y alias `@/*`. shadcn/ui inicializado con el preset `radix-nova` (iconos Lucide).
La paleta de marca ya está en `globals.css` como tokens oklch — crema `#F2EEE9` sobre tinta
negra, más el modo oscuro derivado manteniendo el matiz cálido — y **Outfit** como familia
tipográfica. Prettier + ESLint + husky + lint-staged, `docker-compose.dev.yml` con Postgres 17
en el puerto **5433**, `src/lib/site.ts` con los defaults de marca y `AGENTS.md` con las
convenciones del proyecto.

**Verificado:** `pnpm build` compila, `pnpm typecheck` y `pnpm lint` en limpio, y `pnpm dev`
sirve la home con la marca en :3000.

> ⚠️ **Pendiente:** el usuario `mateo` no está en el grupo `docker`, así que `pnpm db:up`
> todavía no corre. Se resuelve con `sudo usermod -aG docker mateo` y reconectar por SSH.

> 📌 **Ojo con Next 16:** el scaffold genera un bloque en `AGENTS.md` avisando que hay
> breaking changes respecto de versiones anteriores. Antes de escribir código específico del
> framework, consultar `node_modules/next/dist/docs/`.

### Fase 0.75 — Diseño

Canvas de Claude Design con las pantallas clave — home (hero + catálogo), ficha de producto,
carrito, checkout y una del admin — sobre la paleta crema/negro y Outfit. Queda publicado como
Artifact editable, y de ahí salen los tokens y el layout que después se codean con shadcn.

**Verificación:** el canvas abre, se puede editar y refleja la identidad de las piezas de Canva.

### Fase 1 — Esquema, diccionarios e importador

1. `prisma/schema.prisma` con las tres capas y primera migración.
2. `data/dictionaries/accords.es.json` (~90 acordes con traducción y color) y
   `notes.es.json` (~500 notas frecuentes).
3. `scripts/import-fragrantica.ts`: streaming con `csv-parse`, en dos pasadas —
   `fra_perfumes` primero (marca y nombre normalizados desde la URL, acordes, rating,
   descripción, año y pirámide por regex) y después `fra_cleaned` por PID, que **pisa** la
   pirámide con la versión estructurada y suma país y perfumistas. Idempotente por `pid`,
   con `--limit` y barra de progreso.
4. Seed: usuario admin (por env) + `SiteSetting` con los valores reales de la marca.

**Verificación:** correr con `--limit 1000` y revisar en Prisma Studio que la pirámide de un
perfume conocido quede bien; contrastar los totales del import contra los del README
(69.948 refs, 46.578 con pirámide); después la carga completa midiendo tiempo.

### Fase 2 — Auth y shell del admin

Auth.js v5 con credenciales + argon2, `middleware.ts` protegiendo `/admin`, layout con
sidebar, login con rate limit.

**Verificación:** login con el usuario del seed; `/admin` redirige si no hay sesión.

### Fase 3 — CRUD de productos

1. Bucket R2 + presigned URLs + upload con `react-dropzone` (drag & drop, reorden, principal).
2. Buscador de referencias: busca sobre las 70k ordenando por rating, muestra la ficha y
   precarga notas, acordes, perfumista, año y género al adoptarla. Fallback a Fragrantica +
   carga manual cuando no hay resultados.
3. Formulario de producto (RHF + Zod): descripción en español, concentración, barras de
   carácter, estación/ocasión, SEO.
4. Editor de variantes inline: tipo (frasco/tester/decant), ml, precio ARS, activo, orden.
5. Tabla de productos con búsqueda, filtro por estado, duplicar y publicar/despublicar.
6. `/admin/notas` para completar traducciones faltantes.

**Verificación:** crear un producto real desde el buscador con frasco + tester + 2 decants,
subir 3 fotos, publicar; y crear otro a mano con el flujo de fallback.

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

1. 🔴 Habilitar Docker sin sudo para levantar la base local:
   `sudo usermod -aG docker mateo` y reconectar la sesión SSH.
2. 🟡 Bucket de R2 cuando lleguemos a la Fase 3 (la cuenta ya está conectada al Dokploy).
3. 🟢 Un número de WhatsApp de prueba para el checkout (si no, usamos el real).
4. 🟢 Fotos propias de los productos para la carga de la Fase 8.
