# Estructura del proyecto

Qué hay en cada carpeta y **por qué**. No es la salida de `tree`: los archivos
se agrupan por responsabilidad, no por orden alfabético.

211 archivos versionados, 169 bajo `src/`.

---

## Raíz

| Archivo                                                                            | Rol                                                                                                                                 |
| ---------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------- |
| `package.json`                                                                     | Scripts y dependencias. `postinstall` corre `prisma generate`                                                                       |
| `next.config.ts`                                                                   | `output: "standalone"`, `images.remotePatterns` derivado de `R2_PUBLIC_URL`, `outputFileTracingIncludes` para las fuentes de las OG |
| `tsconfig.json`                                                                    | `strict`, alias `@/*` → `./src/*`                                                                                                   |
| `prisma.config.ts`                                                                 | Prisma 7: la URL de conexión vive acá (para la CLI), no en el schema                                                                |
| `components.json`                                                                  | Config de shadcn/ui: preset `radix-nova`, `rsc: true`, iconos Lucide                                                                |
| `eslint.config.mjs`, `.prettierrc.json`, `.lintstagedrc.json`, `.husky/pre-commit` | Calidad: `lint-staged` corre eslint --fix + prettier en cada commit                                                                 |
| `docker-compose.dev.yml`                                                           | Postgres 17 local en `127.0.0.1:5433` (evita chocar con el Postgres de Dokploy en la VPS)                                           |
| `Dockerfile`, `docker-entrypoint.sh`, `.dockerignore`                              | Imagen de producción. Ver [`deployment.md`](deployment.md)                                                                          |
| `.github/workflows/deploy.yml`                                                     | Build en CI → GHCR → webhook a Dokploy                                                                                              |
| `AGENTS.md` / `CLAUDE.md`                                                          | Instrucciones para agentes. `CLAUDE.md` sólo hace `@AGENTS.md`                                                                      |
| `.env.example`                                                                     | Plantilla de entorno. **`.env` real está gitignoreado**                                                                             |

> `AGENTS.md` es el punto de entrada para agentes: describe el proyecto, las
> reglas que no se negocian y remite a `docs/`.

---

## `src/app/` — rutas

App Router de Next 16. Dos **route groups** de primer nivel; los paréntesis no
aparecen en la URL.

```
src/app/
├── layout.tsx            Root layout: <html lang="es-AR">, fuente Outfit,
│                         generateMetadata() que lee SiteSetting
├── globals.css           Tokens Tailwind v4 (incluye --whatsapp y --success)
├── icon.tsx              Favicon generado con ImageResponse (la "P")
├── robots.ts             Estático; bloquea /admin/ y /api/
├── sitemap.ts            force-dynamic + unstable_cache(3600)
│
├── (tienda)/             ── SUPERFICIE PÚBLICA ──
│   ├── layout.tsx        ThemeProvider + NuqsAdapter + Header/Footer + Toaster
│   ├── page.tsx                      /
│   ├── opengraph-image.tsx           la OG real; el resto la reexporta
│   ├── catalogo/                     /catalogo
│   ├── producto/[slug]/              /producto/:slug
│   ├── marca/[slug]/                 /marca/:slug
│   ├── carrito/                      /carrito  + actions.ts (pública)
│   ├── checkout/                     /checkout + actions.ts (crearPedido)
│   ├── pedido/[number]/gracias/      /pedido/:number/gracias
│   ├── que-es-un-tester/  como-comprar/  contacto/     páginas de contenido
│
├── admin/                ── SUPERFICIE PRIVADA ──
│   ├── login/            /admin/login  (page + login-form + actions)
│   └── (panel)/          layout.tsx con auth() → el control de acceso real
│       ├── page.tsx                  /admin  (dashboard)
│       ├── actions.ts                cerrarSesion()
│       ├── admin-sidebar.tsx, user-menu.tsx
│       ├── productos/                tabla, [id], nuevo, actions, imagenes-actions
│       ├── pedidos/                  tabla, [id], actions
│       ├── marcas/  notas/  configuracion/
│
└── api/
    ├── health/route.ts               GET  /api/health
    └── auth/[...nextauth]/route.ts   GET|POST /api/auth/*
```

### Convenciones observadas

- **`_components/`** (guión bajo): carpeta privada de Next, no genera ruta.
  Componentes que pertenecen a **una** pantalla.
