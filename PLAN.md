# Parfam MDQ — Storefront + Panel de administración

## Contexto

El emprendimiento de perfumería de tu hermano (Mar del Plata) vende perfumes originales en frasco entero y en decants, y hoy no tiene web: todo pasa por WhatsApp. El objetivo es una tienda propia en `parfammdq.com` con:

- Una home con encabezado de marca y, al scrollear, el catálogo con filtros.
- Una ficha por producto con datos detallados de la fragancia (estilo Fragrantica): pirámide de notas, acordes, ficha técnica.
- Carrito y checkout que termina en un mensaje de WhatsApp prearmado (no hay pasarela de pago).
- Un panel de administración para el CRUD de productos y la configuración del sitio (empezando por el número de WhatsApp del checkout).

La carpeta `/home/mateo/projects/parfam-mdq` está vacía: todo se construye desde cero. El deploy es en Dokploy sobre esta misma VPS (7.6 GB RAM, 61 GB libres, Docker 29.8 + Compose v5.5), siguiendo la recomendación de la [doc de producción de Dokploy](https://docs.dokploy.com/docs/core/applications/going-production): **buildear en CI y desplegar la imagen**, no compilar en el servidor.

### Decisiones ya tomadas

| Tema | Decisión |
|---|---|
| Stack | Next.js 15 full-stack (App Router) + TypeScript + Tailwind + shadcn/ui + Prisma + PostgreSQL |
| Imágenes | Cloudflare R2 (S3-compatible), subida con presigned URLs |
| Pedidos | Se persisten en la DB con estados (pendiente/confirmado/entregado/cancelado) |
| Variantes | Frasco entero y decants, precio por variante, **sin stock**: toggle activo/inactivo |
| Checkout | Formulario con nombre + teléfono → crea el pedido → abre WhatsApp |
| Auth admin | Auth.js v5 con credenciales, usuarios en Postgres |
| Datos de fragancias | **FragDB** (licencia comercial ya comprada, .zip pendiente de subir al repo) |
| Ratings de comunidad | No se muestran; sólo datos objetivos |
| Precios | ARS, cargados a mano por variante |
| Idioma | Español, con `next-intl` ya configurado para sumar idiomas después |
| Analítica | Umami self-hosted como app aparte en Dokploy |
| Deploy | GitHub Actions → GHCR → webhook de Dokploy |

### Restricción legal importante

FragDB deriva su contenido de Fragrantica. La licencia comercial cubre **los datos** (notas, acordes, año, perfumista, familia). **No usar las URLs de fotos del dataset en la web pública**: apuntan a CDN de terceros (hotlinking + riesgo de derechos). Se guardan sólo como referencia interna en el admin; las imágenes públicas son siempre fotos propias subidas a R2. Las descripciones de venta las escribe tu hermano (o las generamos nosotros), no se copian del dataset.

---

## Librerías (nada hecho a mano que ya exista)

| Necesidad | Librería |
|---|---|
| Framework / routing / SSR / SEO | `next` 15 (App Router, Server Actions) |
| UI base + accesibilidad | `tailwindcss` v4, `shadcn/ui` (Radix), `tailwind-merge`, `class-variance-authority` |
| Íconos | `lucide-react` |
| Tema claro/oscuro | `next-themes` |
| Formularios + validación | `react-hook-form`, `zod`, `@hookform/resolvers` |
| Estado de filtros en la URL | `nuqs` |
| Carrito persistente | `zustand` + middleware `persist` (localStorage) |
| Tablas del admin | `@tanstack/react-table` (vía shadcn data-table) |
| Toasts | `sonner` |
| Galería de producto | `embla-carousel-react` (shadcn carousel) |
| ORM + migraciones | `prisma` + `@prisma/client` |
| Auth | `next-auth@5` (Auth.js) + `@node-rs/argon2` |
| Subida a R2 | `@aws-sdk/client-s3`, `@aws-sdk/s3-request-presigner`, `react-dropzone` |
| Import del dataset | `csv-parse` (CSV) o `@duckdb/node-api` (parquet) — se decide al ver el .zip |
| Slugs | `slugify` |
| Validación de env | `@t3-oss/env-nextjs` |
| Teléfonos AR | `libphonenumber-js` |
| i18n | `next-intl` |
| Fechas | `date-fns` (locale `es`) |
| Rate limit del checkout | `lru-cache` (in-memory, suficiente para 1 réplica) |
| Calidad | `eslint`, `prettier`, `husky`, `lint-staged` |
| Smoke tests | `@playwright/test` |

---

## Modelo de datos (Prisma)

Dos capas separadas, y ésta es la decisión estructural clave: **el catálogo de referencia de FragDB no es el catálogo de la tienda**. Se importan ~139k fragancias como referencia consultable, y el admin "adopta" las que vende.

### Capa 1 — Referencia (read-only, sembrada por el importador)

- `Brand` — slug, nombre, país, casa madre.
- `Perfumer` — slug, nombre.
- `Note` — slug, nombre es/en, grupo, color, `iconUrl` (sólo referencia interna).
- `Accord` — slug, nombre es/en, color.
- `FragranceRef` — `fragdbId`, marca, nombre, año, género, concentración, `sourceUrl`, `sourcePhotoUrl` (interno).
- `FragranceRefNote` — ref × nota × `position` (TOP/MIDDLE/BASE) × orden.
- `FragranceRefAccord` — ref × acorde × intensidad.
- `FragranceRefPerfumer` — ref × perfumista.

Índice `pg_trgm` sobre `FragranceRef.name` + marca para que el buscador del admin responda rápido sobre 139k filas.

### Capa 2 — Tienda (lo que edita el admin)

- `Product` — slug, nombre, `brandId`, `fragranceRefId?`, descripción propia (rich text corto), género, concentración, año, familia/acordes, `seasons[]`, `occasions[]`, `longevity`/`sillage`/`intensity` (1–5, fijados por el admin), `status` (DRAFT/PUBLISHED), `isFeatured`, `sortOrder`, `seoTitle`, `seoDescription`.
- `ProductNote` / `ProductAccord` / `ProductPerfumer` — **copiados** de la referencia al crear el producto y editables después (así una corrección del admin no se pisa en una reimportación).
- `ProductImage` — `url` (R2), `alt`, orden, `isPrimary`.
- `ProductVariant` — `kind` (FULL_BOTTLE/DECANT), `sizeMl`, `priceArs` (Decimal), `isActive`, orden, `sku?`.

### Capa 3 — Pedidos, configuración y usuarios

- `Order` — `number` (correlativo legible, ej. `PM-0042`), `customerName`, `customerPhone`, `status`, `totalArs`, `adminNotes`, `createdAt`.
- `OrderItem` — **snapshot** de `productName`, `variantLabel`, `unitPriceArs`, `qty` (para que un cambio de precio no altere el histórico) + FKs opcionales a producto/variante.
- `SiteSetting` — fila singleton: número de WhatsApp, plantilla del mensaje, nombre/lema de marca, logo, hero, links de redes, info de envío, barra de anuncio, defaults de SEO.
- `User` — email, `passwordHash` (argon2), nombre, rol. Sesión JWT en cookie (sin tablas de sesión).

---

## Rutas

**Storefront**
- `/` — hero a pantalla completa con la marca; al scrollear, el catálogo con filtros (el catálogo es un Server Component y los filtros viven en la URL).
- `/catalogo` — misma grilla con filtros y paginado, URL propia para SEO y para compartir búsquedas.
- `/producto/[slug]` — galería, variantes, pirámide olfativa, ficha técnica, barras de carácter, relacionados.
- `/marca/[slug]` — listado por marca.
- `/carrito`, `/checkout`, `/pedido/[number]/gracias`
- `/como-comprar`, `/contacto`
- `sitemap.xml`, `robots.txt`, OG images dinámicas con `next/og`.

**Filtros del catálogo** (estado en la URL con `nuqs`, consulta en Prisma con paginado): búsqueda por texto, marca, género, familia/acorde, nota, concentración, estación, ocasión, tipo (decant / frasco entero), rango de precio y orden (novedades, precio ↑/↓, A-Z).

**Admin** (`/admin/*`, protegido por middleware)
- `/admin` — dashboard: pedidos recientes, productos publicados, accesos rápidos.
- `/admin/productos` — tabla con búsqueda y filtros; `nuevo` arranca con el buscador de FragDB (o "crear en blanco"); `[id]` edita ficha, notas, imágenes y variantes.
- `/admin/pedidos` y `/admin/pedidos/[id]` — cambio de estado, link directo al chat de WhatsApp del cliente.
- `/admin/configuracion` — WhatsApp y plantilla del mensaje, marca, textos, redes, envío.
- `/admin/cuenta` — cambiar contraseña.

---

## Fases de implementación

### Fase 0 — Repo mínimo (ÚNICO paso a ejecutar ahora)

Esta fase se ejecuta sola y **el trabajo se detiene al terminarla**, para que puedas subir el .zip de FragDB y las imágenes del Canva antes de escribir código de aplicación.

1. `git init` en `/home/mateo/projects/parfam-mdq`, rama `main`.
2. Copiar este plan a `PLAN.md` en la raíz del repo.
3. Crear la estructura de carpetas para tus archivos, con `README.md` en cada una explicando qué va adentro:
   - `data/fragdb/` → el .zip de FragDB (ignorado por git salvo el README; es pesado y con licencia comercial).
   - `brand/` → logo, hero y referencias de color exportadas del Canva.
4. `.gitignore` (Node + Next + `.env*` + `data/fragdb/*`) y `.env.example` inicial.
5. Repo **privado** en GitHub y primer push. `gh` no está instalado en la VPS: lo instalo, o si preferís creás el repo por la web y yo configuro el remote.

**Verificación:** `git log` muestra el commit inicial, el repo se ve en GitHub y las carpetas `data/fragdb/` y `brand/` existen con sus READMEs.

> ⏸️ **Pausa acá.** Subís el .zip y las imágenes, y recién entonces seguimos con la Fase 0.5.

### Fase 0.5 — Entorno de desarrollo
1. Instalar Node 22 LTS con `nvm` (hoy no hay `node` ni `npm` en la VPS) y habilitar `pnpm` vía corepack.
2. `pnpm create next-app` (TS, Tailwind, App Router, ESLint) + `shadcn init`.
3. `docker-compose.dev.yml` con Postgres 17 para desarrollo local.
4. ESLint + Prettier + husky + lint-staged; scripts `dev`, `build`, `lint`, `typecheck`, `db:*`.

**Verificación:** `pnpm dev` levanta en :3000, `pnpm typecheck` y `pnpm lint` pasan en limpio.

### Fase 1 — Dataset y esquema
1. Analizar el .zip de FragDB (formato, columnas reales, idiomas, cómo viene la pirámide de notas) y documentar el mapeo en `docs/fragdb.md`.
2. Escribir `prisma/schema.prisma` completo (las tres capas de arriba) y correr la primera migración.
3. Script `scripts/import-fragdb.ts` idempotente (upsert por `fragdbId`), con logs de progreso, `--limit` para probar y filtro opcional por marcas.
4. Seed: usuario admin inicial (email/password por env) + `SiteSetting` con valores por defecto.

**Verificación:** importar con `--limit 500`, revisar en Prisma Studio que notas/acordes/marcas queden bien enlazados, y recién después la importación completa midiendo tiempo y tamaño de la DB.

### Fase 2 — Auth y shell del admin
1. Auth.js v5 con provider de credenciales, argon2, sesión JWT, `middleware.ts` protegiendo `/admin`.
2. Layout del admin con sidebar (shadcn), navegación y logout.
3. Página de login con rate limit y mensajes de error genéricos.

**Verificación:** login con el usuario del seed, `/admin` redirige a login si no hay sesión, logout limpia la cookie.

### Fase 3 — CRUD de productos
1. Bucket R2 + helper de presigned URLs + componente de upload con `react-dropzone` (drag & drop, reorden, marcar principal, borrar).
2. Buscador de FragDB en "nuevo producto": busca por nombre/marca, muestra la ficha y precarga todo al adoptarla.
3. Formulario de producto (RHF + Zod): datos base, descripción, notas por posición, acordes, barras de carácter, estación/ocasión, SEO.
4. Editor de variantes inline: tipo, ml, precio ARS, activo/inactivo, orden.
5. Tabla de productos con búsqueda, filtro por estado, duplicar y publicar/despublicar.

**Verificación:** crear un producto real desde FragDB con 2 decants + frasco, subir 3 fotos, publicar y ver el registro completo en la DB.

### Fase 4 — Storefront
1. Sistema de diseño a partir de las imágenes del Canva: tokens de color en `:root`, tipografía (serif para títulos, sans para el resto), modo claro/oscuro.
2. Home: hero con marca + catálogo debajo con filtros (sidebar en desktop, drawer en mobile), grilla responsive, skeletons y paginado.
3. Ficha de producto: galería con Embla, selector de variante con precio, pirámide olfativa, acordes con color, ficha técnica, barras de carácter, botón de agregar al carrito, relacionados por marca/acorde.
4. SEO: metadata por página, JSON-LD `Product` + `Offer`, sitemap dinámico, OG images.

**Verificación:** recorrer el sitio en mobile y desktop, verificar que los filtros sobrevivan al refresh (están en la URL) y correr Lighthouse (objetivo ≥90 en Performance y SEO).

### Fase 5 — Carrito y checkout por WhatsApp
1. Store de carrito con Zustand + persist; drawer de carrito con cantidades y subtotal; badge en el header.
2. `/checkout`: nombre + teléfono (validado con `libphonenumber-js`), resumen del pedido, honeypot anti-bot.
3. Server Action: valida con Zod, **recalcula los precios desde la DB** (nunca confía en el cliente), rechaza variantes inactivas, crea la `Order` en PENDING y devuelve el link `wa.me`.
4. Mensaje de WhatsApp desde plantilla configurable con placeholders (`{{numero}}`, `{{nombre}}`, `{{items}}`, `{{total}}`).
5. `/pedido/[number]/gracias`: limpia el carrito, muestra el número de pedido y un botón de reintento por si el popup fue bloqueado.
6. Admin de pedidos: listado, detalle, cambio de estado, link al chat del cliente.

**Verificación:** checkout completo contra un número de prueba; confirmar que el mensaje llega bien formateado, que el pedido aparece en `/admin/pedidos` y que cambiar el precio después no altera el pedido guardado.

### Fase 6 — Configuración del sitio
Formulario único que escribe en `SiteSetting`: número de WhatsApp, plantilla del mensaje, nombre y lema, logo y hero, redes, info de envío/retiro, barra de anuncio y defaults de SEO. Cacheado con `unstable_cache` e invalidado al guardar.

**Verificación:** cambiar el número de WhatsApp desde el panel y comprobar que el siguiente checkout usa el nuevo sin redeploy.

### Fase 7 — Deploy
1. `next.config.ts` con `output: 'standalone'` y `remotePatterns` del dominio de R2.
2. Dockerfile multi-stage (deps → builder → runner sobre `node:22-alpine`, usuario no-root, `HEALTHCHECK`) y endpoint `/api/health` que verifica la DB.
3. Entrypoint que corre `prisma migrate deploy` antes de arrancar.
4. GitHub Actions: build + push a `ghcr.io/<usuario>/parfam-mdq:{sha,latest}` con cache de capas, y `curl` al webhook de Dokploy.
5. En Dokploy: Postgres como servicio, la app como tipo **Docker** apuntando a la imagen de GHCR, variables de entorno, dominio `parfammdq.com` + `www` con Let's Encrypt, healthcheck, `FailureAction: rollback` y update order `start-first` para cero downtime.
6. DNS: A de `parfammdq.com` a la IP de la VPS, CNAME de `www`.
7. Umami como app aparte en Dokploy en `stats.parfammdq.com`, script en el layout.
8. Backups programados de Postgres desde Dokploy hacia R2.

**Verificación:** push a `main` → Actions verde → la imagen aparece en GHCR → Dokploy redespliega solo → `https://parfammdq.com` con SSL válido, `/api/health` responde 200 y el checkout funciona en producción. Probar también un deploy fallido a propósito para confirmar el rollback.

### Fase 8 — Cierre
Carga de los ~40 productos reales, revisión de textos, smoke test de Playwright (home → producto → carrito → checkout) corriendo en CI, y `docs/admin.md`: un instructivo corto y en criollo para tu hermano.

---

## Variables de entorno

```
DATABASE_URL
AUTH_SECRET
NEXT_PUBLIC_SITE_URL
R2_ACCOUNT_ID / R2_ACCESS_KEY_ID / R2_SECRET_ACCESS_KEY / R2_BUCKET / R2_PUBLIC_URL
NEXT_PUBLIC_UMAMI_URL / NEXT_PUBLIC_UMAMI_WEBSITE_ID
ADMIN_SEED_EMAIL / ADMIN_SEED_PASSWORD   (sólo para el seed inicial)
```

Todas validadas al arrancar con `@t3-oss/env-nextjs`, así un deploy con una variable faltante falla rápido y claro en vez de romper en runtime.

---

## Lo que necesito de vos antes de arrancar

1. El **.zip de FragDB** en `data/fragdb/` (después de la Fase 0, cuando exista el repo).
2. Las **imágenes del Canva** (logo, hero, colores) en `brand/`.
3. Credenciales de **Cloudflare R2** (o creamos la cuenta juntos en la Fase 3).
4. El **número de WhatsApp** del emprendimiento y, si querés, uno de prueba para el checkout.