- **`actions.ts`** junto a la ruta que lo usa: Server Actions co-ubicadas.
  `productos/` tiene dos (`actions.ts` y `imagenes-actions.ts`) porque el flujo
  de imágenes es independiente del de guardado.
- **`opengraph-image.tsx`**: la convención de Next **no se hereda** a rutas
  anidadas, así que cada segmento tiene un archivo de 5 líneas que reexporta el
  de `(tienda)/`. Explicado en `src/app/(tienda)/opengraph-image.tsx:21-23`.

---

## `src/components/` — componentes compartidos

Lo que usan **dos o más** pantallas. Lo de una sola vive en el `_components/`
de su ruta.

```
components/
├── ui/                   25 primitivas de shadcn/ui (button, dialog, sheet,
│                         sidebar, command, carousel, table, sonner, …)
│                         Se generan con el CLI; no editar a mano salvo motivo
│
├── tienda/
│   ├── header.tsx        Nav desktop + mobile; dueño del <Sheet> del carrito
│   ├── footer.tsx        Server Component: lee SiteSetting (WhatsApp, IG)
│   ├── hero.tsx          <h1> = logotipo; tagline desde SiteSetting
│   ├── logotipo.tsx      Tipografía, no SVG
│   ├── badge-carrito.tsx Contador (0 hasta hidratar)
│   ├── carrito-drawer.tsx  Contenido del Sheet
│   ├── tarjeta-producto.tsx / foto-producto.tsx / chip-acorde.tsx
│   ├── theme-provider.tsx  next-themes; sin toggle, sólo preferencia del SO
│   ├── catalogo/         buscador, controles-filtro, drawer-filtros,
│   │                     panel-filtros, grilla, grilla-skeleton, paginado,
│   │                     select-orden, seccion-catalogo
│   ├── carrito/          item-fila, lista-items, resumen-carrito
│   │                     (compartidos entre el drawer y /carrito)
│   └── producto/         galeria, comprar, piramide, ficha-tecnica,
│                         barras-caracter
│
├── admin/page-header.tsx
└── frasco-placeholder.tsx   Silueta usada cuando no hay foto (tienda y panel)
```

**[Observado]** `components/tienda/carrito/` existe para que el drawer y la
página `/carrito` compartan la lógica de items y stepper sin duplicarla
(`src/app/(tienda)/carrito/_components/contenido-carrito.tsx:7-12`).

---

## `src/lib/` — lógica y acceso a datos

```
lib/
├── db.ts              Singleton de PrismaClient con driver adapter pg;
│                      cacheado en globalThis fuera de producción
├── env.ts             Validación de entorno (t3-env + zod). "" ≡ no seteada
├── auth.ts            NextAuth(): provider Credentials + argon2 + prisma
├── auth.config.ts     Config sin DB — lo único que importa proxy.ts
├── r2.ts              Cliente S3 perezoso, presign, urlPublica, esClaveDeProducto
├── rate-limit.ts      Ventana deslizante en LRUCache (en memoria)
│
├── site.ts            Defaults de marca. Importable desde el cliente
├── configuracion.ts   SiteSetting cacheado con tag + connection()
├── catalogo.ts        Etiquetas es-AR de enums, etiquetaVariante, precioArs,
│                      nombrePropio  ← compartido tienda + panel
├── seo.ts             metadataDePagina, jsonLd, productoJsonLd, migasJsonLd
├── whatsapp.ts        linkWhatsappA, linkInstagramA, telefonoVisible
├── color.ts           colorDeChip: corrige el hex del acorde a 4,5:1 WCAG
├── fecha.ts           hace(): tiempo relativo
├── carrito.ts         "use client" — store zustand + persist + useHidratado
├── utils.ts           reexporta cn
│
├── tienda/
│   ├── consultas.ts              Todas las consultas públicas
│   ├── filtros.ts                Parsers nuqs, rangos de precio, orden
│   ├── carrito-servidor.ts       revalidarItemsCarrito()
│   ├── usar-reconciliacion-carrito.ts  "use client" — hook compartido
│   └── mensaje-pedido.ts         Expande la plantilla de WhatsApp
│
├── admin/
│   ├── guard.ts        requireAdmin()
│   ├── productos.ts    listarProductos, productoParaEditar, listarAcordes
│   ├── pedidos.ts      listarPedidos, pedidoPorId, ESTADO_PEDIDO
│   ├── marcas.ts       listarMarcas
│   ├── referencias.ts  buscarReferencias (SQL crudo), referenciaParaAdoptar
│   ├── configuracion.ts obtenerConfiguracionEditable (sin caché)
│   └── slug.ts         aSlug, slugLibre
│
└── validations/
    ├── producto.ts      productoSchema (+ superRefine con las reglas de publicación)
    ├── checkout.ts      checkoutSchema, checkoutClienteSchema, `telefono`
    ├── configuracion.ts configuracionSchema (reusa `telefono` y `textoOpcional`)
    └── marca.ts         marcaSchema (sólo `name`)
```

Regla observada: **`lib/tienda/` nunca importa `lib/admin/` y viceversa.** Lo
común sube a `lib/catalogo.ts`, `lib/whatsapp.ts` o `lib/r2.ts`.

---

## `src/` — el resto

| Ruta                      | Rol                                                                                                                                 |
| ------------------------- | ----------------------------------------------------------------------------------------------------------------------------------- |
| `src/proxy.ts`            | Ex `middleware.ts`. En Next 16 se llama `proxy.ts` y corre en runtime Node. Matcher `/admin/:path*`                                 |
| `src/hooks/use-mobile.ts` | Versión de shadcn reescrita con `useSyncExternalStore` (la original hacía `setState` en `useEffect`, que React 19 marca como error) |
| `src/assets/fonts/`       | `Outfit-ExtraBold.ttf` + `OFL.txt`. Se lee del disco en runtime para el favicon y las OG images                                     |
| `src/generated/prisma/`   | **Gitignoreado.** Cliente generado por `prisma generate`. Los imports son `@/generated/prisma/client` y `@/generated/prisma/enums`  |

---

## `prisma/`

```
prisma/
├── schema.prisma   Modelo completo, comentado por capa
├── seed.ts         Usuario admin (si hay ADMIN_SEED_*) + fila singleton de
│                   SiteSetting. Idempotente (upsert con update: {})
└── migrations/
    ├── 20260916034605_init/                      426 líneas — todo el esquema
    ├── 20260916124255_busqueda_difusa_referencias/  pg_trgm, unaccent,
    │       parfam_normalize(), searchText desnormalizado, índices GIN
    ├── 20260916145045_imagenes_guardan_clave/    ProductImage.url → storageKey
    └── 20260917122409_numero_pedido_secuencia/   CREATE SEQUENCE Order_number_seq
```

Detalle en [`persistence.md`](persistence.md#migraciones).

---

## `scripts/` y `data/`

```
scripts/
├── import-fragrantica.ts    Importador del catálogo de referencia
├── seed-dev.ts              6 productos de ejemplo (uno en DRAFT a propósito),
│                            con un mini-encoder PNG propio para las fotos
└── lib/
    ├── read-fragrantica-csv.ts  Lee y fusiona los dos CSV por PID
    ├── fragrantica-parse.ts     Parsers (URL, pirámide, género, decimales)
    ├── fragrantica-parse.test.ts  Tests de Vitest — `pnpm test`
    └── dictionaries.ts          Carga los JSON de data/dictionaries/

data/
├── fragrantica/   fra_cleaned.csv (24.063 filas, `;`)
│                  fra_perfumes.csv (69.948 filas, `,`)  — 38 MB, versionados
│                  README.md con el formato y las trampas del parseo
└── dictionaries/  accords.es.json (93 acordes con color propio)
                   notes.es.json (~500 notas), note-aliases.json (typos)
                   README.md
```

Ver [`modules/datos-referencia.md`](modules/datos-referencia.md).

---

## Carpetas que **no** existen (y el código menciona)

| Referencia en el código | Estado                                                                                      |
| ----------------------- | ------------------------------------------------------------------------------------------- |
| `PLAN.md`               | Borrado en `2e8ef56`. Ya no queda ninguna referencia en el código                           |
| `design/*.dc.html`      | Borrado en `2e8ef56`. Citado en ~12 comentarios de componentes                              |
| `public/`               | Borrado en `2e8ef56`. **El `Dockerfile` todavía lo copia** → ver [`F-02`](findings.md#f-02) |
| `README.md` (raíz)      | Borrado en `2e8ef56`                                                                        |
| `brand/`                | Borrado en `2e8ef56`                                                                        |
